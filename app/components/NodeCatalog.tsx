"use client";

import { useId, useState } from "react";
import type { Domain, DomainNode } from "@/lib/domain";
import { buildDomainNodeTooltip, formatParamLine } from "@/lib/node-chrome";
import NodeTypeFrame from "@/app/components/NodeTypeFrame";

function NodeCard({ node, compact }: { node: DomainNode; compact: boolean }) {
  return (
    <NodeTypeFrame
      typeId={node.id}
      title={buildDomainNodeTooltip(node)}
      className={
        compact
          ? "min-h-[4.5rem] w-[min(100%,10.5rem)] shrink-0 hover:border-[var(--border-strong)]"
          : "min-h-[7rem] w-[min(100%,14rem)] shrink-0 hover:border-[var(--border-strong)] hover:shadow-sm"
      }
    >
      <div className={`flex min-h-0 flex-1 flex-col ${compact ? "p-1.5" : "p-2.5"}`}>
        <p className={`line-clamp-2 font-medium leading-tight text-[var(--fg)] ${compact ? "text-[10px]" : "text-xs"}`}>
          {node.name}
        </p>
        <p className={`truncate font-mono tracking-wide text-[var(--fg-subtle)] ${compact ? "text-[8px]" : "text-[9px]"}`}>
          {node.id}
        </p>
        <div
          className={`min-h-0 overflow-y-auto border-t border-[color-mix(in_srgb,var(--border)_70%,transparent)] ${compact ? "mt-1 max-h-16 pt-1" : "mt-2 max-h-28 pt-2"}`}
        >
          {node.params.length === 0 ? (
            <p className={`font-mono text-[var(--fg-muted)] ${compact ? "text-[8px]" : "text-[9px]"}`}>No params</p>
          ) : (
            <ul className="space-y-0.5">
              {node.params.map((p) => (
                <li
                  key={p.key}
                  className={`break-all font-mono leading-snug text-[var(--fg-muted)] ${compact ? "text-[8px]" : "text-[9px]"}`}
                >
                  {formatParamLine(p)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </NodeTypeFrame>
  );
}

type NodeCatalogProps = {
  domain: Domain | null;
  compact?: boolean;
};

export default function NodeCatalog({ domain, compact = false }: NodeCatalogProps) {
  const [open, setOpen] = useState(!compact);
  const nodeCount = domain?.nodes.length ?? 0;
  const regionId = useId();
  const toggleId = `${regionId}-toggle`;

  const shell = compact
    ? "rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2"
    : "rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 sm:px-6";

  return (
    <section className={shell}>
      <div className={compact ? "border-b border-[var(--border)] pb-1.5" : "border-b border-[var(--border)] pb-4"}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">Nodes</p>
            {!compact && <p className="text-sm font-medium">Available types in the current domain.</p>}
          </div>
          <button
            id={toggleId}
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`flex shrink-0 items-center gap-1 rounded-sm text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-strong)] ${compact ? "font-mono text-[9px]" : "gap-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"}`}
            aria-expanded={open}
            aria-controls={regionId}
            aria-label={open ? "Collapse node catalog" : "Expand node catalog"}
          >
            <span className={`tabular-nums text-[var(--fg-muted)] ${compact ? "" : "font-mono text-[10px]"}`}>
              {nodeCount} types
            </span>
            <span className={`text-[var(--fg-subtle)] transition-transform ${open ? "rotate-90" : ""}`} aria-hidden={true}>
              ›
            </span>
          </button>
        </div>
      </div>

      <div id={regionId} hidden={!open}>
        {domain ? (
          nodeCount === 0 ? (
            <p className={`text-[var(--fg-muted)] ${compact ? "mt-2 font-mono text-[10px]" : "mt-4 text-sm leading-relaxed"}`}>
              No node types. Edit domain JSON or generate.
            </p>
          ) : (
            <div className={`flex flex-wrap ${compact ? "mt-2 gap-1" : "mt-5 gap-3"}`}>
              {domain.nodes.map((node) => (
                <NodeCard key={node.id} node={node} compact={compact} />
              ))}
            </div>
          )
        ) : (
          <p className={`text-[var(--fg-muted)] ${compact ? "mt-2 font-mono text-[10px]" : "mt-4 text-sm leading-relaxed"}`}>
            Load a domain to list node types.
          </p>
        )}
      </div>
    </section>
  );
}
