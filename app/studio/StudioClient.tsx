"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CompileResult, Domain, Patch, RunEvent, RunRecord, StepRecord } from "@/lib/ir/types";
import { DOMAINS, EXECUTABLE_DOMAIN_IDS, RESEARCH_DOMAIN, getDomain } from "@/lib/ir/domains";
import { artifactCheckLine } from "@/lib/ir/artifact";
import { describeDiff } from "@/lib/ir/diff";
import { getNodeType } from "@/lib/ir/query";
import { MODELS, type ModelInfo } from "@/lib/llm/registry";
import ThemeToggle from "@/app/components/theme-toggle";
import Wordmark from "@/app/components/Wordmark";
import { btnSecondary, btnSmall, field, monoLabel } from "@/app/styles";
import ArtifactModal from "./components/ArtifactModal";
import GraphCanvas from "./components/GraphCanvas";
import Inspector from "./components/Inspector";
import SettingsModal from "./components/SettingsModal";
import Timeline from "./components/Timeline";
import type { InspectorTab, StepView, StudioMode, TimelineItem } from "./types";

const RESEARCH_INTENT =
  "How should a team ship an LLM workflow to production without losing control? Build a cited brief covering evaluation, observability, human review and prompt injection.";

const PRESETS = [
  {
    id: "research",
    label: "research brief",
    domainId: "research-brief",
    intent: RESEARCH_INTENT,
  },
  {
    id: "midi",
    label: "midi phrase",
    domainId: "midi-remix",
    intent:
      "Transpose the phrase up a fifth, keep only notes in C3–G5, quantize to 1/16, and pull the dynamics back 25%.",
  },
  {
    id: "story",
    label: "storytelling",
    domainId: "story-scene",
    intent:
      "A lighthouse keeper finds a door in the fog that opens onto a city she has never visited. Write it as a tense third-person scene.",
  },
] as const;

const CATEGORY_ORDER = ["input", "llm", "tool", "transform", "control", "output"] as const;
const CATEGORY_TONE: Record<string, string> = {
  input: "var(--chart-1)",
  llm: "var(--chart-2)",
  tool: "var(--chart-3)",
  transform: "var(--chart-4)",
  control: "var(--chart-6)",
  output: "var(--accent)",
};

function previewFromStep(step: StepRecord): string | undefined {
  if (!step.output) return undefined;
  const first = Object.entries(step.output)[0];
  if (!first) return step.status === "completed" ? "done" : undefined;
  const [, value] = first;
  if (typeof value === "string") return value.slice(0, 180);
  if (Array.isArray(value)) return `${value.length} items`;
  if (value && typeof value === "object") return JSON.stringify(value).slice(0, 180);
  return String(value);
}

function stepsFromRun(run: RunRecord): Record<string, StepView> {
  const result: Record<string, StepView> = {};
  for (const step of run.steps) {
    result[step.nodeId] = {
      status: step.status,
      attempt: step.attempt,
      ms: step.ms,
      usage: step.usage,
      error: step.error,
      cached: step.cached,
      outputPreview: previewFromStep(step),
    };
  }
  return result;
}

function initialSteps(patch: Patch): Record<string, StepView> {
  const result: Record<string, StepView> = {};
  for (const node of patch.nodes) result[node.id] = { status: "queued", attempt: 0 };
  return result;
}

function apiMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const error = (data as { error?: { message?: string; hint?: string } }).error;
    if (error?.message) return error.hint ? `${error.message} ${error.hint}` : error.message;
  }
  return fallback;
}

