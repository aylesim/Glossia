"use client";

import { useId, useState } from "react";
import type { Domain, DomainNode } from "@/lib/domain";
import { buildDomainNodeTooltip, formatParamLine } from "@/lib/node-chrome";
import NodeTypeFrame from "@/app/components/NodeTypeFrame";

function NodeCard({ node }: { node: DomainNode }) {
  return (
    <NodeTypeFrame
      typeId={node.id}
      title={buildDomainNodeTooltip(node)}
      className="min-h-[7rem] w-[min(100%,14rem)] shrink-0 hover:border-[var(--border-strong)] hover:shadow-sm"
    >
      <div className="flex min-h-0 flex-1 flex-col p-2.5">
        <p className="line-clamp-2 text-xs font-medium leading-tight text-[var(--fg)]">{node.name}</p>
        <p className="mt-1 truncate font-mono text-[9px] tracking-wide text-[var(--fg-subtle)]">
          {node.id}
        </p>
        <div className="mt-2 min-h-0 max-h-28 overflow-y-auto border-t border-[color-mix(in_srgb,var(--border)_70%,transparent)] pt-2">
          {node.params.length === 0 ? (
            <p className="font-mono text-[9px] text-[var(--fg-muted)]">No params</p>
          ) : (
            <ul className="space-y-1">
              {node.params.map((p) => (
                <li key={p.key} className="break-all font-mono text-[9px] leading-snug text-[var(--fg-muted)]">
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

export default function NodeCatalog({ domain }: { domain: Domain | null }) {
  const [open, setOpen] = useState(true);
  const nodeCount = domain?.nodes.length ?? 0;
  const regionId = useId();
  const toggleId = `${regionId}-toggle`;

  return (
    <section className="border border-[var(--border)] bg-[var(--surface)] px-5 py-4 sm:px-6">
      <div className="border-b border-[var(--border)] pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">Node catalog</p>
            <p className="text-sm font-medium">Reference for the types in your domain.</p>
            <p className="text-sm leading-relaxed text-[var(--fg-muted)]">
              Each card is a node kind the compose step can use: human-readable name, stable id, and parameters. Use it
              while writing prompts or reading generated pseudocode so you stay aligned with the schema.
            </p>
          </div>
          <button
            id={toggleId}
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex shrink-0 items-center gap-2 rounded-sm text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-strong)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
            aria-expanded={open}
            aria-controls={regionId}
            aria-label={open ? "Collapse node catalog" : "Expand node catalog"}
          >
            <span className="font-mono text-[10px] tabular-nums text-[var(--fg-muted)]">{nodeCount} types</span>
            <span className={`text-[var(--fg-subtle)] transition-transform ${open ? "rotate-90" : ""}`} aria-hidden={true}>
              ›
            </span>
          </button>
        </div>
      </div>

      <div id={regionId} hidden={!open}>
        {domain ? (
          nodeCount === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-[var(--fg-muted)]">
              This domain has no node types yet. Edit the domain JSON or generate a new domain.
            </p>
          ) : (
            <div className="mt-5 flex flex-wrap gap-3">
              {domain.nodes.map((node) => (
                <NodeCard key={node.id} node={node} />
              ))}
            </div>
          )
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-[var(--fg-muted)]">
            Load a domain in Step 1 to list the node types available for composition.
          </p>
        )}
      </div>
    </section>
  );
}
