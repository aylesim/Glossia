"use client";

import { useState } from "react";
import { Domain, DomainNode } from "@/lib/domain";

function NodeCard({ node }: { node: DomainNode }) {
  return (
    <div className="border border-[var(--border)] bg-[var(--surface-raised)] p-4 transition-colors hover:border-[var(--border-strong)]">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-px w-6 shrink-0 bg-[var(--border-strong)]" aria-hidden />
        <div className="min-w-0">
          <p className="text-xs font-medium leading-tight text-[var(--fg)]">{node.name}</p>
          <p className="mt-1 font-mono text-[10px] tracking-wide text-[var(--fg-subtle)]">{node.id}</p>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-[var(--fg-muted)]">{node.description}</p>

      {node.params.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-[var(--border)] pt-3">
          {node.params.map((param) => (
            <div key={param.key} className="flex flex-wrap items-baseline gap-1.5">
              <code className="border border-[var(--border)] bg-[var(--code)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--fg)]">
                {param.key}
              </code>
              <span className="font-mono text-[10px] text-[var(--fg-subtle)]">{param.valueType}</span>
              {param.default !== undefined && (
                <span className="font-mono text-[10px] text-[var(--fg-subtle)]">
                  = {String(param.default)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {node.params.length === 0 && (
        <p className="mt-2 font-mono text-[10px] text-[var(--fg-subtle)]">No parameters</p>
      )}
    </div>
  );
}

export default function NodeCatalog({ domain }: { domain: Domain | null }) {
  const [open, setOpen] = useState(true);
  const nodeCount = domain?.nodes.length ?? 0;

  return (
    <section className="border border-[var(--border)] bg-[var(--surface)] px-5 py-4 sm:px-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left transition-opacity hover:opacity-80"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          Node catalog
        </span>
        <span className="font-mono text-[10px] tabular-nums text-[var(--fg-muted)]">{nodeCount}</span>
        <span className={`text-[var(--fg-subtle)] transition-transform ${open ? "rotate-90" : ""}`}>›</span>
      </button>

      {open && (
        <>
          {domain ? (
            <div className="mt-5 grid grid-cols-1 gap-3">
              {domain.nodes.map((node) => (
                <NodeCard key={node.id} node={node} />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-[var(--fg-muted)]">
              Load a domain in Step 1 to list the node types available for composition.
            </p>
          )}
        </>
      )}
    </section>
  );
}