export default function StudioClient() {
  const [models, setModels] = useState<ModelInfo[]>(MODELS);
  const [domain, setDomain] = useState<Domain>(RESEARCH_DOMAIN);
  const [domainJson, setDomainJson] = useState(JSON.stringify(RESEARCH_DOMAIN, null, 2));
  const [domainError, setDomainError] = useState("");
  const [intent, setIntent] = useState(RESEARCH_INTENT);
  const [mode, setMode] = useState<StudioMode>("demo");
  const [provider, setProvider] = useState<"openai" | "openrouter">("openai");
  const [model, setModel] = useState("gpt-4.1-mini");
  const [apiKey, setApiKey] = useState("");
  const [budget, setBudget] = useState(0.25);
  const [compile, setCompile] = useState<CompileResult | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [compileError, setCompileError] = useState("");
  const [patch, setPatch] = useState<Patch | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [steps, setSteps] = useState<Record<string, StepView>>({});
  const [run, setRun] = useState<RunRecord | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("configure");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [artifactOpen, setArtifactOpen] = useState(false);
  const [leftTab, setLeftTab] = useState<"compile" | "domain" | "nodes">("compile");
  const [notice, setNotice] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const esRef = useRef<EventSource | null>(null);
  const runIdRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const storedMode = sessionStorage.getItem("glossia.mode");
      if (storedMode === "live" || storedMode === "demo") setMode(storedMode);
      const storedProvider = sessionStorage.getItem("glossia.provider");
      if (storedProvider === "openai" || storedProvider === "openrouter") setProvider(storedProvider);
      const storedModel = sessionStorage.getItem("glossia.model");
      if (storedModel) setModel(storedModel);
      const storedKey = sessionStorage.getItem("glossia.api-key");
      if (storedKey) setApiKey(storedKey);
      const storedBudget = Number(sessionStorage.getItem("glossia.budget"));
      if (Number.isFinite(storedBudget) && storedBudget >= 0.05) setBudget(storedBudget);
      const params = new URLSearchParams(window.location.search);
      if (params.get("demo") === "1") setMode("demo");
    } catch {
      // storage can be disabled; the studio still works in memory
    }

    void fetch("/api/models")
      .then((response) => response.json())
      .then((data: { models?: ModelInfo[] }) => {
        if (Array.isArray(data.models) && data.models.length > 0) setModels(data.models);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem("glossia.mode", mode);
      sessionStorage.setItem("glossia.provider", provider);
      sessionStorage.setItem("glossia.model", model);
      sessionStorage.setItem("glossia.budget", String(budget));
      if (apiKey) sessionStorage.setItem("glossia.api-key", apiKey);
      else sessionStorage.removeItem("glossia.api-key");
    } catch {
      // ignore
    }
  }, [mode, provider, model, budget, apiKey]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  const closeStream = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
  }, []);

  const refreshRun = useCallback(async (runId: string) => {
    try {
      const response = await fetch(`/api/runs/${runId}`);
      if (!response.ok) return;
      const data = (await response.json()) as { run?: RunRecord };
      if (data.run) {
        setRun(data.run);
        setSteps(stepsFromRun(data.run));
        if (data.run.artifact) setInspectorTab("artifact");
      }
    } catch {
      // the live event stream already carries the important state
    }
  }, []);

  const applyEvent = useCallback(
    (event: RunEvent) => {
      if (event.type === "step.started") {
        setSteps((prev) => ({
          ...prev,
          [event.nodeId]: {
            ...(prev[event.nodeId] ?? { attempt: 0, status: "queued" as const }),
            status: "running",
            attempt: event.attempt,
            error: undefined,
          },
        }));
      } else if (event.type === "step.completed") {
        setSteps((prev) => ({
          ...prev,
          [event.nodeId]: {
            ...(prev[event.nodeId] ?? { attempt: 1 }),
            status: event.cached ? "cached" : "completed",
            ms: event.ms,
            usage: event.usage,
            outputPreview: event.outputPreview,
            cached: event.cached,
          },
        }));
      } else if (event.type === "step.failed") {
        setSteps((prev) => ({
          ...prev,
          [event.nodeId]: {
            ...(prev[event.nodeId] ?? { attempt: 1 }),
            status: "failed",
            error: event.error,
          },
        }));
      } else if (event.type === "run.completed") {
        setRunning(false);
        setNow(Date.now());
        setRun((prev) =>
          prev
            ? {
                ...prev,
                status: "completed",
                artifact: event.artifact ?? prev.artifact,
                costUsd: event.costUsd,
                usage: event.usage,
                durationMs: event.durationMs,
                endedAt: event.at,
              }
            : prev,
        );
        setInspectorTab(event.artifact ? "artifact" : "trace");
        closeStream();
        void refreshRun(event.runId);
        if (event.artifact) {
          window.setTimeout(() => setArtifactOpen(true), 500);
        }
      } else if (event.type === "run.failed") {
        setRunning(false);
        setRunError(event.error);
        setRun((prev) => (prev ? { ...prev, status: "failed" } : prev));
        closeStream();
        void refreshRun(event.runId);
      } else if (event.type === "run.cancelled") {
        setRunning(false);
        setRun((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
        closeStream();
        void refreshRun(event.runId);
      }
    },
    [closeStream, refreshRun],
  );

  const attachStream = useCallback(
    (runId: string) => {
      closeStream();
      const source = new EventSource(`/api/runs/${runId}/stream`);
      esRef.current = source;
      const types = [
        "run.started",
        "step.started",
        "step.completed",
        "step.failed",
        "run.completed",
        "run.failed",
        "run.cancelled",
      ];
      for (const type of types) {
        source.addEventListener(type, (raw) => {
          try {
            const event = JSON.parse((raw as MessageEvent<string>).data) as RunEvent;
            applyEvent(event);
          } catch {
            // ignore malformed event
          }
        });
      }
      source.onerror = () => {
        if (source.readyState === EventSource.CLOSED) {
          closeStream();
          void refreshRun(runId);
        }
      };
    },
    [applyEvent, closeStream, refreshRun],
  );

  const resetWorkflow = useCallback(() => {
    setCompile(null);
    setCompileError("");
    setPatch(null);
    setSteps({});
    setRun(null);
    setRunError("");
    setSelectedNodeId(null);
    setInspectorTab("configure");
    setStartedAt(null);
  }, []);

  const handleDomainSelect = (id: string) => {
    const next = getDomain(id);
    if (!next) return;
    setDomain(next);
    setDomainJson(JSON.stringify(next, null, 2));
    setDomainError("");
    resetWorkflow();
    setNotice(`Domain: ${next.name}`);
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    const next = getDomain(preset.domainId);
    if (!next) return;
    setDomain(next);
    setDomainJson(JSON.stringify(next, null, 2));
    setDomainError("");
    setIntent(preset.intent);
    resetWorkflow();
    setNotice(`${next.name} · ${preset.label}`);
  };

  const handleApplyDomain = async () => {
    setDomainError("");
    let parsed: unknown;
    try {
      parsed = JSON.parse(domainJson);
    } catch {
      setDomainError("The domain JSON is not valid JSON.");
      return;
    }
    try {
      const response = await fetch("/api/domains/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: parsed }),
      });
      const data = (await response.json()) as { domain?: Domain; error?: { message: string; hint?: string } };
      if (!response.ok || !data.domain) {
        setDomainError(apiMessage(data, "The domain is not valid."));
        return;
      }
      setDomain(data.domain);
      setDomainJson(JSON.stringify(data.domain, null, 2));
      resetWorkflow();
      setNotice(`Applied ${data.domain.name}`);
    } catch (error) {
      setDomainError(error instanceof Error ? error.message : "Could not validate the domain.");
    }
  };

  const handleCompile = async () => {
    if (!intent.trim() || compiling) return;
    setCompiling(true);
    setCompileError("");
    setCompile(null);
    setPatch(null);
    setRun(null);
    setRunError("");
    setSteps({});
    setSelectedNodeId(null);
    setInspectorTab("configure");
    try {
      const response = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domainId: domain.id,
          domainJson: domain,
          intent: intent.trim(),
          mode,
          provider,
          model,
          apiKey: apiKey.trim() || undefined,
        }),
      });
      const data = (await response.json()) as { result?: CompileResult; error?: { message: string; hint?: string } };
      if (!response.ok || !data.result) {
        setCompileError(apiMessage(data, "Compilation failed."));
        return;
      }
      setCompile(data.result);
      if (data.result.ok && data.result.patch) {
        setPatch(data.result.patch);
        setSteps(initialSteps(data.result.patch));
        setNotice(`Compiled in ${(data.result.durationMs / 1000).toFixed(1)}s`);
      } else {
        setCompileError(
          `Compilation failed after ${data.result.attempts.length} attempt(s). Check the issues below.`,
        );
      }
    } catch (error) {
      setCompileError(error instanceof Error ? error.message : "Compilation failed.");
    } finally {
      setCompiling(false);
    }
  };

  const handleRun = async () => {
    if (!patch || running) return;
    setRunning(true);
    setRunError("");
    setRun(null);
    setCompileError("");
    setSteps(initialSteps(patch));
    setStartedAt(Date.now());
    setNow(Date.now());
    setArtifactOpen(false);
    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domainId: domain.id,
          domainJson: domain,
          patch,
          mode,
          provider,
          model,
          apiKey: apiKey.trim() || undefined,
          budget: { maxUsd: budget },
        }),
      });
      const data = (await response.json()) as { runId?: string; run?: RunRecord; error?: { message: string; hint?: string } };
      if (!response.ok || !data.runId) {
        setRunning(false);
        setRunError(apiMessage(data, "The run could not start."));
        return;
      }
      runIdRef.current = data.runId;
      if (data.run) setRun(data.run);
      setNotice("Run started");
      attachStream(data.runId);
      // Route bundles can differ in dev; this also covers a run that finished
      // before the EventSource connected.
      window.setTimeout(() => {
        if (runIdRef.current === data.runId) void refreshRun(data.runId!);
      }, 1400);
    } catch (error) {
      setRunning(false);
      setRunError(error instanceof Error ? error.message : "The run could not start.");
    }
  };

  const handleCancel = async () => {
    const runId = runIdRef.current;
    if (!runId) return;
    try {
      await fetch(`/api/runs/${runId}/cancel`, { method: "POST" });
      setNotice("Cancellation requested");
    } catch {
      setNotice("Could not cancel the run");
    }
  };

  const handleProviderChange = (next: "openai" | "openrouter") => {
    setProvider(next);
    const candidates = models.filter((entry) => entry.provider === next);
    if (!candidates.some((entry) => entry.id === model)) {
      setModel(candidates[0]?.id ?? (next === "openrouter" ? "openai/gpt-4.1-mini" : "gpt-4.1-mini"));
    }
  };

  const handleModeChange = (next: StudioMode) => {
    setMode(next);
    if (next === "live" && !apiKey) setSettingsOpen(true);
  };

  const totalCost = useMemo(() => {
    if (run) return run.costUsd;
    return Object.values(steps).reduce((sum, step) => sum + (step.usage?.costUsd ?? 0), 0);
  }, [run, steps]);

  const elapsedMs = useMemo(() => {
    if (!startedAt) return run?.durationMs ?? 0;
    if (!running) return run?.durationMs ?? 0;
    return Math.max(0, now - startedAt);
  }, [startedAt, now, running, run]);

  const timelineItems: TimelineItem[] = useMemo(() => {
    if (!patch) return [];
    return patch.nodes.map((node) => {
      const type = getNodeType(domain, node.type);
      const step = steps[node.id];
      return {
        nodeId: node.id,
        nodeType: node.type,
        label: type?.name ?? node.type,
        status: step?.status ?? "queued",
        ms: step?.ms ?? 0,
        costUsd: step?.usage?.costUsd ?? 0,
        attempt: step?.attempt ?? 0,
      };
    });
  }, [patch, domain, steps]);

  const diffLines = useMemo(() => describeDiff(compile?.diff), [compile]);
  const errors = compile?.issues.filter((issue) => issue.severity === "error") ?? [];
  const warnings = compile?.issues.filter((issue) => issue.severity === "warning") ?? [];
  const budgetPct = Math.min(100, Math.max(0, (totalCost / Math.max(0.01, budget)) * 100));

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)] lg:h-dvh lg:overflow-hidden">
      <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 sm:px-4">
        <Wordmark />
        <span className="hidden h-4 w-px bg-[var(--border)] md:block" />
        <div className="hidden items-center gap-1.5 md:flex">
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">prototype</span>
          <span className="font-mono text-[9px] text-[var(--border-strong)]">/</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--fg)]">{domain.name}</span>
          <span className="rounded border border-[var(--border)] bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.06em] text-[var(--fg-subtle)]">
            v{domain.version}
          </span>
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
          <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--fg-subtle)]">
            <span className={`h-1.5 w-1.5 rounded-full ${running ? "animate-blink bg-[var(--accent)]" : run ? "bg-[var(--success)]" : "bg-[var(--border-strong)]"}`} />
            <span className="max-w-[260px] truncate">{running ? "run in progress" : run ? `${run.id} · ${run.status}` : "no active run"}</span>
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="flex rounded-md border border-[var(--border)] bg-[var(--surface)] p-0.5" role="group" aria-label="Execution mode">
            {(["demo", "live"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => handleModeChange(value)}
                aria-pressed={mode === value}
                className={`rounded px-2 py-1 font-mono text-[8.5px] uppercase tracking-[0.06em] transition-colors ${
                  mode === value
                    ? "bg-[var(--inverse)] text-[var(--inverse-fg)]"
                    : "text-[var(--fg-subtle)] hover:text-[var(--fg)]"
                }`}
              >
                {value === "demo" ? "recorded" : value}
              </button>
            ))}
          </div>

          <div className="hidden w-[126px] xl:block">
            <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.06em] text-[var(--fg-subtle)]">
              <span>budget</span>
              <span>${totalCost.toFixed(2)} / ${budget.toFixed(2)}</span>
            </div>
            <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-[var(--surface-raised)]">
              <div
                className="h-full rounded-full transition-[width]"
                style={{
                  width: `${budgetPct}%`,
                  background: budgetPct > 85 ? "var(--danger)" : budgetPct > 60 ? "var(--warning)" : "var(--success)",
                }}
              />
            </div>
          </div>

          {run?.artifact ? (
            <button
              type="button"
              onClick={() => setArtifactOpen(true)}
              className="hidden rounded-md border border-[var(--border)] px-2.5 py-1.5 font-mono text-[8.5px] uppercase tracking-[0.06em] text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)] sm:inline-flex"
            >
              artifact
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.14.4.47.7.9.85H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.15Z"
                stroke="currentColor"
                strokeWidth="1.3"
              />
            </svg>
          </button>
          <ThemeToggle />

          {running ? (
            <button
              type="button"
              onClick={() => void handleCancel()}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--danger)] bg-[var(--danger)] px-3 py-1.5 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-blink" />
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleRun()}
              disabled={!patch || compiling}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--inverse)] bg-[var(--inverse)] px-3 py-1.5 text-[11px] font-medium text-[var(--inverse-fg)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
            >
              <span aria-hidden>▶</span> Run
            </button>
          )}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[304px_minmax(0,1fr)_368px]">
        <aside className="flex min-h-0 flex-col border-b border-[var(--border)] bg-[var(--surface)] lg:border-b-0 lg:border-r">
          <div className="flex shrink-0 border-b border-[var(--border)] px-2">
            {(
              [
                ["compile", "Compile"],
                ["domain", "Domain"],
                ["nodes", "Nodes"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setLeftTab(id)}
                className={`relative px-2.5 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors ${
                  leftTab === id ? "text-[var(--fg)]" : "text-[var(--fg-subtle)] hover:text-[var(--fg)]"
                }`}
              >
                {label}
                {leftTab === id ? <span className="absolute inset-x-1 -bottom-px h-px bg-[var(--accent)]" /> : null}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {leftTab === "compile" ? (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="intent" className={monoLabel}>
                      Intent
                    </label>
                    <span className="font-mono text-[8.5px] text-[var(--fg-subtle)]">{intent.length}/2000</span>
                  </div>
                  <textarea
                    id="intent"
                    value={intent}
                    onChange={(event) => setIntent(event.target.value.slice(0, 2000))}
                    rows={6}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                        event.preventDefault();
                        if (event.shiftKey) void handleRun();
                        else void handleCompile();
                      }
                    }}
                    className={`${field} mt-1.5 resize-y text-[12px] leading-6`}
                    placeholder="Describe the workflow you want to compile…"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className={monoLabel}>Presets</span>
                    <span className="font-mono text-[8px] text-[var(--fg-subtle)]">{domain.name}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {PRESETS.map((preset) => {
                      const active = domain.id === preset.domainId;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => applyPreset(preset)}
                          className={`rounded-full border px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-[0.06em] transition-colors ${
                            active
                              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--fg)]"
                              : "border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--fg-subtle)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 font-mono text-[8px] leading-4 text-[var(--fg-subtle)]">
                    Each preset switches the domain and the intent, so the graph is different.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void handleCompile()}
                  disabled={compiling || !intent.trim()}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--inverse)] bg-[var(--inverse)] px-3 py-2 text-[11px] font-medium text-[var(--inverse-fg)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
                >
                  {compiling ? "compiling…" : "Compile graph"}
                  <span className="font-mono text-[8px] opacity-50">⌘↵</span>
                </button>

                {compileError ? (
                  <div role="alert" className="rounded-md border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--danger)]">Compile error</p>
                    <p className="mt-1 font-mono text-[10px] leading-5 text-[var(--danger)]">{compileError}</p>
                  </div>
                ) : null}

                {compiling ? (
                  <div className="space-y-2 rounded-md border border-[var(--border)] p-3">
                    <div className="h-2 w-2/3 rounded-full shimmer" />
                    <div className="h-2 w-full rounded-full shimmer" />
                    <div className="h-2 w-1/2 rounded-full shimmer" />
                  </div>
                ) : null}

                {compile ? (
                  <div className="space-y-2.5 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] ${
                          compile.ok
                            ? "border-[var(--success)]/30 bg-[var(--success-soft)] text-[var(--success)]"
                            : "border-[var(--danger)]/30 bg-[var(--danger-soft)] text-[var(--danger)]"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {compile.ok ? "valid" : "invalid"}
                      </span>
                      <span className="font-mono text-[8.5px] text-[var(--fg-subtle)]">
                        {compile.attempts.length} attempt{compile.attempts.length === 1 ? "" : "s"} ·{" "}
                        {(compile.durationMs / 1000).toFixed(1)}s
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        ["nodes", compile.stats.nodes],
                        ["depth", compile.stats.depth],
                        ["cost", `$${compile.usage.costUsd.toFixed(3)}`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5">
                          <p className="font-mono text-[7.5px] uppercase tracking-[0.08em] text-[var(--fg-subtle)]">{label}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-[var(--fg)]">{value}</p>
                        </div>
                      ))}
                    </div>
                    {diffLines.length > 0 ? (
                      <details className="group rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2">
                        <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--accent)]">
                          repair diff · {diffLines.length}
                        </summary>
                        <pre className="mt-1.5 max-h-32 overflow-auto font-mono text-[8.5px] leading-4 text-[var(--fg-muted)]">
                          {diffLines.join("\n")}
                        </pre>
                      </details>
                    ) : null}
                    {compile.pseudocode ? (
                      <details className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2">
                        <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--fg-subtle)]">
                          pseudocode
                        </summary>
                        <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[8.5px] leading-4 text-[var(--fg-muted)]">
                          {compile.pseudocode}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                ) : null}

                {errors.length + warnings.length > 0 ? (
                  <div className="space-y-1.5">
                    {[...errors, ...warnings].slice(0, 8).map((issue, index) => (
                      <button
                        key={`${issue.code}-${index}`}
                        type="button"
                        onClick={() => {
                          if (issue.nodeId) {
                            setSelectedNodeId(issue.nodeId);
                            setInspectorTab("configure");
                          }
                        }}
                        className={`block w-full rounded-md border px-2.5 py-1.5 text-left ${
                          issue.severity === "error"
                            ? "border-[var(--danger)]/25 bg-[var(--danger-soft)]"
                            : "border-[var(--warning)]/25 bg-[var(--warning-soft)]"
                        }`}
                      >
                        <span
                          className={`font-mono text-[8.5px] uppercase tracking-[0.06em] ${
                            issue.severity === "error" ? "text-[var(--danger)]" : "text-[var(--warning)]"
                          }`}
                        >
                          {issue.code}
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-4 text-[var(--fg-muted)]">
                          {issue.message}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {runError ? (
                  <div role="alert" className="rounded-md border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--danger)]">Run error</p>
                    <p className="mt-1 font-mono text-[10px] leading-5 text-[var(--danger)]">{runError}</p>
                  </div>
                ) : null}

                <p className="font-mono text-[8.5px] leading-4 text-[var(--fg-subtle)]">
                  ⌘↵ compile · ⌘⇧↵ compile + run. In recorded mode the compiler returns a fixture and the
                  same analyzer/repair loop runs on it.
                </p>

                <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
                  <div className="flex h-8 items-center justify-between border-b border-[var(--border)] px-2.5">
                    <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--fg-subtle)]">
                      runtime
                    </span>
                    <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-[var(--fg-muted)]">
                      {mode === "demo" ? "recorded" : mode}
                    </span>
                  </div>
                  <dl className="divide-y divide-[var(--border)] font-mono text-[9px]">
                    {[
                      ["provider", mode === "demo" ? "recorded fixture" : model],
                      ["budget", `$${budget.toFixed(2)}`],
                      ["patch", patch ? `${patch.nodes.length}n / ${patch.edges.length}e` : "none"],
                      [
                        "last run",
                        run ? `${run.status} · ${((run.durationMs ?? 0) / 1000).toFixed(1)}s` : "n/a",
                      ],
                      [
                        "verified",
                        artifactCheckLine(run?.artifact),
                      ],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-3 px-2.5 py-1.5">
                        <dt className="uppercase tracking-[0.06em] text-[var(--fg-subtle)]">{label}</dt>
                        <dd className="truncate text-right text-[var(--fg-muted)]">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            ) : null}

            {leftTab === "domain" ? (
              <div className="space-y-3">
                <div>
                  <label htmlFor="domain-select" className={monoLabel}>
                    Active domain
                  </label>
                  <select
                    id="domain-select"
                    value={domain.id}
                    onChange={(event) => handleDomainSelect(event.target.value)}
                    className={`${field} mt-1.5 text-[12px]`}
                  >
                    {DOMAINS.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name} · v{entry.version}
                      </option>
                    ))}
                    {!DOMAINS.some((entry) => entry.id === domain.id) ? (
                      <option value={domain.id}>{domain.name} · imported</option>
                    ) : null}
                  </select>
                </div>

                <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-2">
                  <div>
                    <p className="text-[11px] text-[var(--fg)]">{domain.name}</p>
                    <p className="mt-0.5 font-mono text-[8.5px] text-[var(--fg-subtle)]">
                      {domain.nodeTypes.length} node types
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] ${
                      EXECUTABLE_DOMAIN_IDS.has(domain.id)
                        ? "border-[var(--success)]/30 bg-[var(--success-soft)] text-[var(--success)]"
                        : "border-[var(--warning)]/30 bg-[var(--warning-soft)] text-[var(--warning)]"
                    }`}
                  >
                    {EXECUTABLE_DOMAIN_IDS.has(domain.id) ? "executable" : "custom"}
                  </span>
                </div>

                <div>
                  <label htmlFor="domain-json" className={monoLabel}>
                    domain.json
                  </label>
                  <textarea
                    id="domain-json"
                    value={domainJson}
                    onChange={(event) => setDomainJson(event.target.value)}
                    rows={14}
                    spellCheck={false}
                    className={`${field} mt-1.5 resize-y font-mono text-[9.5px] leading-5`}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void handleApplyDomain()} className={btnSecondary}>
                    Apply domain
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDomainSelect(RESEARCH_DOMAIN.id)}
                    className={btnSmall}
                  >
                    Reset
                  </button>
                </div>
                {domainError ? (
                  <p role="alert" className="rounded-md border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-2.5 py-2 font-mono text-[9.5px] leading-5 text-[var(--danger)]">
                    {domainError}
                  </p>
                ) : null}
                <p className="font-mono text-[8.5px] leading-4 text-[var(--fg-subtle)]">
                  Domains are type systems. An imported domain is compile-only unless its executor refs exist
                  in the runtime.
                </p>
              </div>
            ) : null}

            {leftTab === "nodes" ? (
              <div className="space-y-4">
                {CATEGORY_ORDER.map((category) => {
                  const nodes = domain.nodeTypes.filter((node) => node.category === category);
                  if (nodes.length === 0) return null;
                  return (
                    <div key={category}>
                      <p className="flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.12em] text-[var(--fg-subtle)]">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: CATEGORY_TONE[category] }} />
                        {category}
                      </p>
                      <ul className="mt-1.5 space-y-1">
                        {nodes.map((node) => (
                          <li key={node.id}>
                            <button
                              type="button"
                              onClick={() => {
                                const instance = patch?.nodes.find((candidate) => candidate.type === node.id);
                                if (instance) {
                                  setSelectedNodeId(instance.id);
                                  setInspectorTab("configure");
                                }
                              }}
                              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-2 text-left transition-colors hover:border-[var(--border-strong)]"
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span className="truncate text-[11px] text-[var(--fg)]">{node.name}</span>
                                <span className="shrink-0 font-mono text-[8px] text-[var(--fg-subtle)]">
                                  {node.inputs.length}→{node.outputs.length}
                                </span>
                              </span>
                              <span className="mt-0.5 block truncate font-mono text-[8px] text-[var(--fg-subtle)]">
                                {node.id}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-col">
          <div className="relative h-[58vh] min-h-[420px] lg:h-auto lg:min-h-0 lg:flex-1">
            <GraphCanvas
              patch={patch}
              domain={domain}
              steps={steps}
              selectedNodeId={selectedNodeId}
              onSelectNode={(nodeId) => {
                setSelectedNodeId(nodeId);
                if (nodeId) setInspectorTab("configure");
              }}
            />
            {running ? (
              <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-md border border-[var(--accent)]/40 bg-[var(--surface)] px-2.5 py-1.5 shadow-[var(--shadow-card)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-blink" />
                <span className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-[var(--fg-muted)]">
                  running · {(elapsedMs / 1000).toFixed(1)}s · ${totalCost.toFixed(3)}
                </span>
              </div>
            ) : null}
          </div>
          <Timeline
            items={timelineItems}
            running={running}
            totalCost={totalCost}
            durationMs={elapsedMs}
            onSelect={(nodeId) => {
              setSelectedNodeId(nodeId);
              setInspectorTab("run");
            }}
          />
        </main>

        <div className="hidden min-h-0 lg:block">
          <Inspector
            domain={domain}
            patch={patch}
            selectedNodeId={selectedNodeId}
            steps={steps}
            run={run}
            tab={inspectorTab}
            onTabChange={setInspectorTab}
          />
        </div>
      </div>

      <div className="min-h-[560px] border-t border-[var(--border)] lg:hidden">
        <Inspector
          domain={domain}
          patch={patch}
          selectedNodeId={selectedNodeId}
          steps={steps}
          run={run}
          tab={inspectorTab}
          onTabChange={setInspectorTab}
        />
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        mode={mode}
        onModeChange={handleModeChange}
        provider={provider}
        onProviderChange={handleProviderChange}
        model={model}
        onModelChange={setModel}
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        budget={budget}
        onBudgetChange={setBudget}
        models={models}
      />

      <ArtifactModal artifact={run?.artifact ?? null} open={artifactOpen} onClose={() => setArtifactOpen(false)} />

      {notice ? (
        <div className="fixed bottom-4 right-4 z-40 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.06em] text-[var(--fg-muted)] shadow-[var(--shadow-card)]">
          {notice}
        </div>
      ) : null}

      <div className="sr-only" aria-live="polite">
        {run?.status === "completed" ? "Run completed." : null}
        {runError ? `Run error: ${runError}` : null}
      </div>

      <noscript>
        <div className="p-6 text-sm">Glossia needs JavaScript for the studio. The API is still available.</div>
      </noscript>
    </div>
  );
}
