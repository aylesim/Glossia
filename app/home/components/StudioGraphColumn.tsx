"use client";

import dynamic from "next/dynamic";
import type { Domain } from "@/lib/domain";
import type { Patch } from "@/lib/schema";

const PatchGraph = dynamic(() => import("@/app/components/PatchGraph"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full min-h-[280px] items-center justify-center bg-[var(--graph-bg)] font-mono text-xs text-[var(--fg-muted)]"
      role="status"
      aria-live="polite"
    >
      Loading graph…
    </div>
  ),
});

type StudioGraphColumnProps = {
  patch: Patch | null;
  domain: Domain | null;
  hasOutput: boolean;
};

export default function StudioGraphColumn({ patch, domain, hasOutput }: StudioGraphColumnProps) {
  return (
    <aside className="min-h-0 w-full" aria-label="Patch graph">
      <div className="flex h-[min(50vh,440px)] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] lg:h-[min(78dvh,820px)]">
        <div className="shrink-0 border-b border-[var(--border)] px-4 py-2.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">Graph</p>
        </div>
        <div className="min-h-0 flex-1">
          {patch && domain ? (
            <PatchGraph patch={patch} domain={domain} fillHeight />
          ) : (
            <div className="flex h-full min-h-[280px] items-center justify-center bg-[var(--graph-bg)] px-4 text-center text-sm text-[var(--fg-muted)]">
              {hasOutput
                ? "Graph appears when generation returns a valid patch."
                : "Run Generate in Compose to render the graph."}
            </div>
          )}
        </div>
        {patch ? (
          <div className="flex shrink-0 flex-wrap gap-4 border-t border-[var(--border)] px-4 py-2 font-mono text-[10px] text-[var(--fg-subtle)]">
            <span>{patch.nodes.length} nodes</span>
            <span>{patch.edges.length} edges</span>
            <span>v{patch.version}</span>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
