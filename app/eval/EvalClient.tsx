"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { EvalReport } from "@/lib/ir/types";
import { MODELS } from "@/lib/llm/registry";
import { btnPrimary, btnSecondary, chip, field, monoLabel } from "@/app/styles";

function pct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "n/a";
  return `${Math.round(value * 100)}%`;
}

function score(value: number | null | undefined): string {
  if (value === null || value === undefined) return "n/a";
  return value.toFixed(2);
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">{label}</p>
      <p className="mt-2 font-mono text-[24px] tracking-[-0.02em] text-[var(--fg)]">{value}</p>
      {detail ? <p className="mt-1 text-[10.5px] leading-4 text-[var(--fg-muted)]">{detail}</p> : null}
    </div>
  );
}

export default function EvalClient() {
  const [report, setReport] = useState<EvalReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [provider, setProvider] = useState<"openai" | "openrouter">("openai");
  const [model, setModel] = useState("gpt-4.1-mini");
  const [apiKey, setApiKey] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedKey = sessionStorage.getItem("glossia.api-key");
      if (storedKey) setApiKey(storedKey);
      const storedModel = sessionStorage.getItem("glossia.model");
      if (storedModel) setModel(storedModel);
      const storedProvider = sessionStorage.getItem("glossia.provider");
      if (storedProvider === "openai" || storedProvider === "openrouter") setProvider(storedProvider);
    } catch {
      // ignore
    }
    void fetch("/api/eval")
      .then((response) => response.json())
      .then((data: { report?: EvalReport | null }) => {
        if (data.report) setReport(data.report);
      })
      .catch(() => {});
  }, []);

  const cases = report?.cases ?? [];
  const providerModels = useMemo(() => MODELS.filter((entry) => entry.provider === provider), [provider]);

  const runEval = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/eval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          limit: 10,
          provider,
          model,
          apiKey: apiKey.trim() || undefined,
        }),
      });
      const data = (await response.json()) as {
        report?: EvalReport;
        error?: { message: string; hint?: string };
      };
      if (!response.ok || !data.report) {
        setError(data.error?.hint ? `${data.error.message} ${data.error.hint}` : data.error?.message ?? "The eval run failed.");
        return;
      }
      setReport(data.report);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The eval run failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 py-10 sm:px-8">
      <div className="flex flex-col justify-between gap-6 border-b border-[var(--border)] pb-8 md:flex-row md:items-end">
        <div className="max-w-[680px]">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
            Evaluation / structural suite
          </p>
          <h1 className="mt-3 text-[34px] font-semibold leading-[1.04] tracking-[-0.04em] text-[var(--fg)] sm:text-[40px]">
            Structural evaluation
            <br />
            of compiled graphs.
          </h1>
          <p className="mt-4 max-w-[560px] text-sm leading-7 text-[var(--fg-muted)]">
            The same graph contract runs against ten recorded cases. The suite records validity and node
            overlap. It also keeps the number of repair attempts and the latency for each case, with cost.
            These numbers describe the fixture set, not model quality. Live mode can run the same suite
            against a provider.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/studio" className={btnSecondary}>
            Open prototype
          </Link>
          <button type="button" onClick={() => void runEval()} disabled={loading} className={btnPrimary}>
            {loading ? "Running…" : "Run eval suite"}
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div className="flex rounded-md border border-[var(--border)] bg-[var(--surface)] p-0.5" role="group" aria-label="Eval mode">
          {(["demo", "live"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={`rounded px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.06em] transition-colors ${
                mode === value
                  ? "bg-[var(--inverse)] text-[var(--inverse-fg)]"
                  : "text-[var(--fg-subtle)] hover:text-[var(--fg)]"
              }`}
            >
              {value === "demo" ? "recorded" : value}
            </button>
          ))}
        </div>

        {mode === "live" ? (
          <>
            <label className="block">
              <span className={monoLabel}>Provider</span>
              <select
                value={provider}
                onChange={(event) => {
                  const next = event.target.value as "openai" | "openrouter";
                  setProvider(next);
                  const candidate = MODELS.find((entry) => entry.provider === next);
                  if (candidate) setModel(candidate.id);
                }}
                className={`${field} mt-1 w-[130px] py-1.5 text-[11px]`}
              >
                <option value="openai">OpenAI</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </label>
            <label className="block">
              <span className={monoLabel}>Model</span>
              <select
                value={model}
                onChange={(event) => setModel(event.target.value)}
                className={`${field} mt-1 w-[190px] py-1.5 text-[11px]`}
              >
                {providerModels.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-[220px] flex-1">
              <span className={monoLabel}>API key</span>
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="sk-…"
                className={`${field} mt-1 py-1.5 font-mono text-[11px]`}
              />
            </label>
          </>
        ) : (
          <p className={`${chip} h-fit`}>recorded fixtures / no model calls</p>
        )}
      </div>

      {error ? (
        <div role="alert" className="mt-4 rounded-md border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3 py-2.5 font-mono text-[10.5px] leading-5 text-[var(--danger)]">
          {error}
        </div>
      ) : null}

      {report ? (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="pass rate"
              value={pct(report.summary.passRate)}
              detail={`${report.summary.passed}/${report.summary.total} cases`}
            />
            <Stat
              label="node recall"
              value={score(report.summary.avgNodeRecall)}
              detail={`precision ${score(report.summary.avgNodePrecision)}`}
            />
            <Stat
              label="edge F1"
              value={score(report.summary.avgEdgeF1)}
              detail={`param accuracy ${score(report.summary.avgParamAccuracy)}`}
            />
            <Stat
              label="p50 latency"
              value={`${(report.summary.p50LatencyMs / 1000).toFixed(1)}s`}
              detail={`p95 ${(report.summary.p95LatencyMs / 1000).toFixed(1)}s · $${report.summary.totalCostUsd.toFixed(4)} total`}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
            <span>{report.id}</span>
            <span>{new Date(report.createdAt).toLocaleString()}</span>
            <span className="text-[var(--fg-muted)]">{report.mode === "demo" ? "recorded" : report.mode}</span>
            <span>{report.model === "demo/recorded" ? "fixture adapter" : report.model}</span>
            <span>avg attempts {report.summary.avgAttempts.toFixed(2)}</span>
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-elevated)]">
                    {["case", "intent", "valid", "recall", "precision", "edge F1", "attempts", "latency", "cost"].map((label) => (
                      <th
                        key={label}
                        className="px-3 py-2 font-mono text-[8.5px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cases.map((entry) => (
                    <tr
                      key={entry.id}
                      onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                      className="cursor-pointer border-b border-[var(--border)] transition-colors last:border-b-0 hover:bg-[var(--bg-elevated)]"
                    >
                      <td className="px-3 py-2 font-mono text-[10px] text-[var(--fg-muted)]">{entry.id}</td>
                      <td className="max-w-[300px] truncate px-3 py-2 text-[11px] text-[var(--fg)]" title={entry.intent}>
                        {entry.intent}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-1.5 py-0.5 font-mono text-[8.5px] uppercase ${
                            entry.valid
                              ? "bg-[var(--success-soft)] text-[var(--success)]"
                              : "bg-[var(--danger-soft)] text-[var(--danger)]"
                          }`}
                        >
                          {entry.valid ? "yes" : "no"}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-[var(--fg-muted)]">{pct(entry.nodeRecall)}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-[var(--fg-muted)]">{pct(entry.nodePrecision)}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-[var(--fg-muted)]">{score(entry.edgeF1)}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-[var(--fg-muted)]">{entry.attempts}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-[var(--fg-muted)]">
                        {(entry.latencyMs / 1000).toFixed(1)}s
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-[var(--fg-muted)]">
                        ${entry.costUsd.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {expanded ? (
            <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
              {(() => {
                const entry = cases.find((candidate) => candidate.id === expanded);
                if (!entry) return null;
                return (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-subtle)]">
                        Missing types
                      </p>
                      <p className="mt-1 font-mono text-[10px] leading-5 text-[var(--fg-muted)]">
                        {entry.missingTypes.length > 0 ? entry.missingTypes.join(", ") : "none"}
                      </p>
                      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-subtle)]">
                        Extra types
                      </p>
                      <p className="mt-1 font-mono text-[10px] leading-5 text-[var(--fg-muted)]">
                        {entry.extraTypes.length > 0 ? entry.extraTypes.join(", ") : "none"}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-subtle)]">
                        Issues
                      </p>
                      <ul className="mt-1 space-y-1">
                        {entry.issues.length === 0 ? (
                          <li className="font-mono text-[10px] text-[var(--fg-muted)]">none</li>
                        ) : (
                          entry.issues.map((issue) => (
                            <li key={issue} className="font-mono text-[9.5px] leading-4 text-[var(--danger)]">
                              {issue}
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-10 flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)] px-6 text-center">
          <p className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--fg)]">No report yet.</p>
          <p className="mt-2 max-w-[420px] text-sm leading-6 text-[var(--fg-muted)]">
            Run the recorded suite to exercise the compiler, analyzer and repair loop on ten structural cases.
            It does not call a model.
          </p>
          <button type="button" onClick={() => void runEval()} disabled={loading} className={`${btnPrimary} mt-5`}>
            {loading ? "Running…" : "Run the recorded suite"}
          </button>
        </div>
      )}
    </div>
  );
}
