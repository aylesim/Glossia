"use client";

import type { Domain, Patch, RunRecord, Span } from "@/lib/ir/types";
import { getNodeType } from "@/lib/ir/query";
import Markdown from "@/app/components/Markdown";
import type { InspectorTab, StepView } from "../types";

function fmtDuration(ms: number | undefined): string {
  if (ms === undefined) return "n/a";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function spanMs(span: Span): number {
  if (!span.end) return 0;
  return Math.max(0, Date.parse(span.end) - Date.parse(span.start));
}

function statusTone(status: string): string {
  if (status === "completed" || status === "ok") return "var(--success)";
  if (status === "running") return "var(--accent)";
  if (status === "failed" || status === "error") return "var(--danger)";
  if (status === "cached") return "var(--chart-4)";
  return "var(--fg-subtle)";
}

function download(markdown: string, title: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brief"}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function Inspector({
  domain,
  patch,
  selectedNodeId,
  steps,
  run,
  tab,
  onTabChange,
}: {
  domain: Domain;
  patch: Patch | null;
  selectedNodeId: string | null;
  steps: Record<string, StepView>;
  run: RunRecord | null;
  tab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
}) {
  const node = patch?.nodes.find((candidate) => candidate.id === selectedNodeId) ?? null;
  const type = node ? getNodeType(domain, node.type) : null;
  const step = node ? steps[node.id] : null;
  const artifact = run?.artifact;

  const tabs: { id: InspectorTab; label: string; disabled?: boolean }[] = [
    { id: "configure", label: "Configure" },
    { id: "run", label: "Run" },
    { id: "trace", label: "Trace" },
    { id: "artifact", label: "Artifact", disabled: !artifact },
  ];

  return (
    <aside className="flex h-full min-h-[520px] flex-col border-l border-[var(--border)] bg-[var(--surface)]" aria-label="Inspector">
      <div role="tablist" aria-label="Inspector" className="flex shrink-0 border-b border-[var(--border)] px-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            disabled={item.disabled}
            onClick={() => onTabChange(item.id)}
            className={`relative px-2.5 py-2.5 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
              tab === item.id ? "text-[var(--fg)]" : "text-[var(--fg-subtle)] hover:text-[var(--fg)]"
            }`}
          >
            {item.label}
            {tab === item.id ? (
              <span className="absolute inset-x-1 -bottom-px h-px bg-[var(--accent)]" />
            ) : null}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {tab === "configure" ? (
          node && type ? (
            <div className="space-y-5">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">Node</p>
                <h2 className="mt-1.5 text-[14px] font-semibold leading-tight tracking-[-0.01em] text-[var(--fg)]">{type.name}</h2>
                <p className="mt-1 font-mono text-[9.5px] text-[var(--fg-subtle)]">
                  {node.id} · {type.id}
                </p>
                <p className="mt-3 text-[12px] leading-5 text-[var(--fg-muted)]">{type.description}</p>
              </div>

              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">
                  Parameters
                </p>
                <div className="mt-2 divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
                  {type.params.length === 0 ? (
                    <p className="px-3 py-2.5 text-[11px] text-[var(--fg-subtle)]">No parameters.</p>
                  ) : (
                    type.params.map((param) => (
                      <div key={param.key} className="flex items-start justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                          <p className="font-mono text-[10px] text-[var(--fg)]">{param.key}</p>
                          <p className="mt-0.5 text-[10.5px] leading-4 text-[var(--fg-subtle)]">
                            {param.description}
                          </p>
                        </div>
                        <span className="shrink-0 rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--fg-muted)]">
                          {JSON.stringify(node.params[param.key] ?? param.default ?? null)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-[var(--border)] p-3">
                  <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-subtle)]">Inputs</p>
                  <ul className="mt-2 space-y-1.5">
                    {type.inputs.length === 0 ? (
                      <li className="text-[10px] text-[var(--fg-subtle)]">none</li>
                    ) : (
                      type.inputs.map((port) => (
                        <li key={port.name} className="font-mono text-[9.5px] text-[var(--fg-muted)]">
                          {port.name}
                          <span className="text-[var(--fg-subtle)]">:{port.type}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div className="rounded-md border border-[var(--border)] p-3">
                  <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-subtle)]">Outputs</p>
                  <ul className="mt-2 space-y-1.5">
                    {type.outputs.length === 0 ? (
                      <li className="text-[10px] text-[var(--fg-subtle)]">artifact</li>
                    ) : (
                      type.outputs.map((port) => (
                        <li key={port.name} className="font-mono text-[9.5px] text-[var(--fg-muted)]">
                          {port.name}
                          <span className="text-[var(--fg-subtle)]">:{port.type}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>

              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">Executor</p>
                <p className="mt-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-2 font-mono text-[10px] text-[var(--fg-muted)]">
                  {type.executor.kind} / {type.executor.ref}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">Workspace</p>
                <h2 className="mt-1.5 text-[16px] font-semibold leading-tight tracking-[-0.01em] text-[var(--fg)]">
                  Select a node to inspect it.
                </h2>
                <p className="mt-2 text-[12px] leading-5 text-[var(--fg-muted)]">
                  The inspector shows the node contract on the left and the actual run output on the right.
                  Click any node in the canvas, or a row in the timeline.
                </p>
              </div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-subtle)]">Domain</p>
                <p className="mt-1 text-[13px] text-[var(--fg)]">{domain.name}</p>
                <p className="mt-1 text-[11px] leading-5 text-[var(--fg-muted)]">{domain.description}</p>
                <p className="mt-2 font-mono text-[9px] text-[var(--fg-subtle)]">
                  {domain.nodeTypes.length} node types · v{domain.version}
                </p>
              </div>
            </div>
          )
        ) : null}

        {tab === "run" ? (
          node && type ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">Step</p>
                  <h2 className="mt-1 text-[13px] font-semibold text-[var(--fg)]">{node.id}</h2>
                  <p className="mt-1 font-mono text-[9.5px] text-[var(--fg-subtle)]">{type.id}</p>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase"
                  style={{
                    color: statusTone(step?.status ?? "queued"),
                    background: `color-mix(in srgb, ${statusTone(step?.status ?? "queued")} 12%, transparent)`,
                  }}
                >
                  {step?.status ?? "queued"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  ["ms", fmtDuration(step?.ms)],
                  ["cost", step?.usage ? `$${step.usage.costUsd.toFixed(4)}` : "n/a"],
                  ["tokens", step?.usage ? `${step.usage.inputTokens + step.usage.outputTokens}` : "n/a"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-[var(--border)] px-2.5 py-2">
                    <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">{label}</p>
                    <p className="mt-1 font-mono text-[11px] text-[var(--fg)]">{value}</p>
                  </div>
                ))}
              </div>

              {step?.attempt && step.attempt > 1 ? (
                <p className="rounded-md border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-2.5 py-2 font-mono text-[10px] text-[var(--warning)]">
                  attempt {step.attempt} · retried
                </p>
              ) : null}

              {step?.error ? (
                <div className="rounded-md border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-3">
                  <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--danger)]">Error</p>
                  <p className="mt-1.5 font-mono text-[10.5px] leading-5 text-[var(--danger)]">{step.error}</p>
                </div>
              ) : null}

              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">Output</p>
                <pre className="mt-2 max-h-[320px] overflow-auto rounded-md border border-[var(--border)] bg-[var(--code)] p-3 font-mono text-[10px] leading-5 text-[var(--fg-muted)]">
                  {step?.outputPreview ?? "No output yet. Run the graph to fill this in."}
                </pre>
              </div>

              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">Resolved input</p>
                <pre className="mt-2 max-h-[200px] overflow-auto rounded-md border border-[var(--border)] bg-[var(--code)] p-3 font-mono text-[10px] leading-5 text-[var(--fg-muted)]">
                  {JSON.stringify(node.params, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-[12px] leading-5 text-[var(--fg-muted)]">
              Select a node and run the graph. The inspector will show its actual output, attempts and cost.
            </p>
          )
        ) : null}

        {tab === "trace" ? (
          <div className="space-y-4">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">Run</p>
              <h2 className="mt-1 font-mono text-[12px] text-[var(--fg)]">{run?.id ?? "no run yet"}</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  ["status", run?.status ?? "n/a"],
                  ["model", run?.model ?? "n/a"],
                  ["cost", run ? `$${run.costUsd.toFixed(4)}` : "n/a"],
                  ["duration", run ? fmtDuration(run.durationMs) : "n/a"],
                  ["tokens", run ? `${run.usage.inputTokens + run.usage.outputTokens}` : "n/a"],
                  ["steps", run ? `${run.steps.filter((step) => step.status === "completed").length}/${run.steps.length}` : "n/a"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-[var(--border)] px-2.5 py-2">
                    <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-subtle)]">{label}</p>
                    <p className="mt-1 truncate font-mono text-[10px] text-[var(--fg)]" title={value}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">Spans</p>
              <ul className="mt-2 space-y-1">
                {run?.spans.length ? (
                  run.spans.map((span) => (
                    <li
                      key={span.id}
                      className="flex items-center gap-2 rounded-md border border-[var(--border)] px-2 py-1.5"
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: statusTone(span.status) }}
                      />
                      <span className="min-w-0 flex-1 truncate font-mono text-[9.5px] text-[var(--fg-muted)]">
                        {span.name}
                      </span>
                      <span className="font-mono text-[8.5px] text-[var(--fg-subtle)]">{span.kind}</span>
                      <span className="w-[44px] text-right font-mono text-[8.5px] text-[var(--fg-subtle)]">
                        {fmtDuration(spanMs(span))}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="text-[11px] text-[var(--fg-subtle)]">No spans recorded.</li>
                )}
              </ul>
            </div>

            {run?.error ? (
              <div className="rounded-md border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--danger)]">
                  {run.error.code}
                </p>
                <p className="mt-1.5 font-mono text-[10.5px] leading-5 text-[var(--danger)]">
                  {run.error.message}
                </p>
                {run.error.hint ? (
                  <p className="mt-1 text-[10.5px] leading-5 text-[var(--fg-muted)]">{run.error.hint}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "artifact" ? (
          artifact ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">Artifact</p>
                  <h2 className="mt-1 text-[16px] font-semibold leading-tight tracking-[-0.01em] text-[var(--fg)]">{artifact.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => download(artifact.markdown, artifact.title)}
                  className="shrink-0 rounded border border-[var(--border)] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--fg-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                >
                  .md ↓
                </button>
              </div>

              <div className="rounded-md border border-[var(--border)] bg-[var(--success-soft)] px-3 py-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--success)]">
                  verified
                </p>
                <p className="mt-1 font-mono text-[10.5px] text-[var(--fg-muted)]">
                  {artifact.verification.supportedClaims}/{artifact.verification.totalClaims} claims supported
                  {" · "}
                  {Math.round(artifact.verification.supportRate * 100)}%
                </p>
              </div>

              <div className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
                <Markdown markdown={artifact.markdown} className="max-h-[60vh] overflow-y-auto pr-1" />
              </div>

              {artifact.sources.length > 0 ? (
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">Sources</p>
                  <ul className="mt-2 space-y-1.5">
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
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[12px] leading-5 text-[var(--fg-muted)]">
                Run the graph to produce the artifact. The verifier checks every claim quote against the
                source text before the brief is published.
              </p>
            </div>
          )
        ) : null}
      </div>
    </aside>
  );
}
