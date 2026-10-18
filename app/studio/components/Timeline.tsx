"use client";

import type { StepStatus } from "@/lib/ir/types";
import type { TimelineItem } from "../types";

function tone(status: StepStatus): string {
  if (status === "running") return "var(--accent)";
  if (status === "completed") return "var(--success)";
  if (status === "cached") return "var(--chart-4)";
  if (status === "failed") return "var(--danger)";
  if (status === "skipped") return "var(--fg-subtle)";
  return "var(--border-strong)";
}

export default function Timeline({
  items,
  running,
  totalCost,
  durationMs,
  onSelect,
}: {
  items: TimelineItem[];
  running: boolean;
  totalCost: number;
  durationMs: number;
  onSelect: (nodeId: string) => void;
}) {
  const maxMs = Math.max(1, ...items.map((item) => item.ms));

  return (
    <section className="flex h-[176px] flex-col border-t border-[var(--border)] bg-[var(--surface)]" aria-label="Run timeline">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${running ? "animate-blink bg-[var(--accent)]" : "bg-[var(--success)]"}`} />
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">
            trace
          </span>
          {running ? <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-[var(--accent)]">live</span> : null}
        </div>
        <div className="flex items-center gap-4 font-mono text-[8.5px] text-[var(--fg-subtle)]">
          <span>{items.length} steps</span>
          <span>${totalCost.toFixed(4)}</span>
          <span>{durationMs > 0 ? `${(durationMs / 1000).toFixed(1)}s` : "n/a"}</span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--fg-subtle)]">
            no trace / run the graph
          </div>
        ) : (
          <ul className="space-y-0.5">
            {items.map((item) => (
              <li key={item.nodeId}>
                <button
                  type="button"
                  onClick={() => onSelect(item.nodeId)}
                  className="group flex w-full items-center gap-2 rounded px-1.5 py-[3px] text-left transition-colors hover:bg-[var(--surface-raised)]"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: tone(item.status) }}
                  />
                  <span className="w-[92px] shrink-0 truncate font-mono text-[8.5px] text-[var(--fg-muted)]">
                    {item.label}
                  </span>
                  <span className="w-[52px] shrink-0 truncate font-mono text-[8px] text-[var(--fg-subtle)]">
                    {item.nodeId}
                  </span>
                  <span className="relative h-[3px] min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--surface-raised)]">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
                      style={{
                        width: `${Math.max(2, (item.ms / maxMs) * 100)}%`,
                        background: tone(item.status),
                        opacity: item.status === "queued" ? 0.2 : 0.85,
                      }}
                    />
                  </span>
                  <span className="w-[42px] shrink-0 text-right font-mono text-[8.5px] text-[var(--fg-subtle)]">
                    {item.ms > 0 ? `${Math.round(item.ms)}ms` : item.status === "cached" ? "cache" : "n/a"}
                  </span>
                  <span className="w-[46px] shrink-0 text-right font-mono text-[8.5px] text-[var(--fg-subtle)]">
                    ${item.costUsd.toFixed(4)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
