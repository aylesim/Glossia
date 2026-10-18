import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "@/app/components/Markdown";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import type { RunRecord, StepRecord } from "@/lib/ir/types";
import { getDomain } from "@/lib/ir/domains";
import { artifactOutcome } from "@/lib/ir/artifact";
import { loadRun } from "@/lib/runtime/store";
import type { StepView } from "@/app/studio/types";
import RunGraph from "./RunGraph";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Run · Glossia",
  description: "A saved Glossia run: typed graph, trace, cost and the verified artifact.",
};

function previewFromStep(step: StepRecord): string | undefined {
  if (!step.output) return undefined;
  const first = Object.entries(step.output)[0];
  if (!first) return undefined;
  const [, value] = first;
  if (typeof value === "string") return value.slice(0, 160);
  if (Array.isArray(value)) return `${value.length} items`;
  if (value && typeof value === "object") return JSON.stringify(value).slice(0, 160);
  return String(value);
}

function toStepViews(run: RunRecord): Record<string, StepView> {
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

function statusTone(status: string): string {
  if (status === "completed") return "var(--success)";
  if (status === "running") return "var(--accent)";
  if (status === "failed" || status === "budget_exceeded") return "var(--danger)";
  if (status === "cancelled") return "var(--warning)";
  return "var(--fg-subtle)";
}

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await loadRun(id);
  if (!run) notFound();
  const domain = run.domain ?? getDomain(run.domainId);
  const steps = toStepViews(run);
  const artifact = run.artifact;
  const outcome = artifactOutcome(artifact);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1200px] px-5 py-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/studio"
            className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)] hover:text-[var(--fg)]"
          >
            ← prototype
          </Link>
          <a
            href={`/api/runs/${run.id}`}
            className="rounded-full border border-[var(--border)] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
          >
            run.json ↓
          </a>
        </div>

        <div className="mt-5 flex flex-col justify-between gap-5 border-b border-[var(--border)] pb-6 md:flex-row md:items-end">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em]"
                style={{
                  color: statusTone(run.status),
                  background: `color-mix(in srgb, ${statusTone(run.status)} 12%, transparent)`,
                }}
              >
                {run.status}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">
                {run.mode === "demo" ? "recorded" : run.mode} · {run.model === "demo/recorded" ? "fixture adapter" : run.model}
              </span>
            </div>
            <h1 className="mt-2 max-w-[760px] text-[28px] font-semibold leading-tight tracking-[-0.03em] text-[var(--fg)] sm:text-[32px]">
              {artifact?.title ?? run.patch.meta?.title ?? "Workflow run"}
            </h1>
            <p className="mt-2 font-mono text-[9.5px] text-[var(--fg-subtle)]">
              {run.id} · {new Date(run.startedAt).toLocaleString()} · {domain?.name ?? run.domainId}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-right">
            {[
              ["cost", `$${run.costUsd.toFixed(4)}`],
              ["tokens", `${run.usage.inputTokens + run.usage.outputTokens}`],
              ["duration", `${((run.durationMs ?? 0) / 1000).toFixed(1)}s`],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">{label}</p>
                <p className="mt-1 font-mono text-[12px] text-[var(--fg)]">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {run.error ? (
          <div className="mt-5 rounded-md border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--danger)]">
              {run.error.code}
            </p>
            <p className="mt-1 font-mono text-[10.5px] leading-5 text-[var(--danger)]">{run.error.message}</p>
            {run.error.hint ? <p className="mt-1 text-[11px] leading-5 text-[var(--fg-muted)]">{run.error.hint}</p> : null}
          </div>
        ) : null}

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">Graph</p>
              <p className="font-mono text-[9px] text-[var(--fg-subtle)]">
                {run.patch.nodes.length} nodes · {run.patch.edges.length} edges
              </p>
            </div>
            <div className="h-[500px]">
              {domain ? (
                <RunGraph patch={run.patch} domain={domain} steps={steps} />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[var(--fg-muted)]">
                  The domain for this run is not available in this build.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">
                {outcome?.kind === "checks" ? "Checks" : "Verification"}
              </p>
              {outcome ? (
                <>
                  <p className="mt-2 font-mono text-[24px] tracking-[-0.02em] text-[var(--success)]">
                    {Math.round(outcome.rate * 100)}%
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--fg-muted)]">
                    {outcome.passed}/{outcome.total}{" "}
                    {outcome.kind === "verification"
                      ? `claims supported by a source quote · ${artifact?.verification?.sourcesUsed ?? 0} sources`
                      : "deterministic checks passed after the node produced its output"}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-[11px] leading-5 text-[var(--fg-muted)]">
                  No artifact was produced by this run.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">Steps</p>
              <ul className="mt-2 space-y-1">
                {run.steps.map((step) => (
                  <li key={step.nodeId} className="flex items-center gap-2 border-b border-[var(--border)] py-1.5 last:border-b-0">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: statusTone(step.status) }}
                    />
                    <span className="min-w-0 flex-1 truncate font-mono text-[9.5px] text-[var(--fg-muted)]">
                      {step.nodeId}
                    </span>
                    <span className="font-mono text-[8.5px] text-[var(--fg-subtle)]">
                      {step.ms !== undefined ? `${Math.round(step.ms)}ms` : step.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {artifact ? (
          <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <article className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 py-6 sm:px-8">
              <Markdown markdown={artifact.markdown} />
            </article>
            <aside className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
              <div>
                {artifact.sources.length > 0 ? (
                  <>
                    <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">Sources</p>
                    <ul className="mt-2 space-y-2">
                      {artifact.sources.map((source) => (
                        <li key={source.id} className="text-[10.5px] leading-4 text-[var(--fg-muted)]">
                          <span className="font-mono text-[var(--accent)]">[{source.id}]</span>{" "}
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline decoration-[var(--border-strong)] underline-offset-2 hover:decoration-[var(--accent)]"
                          >
                            {source.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : artifact.checks ? (
                  <>
                    <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">Checks</p>
                    <ul className="mt-2 space-y-2">
                      {artifact.checks.map((check) => (
                        <li key={check.label} className="text-[10.5px] leading-4 text-[var(--fg-muted)]">
                          <span
                            className="font-mono"
                            style={{ color: check.passed ? "var(--success)" : "var(--danger)" }}
                          >
                            {check.passed ? "pass" : "fail"}
                          </span>{" "}
                          {check.label} — {check.detail}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">Trace</p>
                <ul className="mt-2 space-y-1">
                  {run.spans.slice(-14).map((span) => (
                    <li key={span.id} className="flex items-center gap-2 border-b border-[var(--border)] py-1 last:border-b-0">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: statusTone(span.status === "ok" ? "completed" : span.status) }}
                      />
                      <span className="min-w-0 flex-1 truncate font-mono text-[9px] text-[var(--fg-muted)]">
                        {span.name}
                      </span>
                      <span className="font-mono text-[8px] text-[var(--fg-subtle)]">{span.kind}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
