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

const PatchGraph = dynamic(() => import("./components/PatchGraph"), { ssr: false });
const LOCAL_STORAGE_DOMAIN_KEY = "ribosoma.current-domain.v1";

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

  useEffect(() => {
    const raw = localStorage.getItem(LOCAL_STORAGE_DOMAIN_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as unknown;
      const validation = validateDomain(parsed);
      if (validation.ok) {
        setDomain(validation.domain);
        setDomainRawJson(JSON.stringify(validation.domain, null, 2));
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

  function loadDomainFromEditor() {
    if (!domainRawJson.trim()) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(domainRawJson);
    } catch {
      setDomainValidationErrors(["Domain JSON is not valid"]);
      return;
    }
    const validation = validateDomain(parsed);
    if (!validation.ok) {
      setDomainValidationErrors(validation.errors);
      return;
    }
    setDomainState(validation.domain, domainRawJson);
  }

  function clearDomain() {
    setDomain(null);
    setDomainRawJson("");
    setDomainPrompt("");
    setDomainValidationErrors([]);
    setDomainError("");
    localStorage.removeItem(LOCAL_STORAGE_DOMAIN_KEY);
    resetOutput();
  }

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
        <h1 className="text-lg font-bold tracking-tight">
          Ribosoma <span className="text-slate-500 font-normal">/ graph composer PoC</span>
        </h1>
        <span className="ml-auto text-xs text-slate-600">domain bootstrap to graph composition</span>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center gap-3 justify-between">
            <p className="text-xs text-slate-400 uppercase tracking-widest">Step 1 · Domain Bootstrap</p>
            {domain && (
              <span className="text-xs text-green-400 bg-green-950 border border-green-700 px-2 py-0.5 rounded-full">
                Active domain: {domain.name}
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
              className="w-full rounded-lg bg-slate-900 border border-slate-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none px-4 py-3 text-sm resize-none placeholder:text-slate-600 transition-colors"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) bootstrapDomain();
              }}
            />
            <div className="flex md:flex-col gap-2">
              <button
                onClick={() => bootstrapDomain()}
                disabled={domainLoading || !domainPrompt.trim()}
                className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                {domainLoading ? "Generating domain..." : "Generate domain"}
              </button>
              <button
                onClick={clearDomain}
                className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto] items-center">
            <select
              value={selectedPresetId}
              onChange={(event) => setSelectedPresetId(event.target.value)}
              className="rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-200"
            >
              {DOMAIN_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => loadPresetDomain(selectedPresetId)}
              className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs transition-colors"
            >
              Load preset
            </button>
            <button
              onClick={loadDomainFromEditor}
              disabled={!domainRawJson.trim()}
              className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs transition-colors disabled:opacity-40"
            >
              Validate and use JSON
            </button>
            <button
              onClick={exportDomainToFile}
              disabled={!domain}
              className="px-3 py-2 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs transition-colors disabled:opacity-40"
            >
              Export JSON
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              className="px-3 py-2 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs transition-colors"
            >
              Import JSON
            </button>
          </div>
          <textarea
            value={domainRawJson}
            onChange={(event) => setDomainRawJson(event.target.value)}
            rows={10}
            placeholder="Domain JSON editor"
            className="w-full rounded-lg bg-slate-950 border border-slate-800 px-4 py-3 text-xs text-green-300 font-mono whitespace-pre resize-y"
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
            <div className="rounded-md bg-red-950 border border-red-700 px-4 py-3 text-sm text-red-300">
              <span className="font-semibold">Domain error: </span>{domainError}
            </div>
          )}
          {domainValidationErrors.length > 0 && (
            <div className="rounded-md bg-red-950 border border-red-800 px-4 py-3 space-y-1">
              {domainValidationErrors.map((error, i) => (
                <p key={i} className="text-sm text-red-300 font-mono">{error}</p>
              ))}
            </div>
          )}
        </section>

        <NodeCatalog domain={domain} />

        <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-xs text-slate-400 uppercase tracking-widest">Step 2 · Graph Composition</p>

          {showMidiExamples && (
            <div className="flex rounded-md border border-slate-700 overflow-hidden text-xs">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => loadExample(i)}
                  className="px-3 py-1.5 bg-slate-900 text-slate-400 hover:bg-slate-800 transition-colors border-r border-slate-700 last:border-r-0"
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
                ? "Describe the flow to build in the current domain..."
                : "Define a domain first in Step 1"
            }
            className="w-full rounded-lg bg-slate-900 border border-slate-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none px-4 py-3 text-sm resize-none placeholder:text-slate-600 transition-colors disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
            }}
          />

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-md border border-slate-700 overflow-hidden text-xs">
              {(["full", "pseudocode", "json"] as GenerateMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 transition-colors ${
                    mode === m
                      ? "bg-green-600 text-white"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {m === "full" ? "Full pipeline" : m === "pseudocode" ? "Pseudocode only" : "JSON from pseudocode"}
                </button>
              ))}
            </div>
            <button
              onClick={() => generate()}
              disabled={!canCompose || loading || !prompt.trim()}
              className="px-4 py-1.5 rounded-md bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {loading ? "Generating..." : "Generate ⌘↵"}
            </button>
          </div>
        </section>

        {serverError && (
          <div className="rounded-md bg-red-950 border border-red-700 px-4 py-3 text-sm text-red-300">
            <span className="font-semibold">Error: </span>{serverError}
          </div>
        )}

        {hasOutput && (
          <section className="space-y-3">
            <div className="flex border-b border-slate-800 gap-1">
              {(["pseudocode", "json", "graph"] as Tab[]).map((t) => {
                const available =
                  t === "pseudocode" ? !!pseudocode :
                  t === "json" ? !!rawJson :
                  !!patch;
                return (
                  <button
                    key={t}
                    disabled={!available}
                    onClick={() => setActiveTab(t)}
                    className={`px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                      activeTab === t
                        ? "border-green-500 text-green-400"
                        : "border-transparent text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    }`}
                  >
                    {t === "pseudocode" ? "Pseudocode" : t === "json" ? "JSON" : "Graph"}
                  </button>
                );
              })}

              {validationErrors.length > 0 && (
                <span className="ml-auto self-center text-xs text-red-400 bg-red-950 border border-red-700 px-2 py-0.5 rounded-full">
                  {validationErrors.length} validation error{validationErrors.length > 1 ? "s" : ""}
                </span>
              )}
              {patch && validationErrors.length === 0 && (
                <span className="ml-auto self-center text-xs text-green-400 bg-green-950 border border-green-700 px-2 py-0.5 rounded-full">
                  Valid JSON ✓
                </span>
              )}
            </div>

            {validationErrors.length > 0 && (
              <div className="rounded-md bg-red-950 border border-red-800 px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">Validation errors</p>
                {validationErrors.map((e, i) => (
                  <p key={i} className="text-sm text-red-300 font-mono">{e}</p>
                ))}
              </div>
            )}

            {activeTab === "pseudocode" && pseudocode && (
              <pre className="bg-slate-900 border border-slate-800 rounded-lg px-5 py-4 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed overflow-auto max-h-80">
                {pseudocode}
              </pre>
            )}

            {activeTab === "json" && rawJson && (
              <div className="relative">
                <pre className="bg-slate-900 border border-slate-800 rounded-lg px-5 py-4 text-sm text-green-300 font-mono whitespace-pre overflow-auto max-h-96">
                  {rawJson}
                </pre>
                <button
                  onClick={() => navigator.clipboard.writeText(rawJson)}
                  className="absolute top-3 right-3 text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
                >
                  copy
                </button>
              </div>
            )}

            {activeTab === "graph" && patch && domain && (
              <div className="rounded-xl overflow-hidden border border-slate-800">
                <PatchGraph patch={patch} domain={domain} />
                <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>{patch.nodes.length} nodes</span>
                  <span>{patch.edges.length} edges</span>
                  <span>version {patch.version}</span>
                </div>
              </div>
            )}

            {pseudocode && (
              <div className="flex items-center gap-3 pt-1">
                <p className="text-xs text-slate-600">Did you edit the pseudocode?</p>
                <button
                  onClick={() => generate("json")}
                  disabled={loading}
                  className="text-xs px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors disabled:opacity-40"
                >
                  Regenerate JSON from pseudocode
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
