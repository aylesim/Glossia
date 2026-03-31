"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Patch } from "@/lib/schema";
import { EXAMPLES } from "@/lib/examples";
import { Domain, validateDomain } from "@/lib/domain";
import { DOMAIN_PRESETS, getDomainPresetById } from "@/lib/domain-presets";
import type {
  GenerateRequest,
  GenerateResponse,
  GenerateMode,
  DomainBootstrapRequest,
  DomainBootstrapResponse,
} from "@/lib/api-types";
import NodeCatalog from "./components/NodeCatalog";
import ThemeToggle from "./components/theme-toggle";

const PatchGraph = dynamic(() => import("./components/PatchGraph"), { ssr: false });
const LOCAL_STORAGE_DOMAIN_KEY = "glossia.current-domain.v1";

type Tab = "pseudocode" | "json" | "graph";

export default function HomePage() {
  const [selectedPresetId, setSelectedPresetId] = useState(DOMAIN_PRESETS[0]?.id ?? "");
  const [domainPrompt, setDomainPrompt] = useState("");
  const [domainRawJson, setDomainRawJson] = useState("");
  const [domain, setDomain] = useState<Domain | null>(null);
  const [domainValidationErrors, setDomainValidationErrors] = useState<string[]>([]);
  const [domainError, setDomainError] = useState("");
  const [domainLoading, setDomainLoading] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<GenerateMode>("full");
  const [loading, setLoading] = useState(false);

  const [pseudocode, setPseudocode] = useState("");
  const [rawJson, setRawJson] = useState("");
  const [patch, setPatch] = useState<Patch | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState("");

  const [activeTab, setActiveTab] = useState<Tab>("pseudocode");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const domainTextareaRef = useRef<HTMLTextAreaElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const lastCommittedDomainJson = useRef<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(LOCAL_STORAGE_DOMAIN_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as unknown;
      const validation = validateDomain(parsed);
      if (validation.ok) {
        setDomain(validation.domain);
        setDomainRawJson(JSON.stringify(validation.domain, null, 2));
        lastCommittedDomainJson.current = JSON.stringify(validation.domain);
      }
    } catch {}
  }, []);

  function resetOutput() {
    setPseudocode("");
    setRawJson("");
    setPatch(null);
    setValidationErrors([]);
    setServerError("");
  }

  function persistDomain(nextDomain: Domain) {
    localStorage.setItem(LOCAL_STORAGE_DOMAIN_KEY, JSON.stringify(nextDomain));
  }

  function setDomainState(nextDomain: Domain, raw?: string) {
    setDomain(nextDomain);
    setDomainValidationErrors([]);
    setDomainError("");
    setDomainRawJson(raw ?? JSON.stringify(nextDomain, null, 2));
    persistDomain(nextDomain);
    resetOutput();
    lastCommittedDomainJson.current = JSON.stringify(nextDomain);
  }

  async function bootstrapDomain() {
    if (!domainPrompt.trim()) return;
    setDomainLoading(true);
    setDomainError("");
    setDomainValidationErrors([]);

    const body: DomainBootstrapRequest = { description: domainPrompt };
    try {
      const res = await fetch("/api/domain/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: DomainBootstrapResponse = await res.json();
      if (data.error) {
        setDomainError(data.error);
      }
      if (data.rawJson) {
        setDomainRawJson(data.rawJson);
      }
      if (data.validation && !data.validation.ok) {
        setDomainValidationErrors(data.validation.errors);
      }
      if (data.domain) {
        setDomainState(data.domain, data.rawJson);
      }
    } catch (error) {
      setDomainError((error as Error).message);
    } finally {
      setDomainLoading(false);
    }
  }

  function loadPresetDomain(presetId: string) {
    const preset = getDomainPresetById(presetId);
    if (!preset) return;
    setDomainPrompt(`Preset domain: ${preset.name}`);
    setDomainState(preset);
  }

  function clearDomain() {
    setDomain(null);
    setDomainRawJson("");
    setDomainPrompt("");
    setDomainValidationErrors([]);
    setDomainError("");
    localStorage.removeItem(LOCAL_STORAGE_DOMAIN_KEY);
    resetOutput();
    lastCommittedDomainJson.current = null;
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      const raw = domainRawJson.trim();
      if (!raw) {
        setDomainValidationErrors(domain ? ["Domain JSON cannot be empty"] : []);
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        setDomainValidationErrors(["Domain JSON is not valid"]);
        return;
      }
      const validation = validateDomain(parsed);
      if (!validation.ok) {
        setDomainValidationErrors(validation.errors);
        return;
      }
      const next = validation.domain;
      const snapshot = JSON.stringify(next);
      if (snapshot === lastCommittedDomainJson.current) {
        setDomainValidationErrors([]);
        return;
      }
      lastCommittedDomainJson.current = snapshot;
      setDomain(next);
      setDomainValidationErrors([]);
      setDomainError("");
      persistDomain(next);
      resetOutput();
    }, 400);
    return () => window.clearTimeout(id);
  }, [domainRawJson, domain]);

  async function importDomainFromFile(file: File) {
    const fileContent = await file.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(fileContent);
    } catch {
      setDomainValidationErrors(["The selected file does not contain valid JSON"]);
      return;
    }
    const validation = validateDomain(parsed);
    if (!validation.ok) {
      setDomainValidationErrors(validation.errors);
      return;
    }
    setDomainState(validation.domain, JSON.stringify(validation.domain, null, 2));
  }

  function exportDomainToFile() {
    if (!domain) return;
    const blob = new Blob([JSON.stringify(domain, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${domain.id}.domain.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function generate(overrideMode?: GenerateMode) {
    if (!domain || !prompt.trim()) return;
    setLoading(true);
    resetOutput();

    const body: GenerateRequest = {
      prompt,
      mode: overrideMode ?? mode,
      pseudocode: overrideMode === "json" ? pseudocode : undefined,
      domain,
    };

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: GenerateResponse = await res.json();

      if (data.error) {
        setServerError(data.error);
      }
      if (data.pseudocode) {
        setPseudocode(data.pseudocode);
        setActiveTab("pseudocode");
      }
      if (data.rawJson) {
        setRawJson(data.rawJson);
        setActiveTab("json");
      }
      if (data.validation && !data.validation.ok) {
        setValidationErrors(data.validation.errors);
      }
      if (data.patch) {
        setPatch(data.patch as Patch);
        setActiveTab("graph");
      }
    } catch (e) {
      setServerError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function loadExample(i: number) {
    if (!domain || domain.id !== "midi-poc") return;
    const ex = EXAMPLES[i];
    setPrompt(ex.prompt);
    setPseudocode(ex.pseudocode);
    setRawJson(JSON.stringify(ex.patch, null, 2));
    setPatch(ex.patch);
    setValidationErrors([]);
    setServerError("");
    setActiveTab("graph");
  }

  const hasOutput = pseudocode || rawJson || patch || serverError;
  const canCompose = !!domain;
  const showMidiExamples = domain?.id === "midi-poc";

  const fieldClass =
    "w-full rounded-none border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-3 text-sm text-[var(--fg)] outline-none transition-colors placeholder:text-[var(--fg-subtle)] focus:border-[var(--border-strong)]";
  const btnPrimary =
    "rounded-none border border-[var(--border-strong)] bg-[var(--inverse-bg)] px-4 py-2.5 text-sm font-medium text-[var(--inverse-fg)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35";
  const btnSecondary =
    "rounded-none border border-[var(--border)] bg-transparent px-3 py-2 text-xs text-[var(--fg-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--fg)] disabled:opacity-35";

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg)] px-5 py-5 sm:px-10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--fg-subtle)]">
              Proof of concept
            </p>
            <h1 className="mt-1 font-serif text-3xl font-normal tracking-tight sm:text-4xl">Glossia</h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--fg-muted)]">
              Natural language → domain JSON → flow → validated patch graph.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20 pt-12 sm:px-10">
        <section className="mb-16 border-b border-[var(--border)] pb-16">
          <div className="space-y-12">
            <div className="space-y-6">
              <h2 className="max-w-xl text-2xl font-light leading-snug tracking-tight sm:text-3xl">
                Turn descriptions into structured graphs you can inspect and validate.
              </h2>
              <p className="max-w-prose text-sm leading-[1.75] text-[var(--fg-muted)]">
                You define a domain (the vocabulary of node types, ports, and parameters), then describe a flow in plain
                language. An LLM proposes pseudocode and patch JSON; the client validates with Zod and draws the graph.
                Domain and patch stay separate sources of truth, which helps when you experiment across MIDI, image
                pipelines, NLP chains, or modular synths.
              </p>
            </div>
            <div className="space-y-8">
              <div className="border-l-2 border-[var(--border-strong)] pl-5">
                <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--fg-subtle)]">01</p>
                <p className="mt-2 text-sm font-medium">Bootstrap the domain</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--fg-muted)]">
                  Describe the problem space or load a preset or JSON file. Domain JSON fixes what nodes mean for the
                  session.
                </p>
              </div>
              <div className="border-l-2 border-[var(--border-strong)] pl-5">
                <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--fg-subtle)]">02</p>
                <p className="mt-2 text-sm font-medium">Compose the graph</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--fg-muted)]">
                  Prompt for a pipeline. Full generation, pseudocode only, or JSON from edited pseudocode.
                </p>
              </div>
              <div className="border-l-2 border-[var(--border-strong)] pl-5">
                <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--fg-subtle)]">03</p>
                <p className="mt-2 text-sm font-medium">Review outputs</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--fg-muted)]">
                  Pseudocode, copyable JSON, and a pannable graph. Tabs switch the main view; validation appears above the
                  content.
                </p>
              </div>
              <div className="border-l-2 border-[var(--border-strong)] pl-5">
                <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--fg-subtle)]">04</p>
                <p className="mt-2 text-sm font-medium">Setup</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--fg-muted)]">
                  Set <code className="font-mono text-[12px] text-[var(--fg)]">OPENAI_API_KEY</code> in{" "}
                  <code className="font-mono text-[12px] text-[var(--fg)]">.env.local</code>. Nodes are semantic stubs,
                  not a live runtime.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-10">
        <section className="space-y-5 border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--border)] pb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
              Step 1 · Domain
            </p>
            {domain && (
              <span className="border border-[var(--border-strong)] bg-[var(--bg)] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">
                {domain.name}
              </span>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <textarea
              ref={domainTextareaRef}
              value={domainPrompt}
              onChange={(event) => setDomainPrompt(event.target.value)}
              rows={3}
              placeholder="Describe the domain to generate (e.g. image processing pipeline, modular synth, text NLP chain)..."
              className={`${fieldClass} resize-none`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) bootstrapDomain();
              }}
            />
            <div className="flex md:flex-col gap-2">
              <button
                onClick={() => bootstrapDomain()}
                disabled={domainLoading || !domainPrompt.trim()}
                className={btnPrimary}
              >
                {domainLoading ? "Generating…" : "Generate domain"}
              </button>
              <button type="button" onClick={clearDomain} className={btnSecondary}>
                Clear
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedPresetId}
              onChange={(event) => {
                const id = event.target.value;
                setSelectedPresetId(id);
                loadPresetDomain(id);
              }}
              className={`${fieldClass} max-w-full py-2 font-mono text-xs md:min-w-[12rem]`}
            >
              {DOMAIN_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            <button type="button" onClick={exportDomainToFile} disabled={!domain} className={btnSecondary}>
              Export
            </button>
            <button type="button" onClick={() => importInputRef.current?.click()} className={btnSecondary}>
              Import
            </button>
          </div>
          <textarea
            value={domainRawJson}
            onChange={(event) => setDomainRawJson(event.target.value)}
            rows={10}
            placeholder="Domain JSON editor"
            className={`${fieldClass} resize-y bg-[var(--code)] font-mono text-xs leading-relaxed`}
          />
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              await importDomainFromFile(file);
              event.target.value = "";
            }}
          />
          {domainError && (
            <div className="border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-fg)]">
              <span className="font-medium">Domain error · </span>
              {domainError}
            </div>
          )}
          {domainValidationErrors.length > 0 && (
            <div className="space-y-1 border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3">
              {domainValidationErrors.map((error, i) => (
                <p key={i} className="font-mono text-sm text-[var(--error-fg)]">
                  {error}
                </p>
              ))}
            </div>
          )}
        </section>

        <NodeCatalog domain={domain} />

        <section className="space-y-5 border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <p className="border-b border-[var(--border)] pb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
            Step 2 · Graph
          </p>

          {showMidiExamples && (
            <div className="flex flex-wrap border border-[var(--border)] text-xs">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => loadExample(i)}
                  className="border-r border-[var(--border)] px-3 py-2 text-[var(--fg-muted)] transition-colors last:border-r-0 hover:bg-[var(--surface-raised)] hover:text-[var(--fg)]"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            disabled={!canCompose}
            placeholder={
              canCompose
                ? "Describe the flow to build in the current domain…"
                : "Define a domain first in Step 1"
            }
            className={`${fieldClass} resize-none disabled:opacity-45`}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
            }}
          />

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap border border-[var(--border)] text-xs">
              {(["full", "pseudocode", "json"] as GenerateMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`border-r border-[var(--border)] px-3 py-2 transition-colors last:border-r-0 ${
                    mode === m
                      ? "bg-[var(--inverse-bg)] text-[var(--inverse-fg)]"
                      : "text-[var(--fg-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--fg)]"
                  }`}
                >
                  {m === "full" ? "Full" : m === "pseudocode" ? "Pseudocode" : "JSON from pseudocode"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => generate()}
              disabled={!canCompose || loading || !prompt.trim()}
              className={btnPrimary}
            >
              {loading ? "Generating…" : "Generate ⌘↵"}
            </button>
          </div>
        </section>

        {serverError && (
          <div className="border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error-fg)]">
            <span className="font-medium">Error · </span>
            {serverError}
          </div>
        )}

        {hasOutput && (
          <section className="border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-[var(--border)]">
                {(["pseudocode", "json", "graph"] as Tab[]).map((t) => {
                  const available =
                    t === "pseudocode" ? !!pseudocode :
                    t === "json" ? !!rawJson :
                    !!patch;
                  return (
                    <button
                      key={t}
                      type="button"
                      disabled={!available}
                      onClick={() => setActiveTab(t)}
                      className={`px-3 py-2 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                        activeTab === t
                          ? "border-b-2 border-[var(--border-strong)] text-[var(--fg)]"
                          : "border-b-2 border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]"
                      }`}
                    >
                      {t === "pseudocode" ? "Pseudocode" : t === "json" ? "JSON" : "Graph"}
                    </button>
                  );
                })}
                {validationErrors.length > 0 && (
                  <span className="ml-auto border border-[var(--error-border)] px-2 py-1 font-mono text-[10px] text-[var(--error-fg)]">
                    {validationErrors.length} error{validationErrors.length > 1 ? "s" : ""}
                  </span>
                )}
                {patch && validationErrors.length === 0 && (
                  <span className="ml-auto border border-[var(--border-strong)] px-2 py-1 font-mono text-[10px] text-[var(--fg-muted)]">
                    Valid
                  </span>
                )}
              </div>

              {validationErrors.length > 0 && (
                <div className="space-y-1 border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--error-fg)]">
                    Validation
                  </p>
                  {validationErrors.map((e, i) => (
                    <p key={i} className="font-mono text-sm text-[var(--error-fg)]">
                      {e}
                    </p>
                  ))}
                </div>
              )}

              {activeTab === "graph" && patch && domain ? (
                <div className="min-w-0">
                  <div className="overflow-hidden border border-[var(--border)]">
                    <PatchGraph patch={patch} domain={domain} />
                  </div>
                  <div className="flex flex-wrap gap-4 border border-t-0 border-[var(--border)] px-4 py-2 font-mono text-[10px] text-[var(--fg-subtle)]">
                    <span>{patch.nodes.length} nodes</span>
                    <span>{patch.edges.length} edges</span>
                    <span>v{patch.version}</span>
                  </div>
                </div>
              ) : (
                <div className="min-w-0 space-y-10">
                  <div className="min-w-0 space-y-4">
                    {activeTab === "pseudocode" && pseudocode && (
                      <pre className="max-h-80 overflow-auto border border-[var(--border)] bg-[var(--code)] p-4 text-sm leading-relaxed text-[var(--fg-muted)] whitespace-pre-wrap">
                        {pseudocode}
                      </pre>
                    )}

                    {activeTab === "json" && rawJson && (
                      <div className="relative">
                        <pre className="max-h-96 overflow-auto border border-[var(--border)] bg-[var(--code)] p-4 font-mono text-sm text-[var(--fg)] whitespace-pre">
                          {rawJson}
                        </pre>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(rawJson)}
                          className="absolute right-2 top-2 border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                        >
                          Copy
                        </button>
                      </div>
                    )}
                  </div>

                  {patch && domain ? (
                    <div className="min-w-0">
                      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
                        Graph
                      </p>
                      <div className="overflow-hidden border border-[var(--border)]">
                        <PatchGraph patch={patch} domain={domain} />
                      </div>
                      <div className="flex flex-wrap gap-4 border border-t-0 border-[var(--border)] px-4 py-2 font-mono text-[10px] text-[var(--fg-subtle)]">
                        <span>{patch.nodes.length} nodes</span>
                        <span>{patch.edges.length} edges</span>
                        <span>v{patch.version}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[min(420px,50vh)] items-center justify-center border border-dashed border-[var(--border)] px-6 text-center text-sm text-[var(--fg-subtle)]">
                      Graph appears when generation returns a valid patch.
                    </div>
                  )}
                </div>
              )}
            </div>

            {pseudocode && (
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-6">
                <p className="text-sm text-[var(--fg-muted)]">Edited pseudocode?</p>
                <button
                  type="button"
                  onClick={() => generate("json")}
                  disabled={loading}
                  className={btnSecondary}
                >
                  Regenerate JSON
                </button>
              </div>
            )}
          </section>
        )}

        </div>

      </main>
    </div>
  );
}
