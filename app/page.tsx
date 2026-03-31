"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { Patch } from "@/lib/schema";
import { EXAMPLES } from "@/lib/examples";
import { GenerateRequest, GenerateResponse, GenerateMode } from "@/app/api/generate/route";
import NodeCatalog from "./components/NodeCatalog";

const PatchGraph = dynamic(() => import("./components/PatchGraph"), { ssr: false });

type Tab = "pseudocode" | "json" | "graph";

export default function HomePage() {
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

  function resetOutput() {
    setPseudocode("");
    setRawJson("");
    setPatch(null);
    setValidationErrors([]);
    setServerError("");
  }

  async function generate(overrideMode?: GenerateMode) {
    if (!prompt.trim()) return;
    setLoading(true);
    resetOutput();

    const body: GenerateRequest = {
      prompt,
      mode: overrideMode ?? mode,
      pseudocode: overrideMode === "json" ? pseudocode : undefined,
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
        <h1 className="text-lg font-bold tracking-tight">
          Ribosoma <span className="text-slate-500 font-normal">/ graph composer PoC</span>
        </h1>
        <span className="ml-auto text-xs text-slate-600">prompt → pseudocodice → JSON → SoT</span>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Catalogo nodi */}
        <NodeCatalog />

        {/* Esempi precaricabili */}
        <section>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Esempi</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                onClick={() => loadExample(i)}
                className="text-xs px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 transition-colors"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </section>

        {/* Input prompt */}
        <section className="space-y-3">
          <p className="text-xs text-slate-500 uppercase tracking-widest">Prompt</p>
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Descrivi il flusso MIDI che vuoi costruire…"
            className="w-full rounded-lg bg-slate-900 border border-slate-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none px-4 py-3 text-sm resize-none placeholder:text-slate-600 transition-colors"
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
                  {m === "full" ? "Pipeline completa" : m === "pseudocode" ? "Solo pseudocodice" : "JSON da pseudocodice"}
                </button>
              ))}
            </div>

            <button
              onClick={() => generate()}
              disabled={loading || !prompt.trim()}
              className="px-4 py-1.5 rounded-md bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {loading ? "Generazione…" : "Genera ⌘↵"}
            </button>
          </div>
        </section>

        {/* Errore server */}
        {serverError && (
          <div className="rounded-md bg-red-950 border border-red-700 px-4 py-3 text-sm text-red-300">
            <span className="font-semibold">Errore: </span>{serverError}
          </div>
        )}

        {/* Output */}
        {hasOutput && (
          <section className="space-y-3">
            {/* Tab bar */}
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
                    {t === "pseudocode" ? "Pseudocodice" : t === "json" ? "JSON" : "Grafo"}
                  </button>
                );
              })}

              {/* Errori validazione badge */}
              {validationErrors.length > 0 && (
                <span className="ml-auto self-center text-xs text-red-400 bg-red-950 border border-red-700 px-2 py-0.5 rounded-full">
                  {validationErrors.length} errore{validationErrors.length > 1 ? "i" : ""} validazione
                </span>
              )}
              {patch && validationErrors.length === 0 && (
                <span className="ml-auto self-center text-xs text-green-400 bg-green-950 border border-green-700 px-2 py-0.5 rounded-full">
                  JSON valido ✓
                </span>
              )}
            </div>

            {/* Errori validazione */}
            {validationErrors.length > 0 && (
              <div className="rounded-md bg-red-950 border border-red-800 px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">Errori di validazione</p>
                {validationErrors.map((e, i) => (
                  <p key={i} className="text-sm text-red-300 font-mono">{e}</p>
                ))}
              </div>
            )}

            {/* Tab content */}
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
                  copia
                </button>
              </div>
            )}

            {activeTab === "graph" && patch && (
              <div className="rounded-xl overflow-hidden border border-slate-800">
                <PatchGraph patch={patch} />
                <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>{patch.nodes.length} nodi</span>
                  <span>{patch.edges.length} archi</span>
                  <span>versione {patch.version}</span>
                </div>
              </div>
            )}

            {/* Azione secondaria: rigenera JSON dal pseudocodice modificato */}
            {pseudocode && (
              <div className="flex items-center gap-3 pt-1">
                <p className="text-xs text-slate-600">Hai modificato il pseudocodice?</p>
                <button
                  onClick={() => generate("json")}
                  disabled={loading}
                  className="text-xs px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors disabled:opacity-40"
                >
                  Rigenera JSON dal pseudocodice
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
