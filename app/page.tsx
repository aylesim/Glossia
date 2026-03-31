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
const LOCAL_STORAGE_OPENAI_KEY = "glossia.openai-api-key.v1";

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
  const [openAiApiKey, setOpenAiApiKey] = useState("");
  const [showOpenAiApiKey, setShowOpenAiApiKey] = useState(false);
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

  useEffect(() => {
    const raw = localStorage.getItem(LOCAL_STORAGE_OPENAI_KEY);
    if (raw) setOpenAiApiKey(raw);
  }, []);

  useEffect(() => {
    if (openAiApiKey) localStorage.setItem(LOCAL_STORAGE_OPENAI_KEY, openAiApiKey);
    else localStorage.removeItem(LOCAL_STORAGE_OPENAI_KEY);
  }, [openAiApiKey]);

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

    const body: DomainBootstrapRequest = {
      description: domainPrompt,
      openAiApiKey: openAiApiKey.trim() || undefined,
    };
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
      openAiApiKey: openAiApiKey.trim() || undefined,
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
      <header className="border-b border-[var(--border)] bg-[var(--bg)] px-5 py-3 sm:px-10">
        <div className="mx-auto flex max-w-5xl items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-2xl font-normal tracking-tight sm:text-3xl">
              Glossia
              <span className="font-normal text-[var(--fg-muted)]">, demo</span>
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-snug text-[var(--fg-muted)]">
              Natural language → domain JSON → flow → validated patch graph.
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-[var(--fg-muted)]">
              <span className="tracking-[0.2em]">
                By{" "}
                <a
                  href="https://github.com/aylesim"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-[var(--fg)]"
                >
                  Aylesim
                </a>
              </span>
              <a
                href="https://github.com/aylesim/Glossia"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Glossia on GitHub"
                className="inline-flex items-center gap-1.5 uppercase tracking-[0.2em] transition-colors hover:text-[var(--fg)]"
              >
                <svg
                  className="h-3 w-3 shrink-0"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden={true}
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                GitHub
              </a>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20 pt-8 sm:px-10">
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
                <p className="mt-2 text-sm font-medium">API key</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--fg-muted)]">
                  Paste an OpenAI API key in the field below so you can try the app in the browser. Nodes are semantic
                  stubs, not a live runtime.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-10">
        <section className="space-y-4 border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="border-b border-[var(--border)] pb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
              OpenAI API key
            </p>
            <p className="mt-2 text-sm font-medium">You need this to use the app.</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--fg-muted)]">
              All generation calls go to OpenAI. Paste your key here. It is saved only in your browser and never sent
              to any server other than OpenAI. The codebase is open source if you want to verify.{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 transition-colors hover:text-[var(--fg)]"
              >
                Get a key at platform.openai.com →
              </a>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type={showOpenAiApiKey ? "text" : "password"}
              value={openAiApiKey}
              onChange={(e) => setOpenAiApiKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="sk-…"
              className={`${fieldClass} min-w-[12rem] flex-1 font-mono text-xs`}
            />
            <button
              type="button"
              onClick={() => setShowOpenAiApiKey((v) => !v)}
              className={btnSecondary}
            >
              {showOpenAiApiKey ? "Hide" : "Show"}
            </button>
            <button
              type="button"
              onClick={() => setOpenAiApiKey("")}
              disabled={!openAiApiKey}
              className={btnSecondary}
            >
              Clear key
            </button>
          </div>
        </section>

        <section className="space-y-5 border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="border-b border-[var(--border)] pb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
              Step 1 · Domain
            </p>
            <p className="mt-2 text-sm font-medium">Define the vocabulary of your graph.</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--fg-muted)]">
              A domain is a schema that lists every node type available, together with their ports and parameters. Think
              of it as the &ldquo;alphabet&rdquo; the AI will use when building your graph. You have three ways to set
              one up:
            </p>
            <ul className="mt-2 space-y-1 text-sm leading-relaxed text-[var(--fg-muted)]">
              <li>
                <span className="text-[var(--fg)]">Describe it</span>: type a plain-English description below and
                click &ldquo;Generate domain&rdquo;. The AI will invent suitable node types for you.
              </li>
              <li>
                <span className="text-[var(--fg)]">Pick a preset</span>: choose a ready-made domain from the dropdown
                (good for a quick start).
              </li>
              <li>
                <span className="text-[var(--fg)]">Import a file</span>: load a <code>.json</code> file you exported
                from a previous session.
              </li>
            </ul>
            <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
              Once a domain is loaded the JSON editor below shows its contents. You can edit it directly; changes are
              validated automatically.
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--fg-muted)]">
              Describe the kind of system you want to model (e.g. &ldquo;a modular audio synthesiser&rdquo;, &ldquo;an
              image processing pipeline&rdquo;, &ldquo;a text NLP chain&rdquo;).
            </p>
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
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--fg-muted)]">
              Or skip the description and load one of the built-in presets to get started immediately.
            </p>
            <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto">
              <label
                htmlFor="domain-preset"
                className="shrink-0 font-mono text-xs text-[var(--fg-muted)]"
              >
                presets
              </label>
              <select
                id="domain-preset"
                value={selectedPresetId}
                onChange={(event) => {
                  const id = event.target.value;
                  setSelectedPresetId(id);
                  loadPresetDomain(id);
                }}
                className={`${fieldClass} min-w-[8rem] max-w-full flex-1 py-2 font-mono text-xs sm:min-w-[12rem]`}
              >
                {DOMAIN_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={exportDomainToFile}
                disabled={!domain}
                className={`${btnSecondary} shrink-0`}
              >
                Export
              </button>
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className={`${btnSecondary} shrink-0`}
              >
                Import
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--fg-muted)]">
              The raw domain JSON. Edits you make here are validated live; errors appear below. You normally don&apos;t
              need to touch this unless you want fine-grained control over node types.
            </p>
            <textarea
              value={domainRawJson}
              onChange={(event) => setDomainRawJson(event.target.value)}
              rows={10}
              placeholder="Domain JSON editor"
              className={`${fieldClass} resize-y bg-[var(--code)] font-mono text-xs leading-relaxed`}
            />
          </div>
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
          <div className="border-b border-[var(--border)] pb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
              Step 2 · Graph
            </p>
            <p className="mt-2 text-sm font-medium">Describe the flow you want to build.</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--fg-muted)]">
              Now that the AI knows your vocabulary, tell it what you want to wire together. Write a plain-English
              description of the pipeline, for example &ldquo;read a MIDI file, transpose every note up by 5 semitones, then
              write the result to disk&rdquo;.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
              Choose a generation mode before clicking Generate:
            </p>
            <ul className="mt-2 space-y-1 text-sm leading-relaxed text-[var(--fg-muted)]">
              <li>
                <span className="text-[var(--fg)]">Full</span>: produces pseudocode and JSON in one shot. Best for a
                first attempt.
              </li>
              <li>
                <span className="text-[var(--fg)]">Pseudocode</span>: only generates the human-readable plan. Useful
                if you want to review the logic before committing to JSON.
              </li>
              <li>
                <span className="text-[var(--fg)]">JSON from pseudocode</span>: converts pseudocode you have already
                reviewed (and optionally edited) into the final patch JSON.
              </li>
            </ul>
          </div>

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

          <div className="space-y-1">
            {!canCompose && (
              <p className="text-xs text-[var(--fg-muted)]">
                Complete Step 1 first. A domain must be loaded before you can generate a graph.
              </p>
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
          </div>

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
              <div className="border-b border-[var(--border)] pb-4 space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
                  Step 3 · Results
                </p>
                <p className="text-sm font-medium">Review what was generated.</p>
                <p className="text-sm leading-relaxed text-[var(--fg-muted)]">
                  The tabs below show three views of the same result. <span className="text-[var(--fg)]">Pseudocode</span> is
                  the plain-English plan the AI wrote first. You can edit it and click &ldquo;Regenerate JSON&rdquo; to
                  refine the output. <span className="text-[var(--fg)]">JSON</span> is the machine-readable patch you can
                  copy and use elsewhere. <span className="text-[var(--fg)]">Graph</span> renders the nodes and edges
                  visually. Pan and scroll to explore it.
                </p>
              </div>
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
