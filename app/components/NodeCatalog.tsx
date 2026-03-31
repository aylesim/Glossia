"use client";

import { useState } from "react";
import { Domain, DomainNode } from "@/lib/domain";

function nodeHue(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 360;
}

function buildNodeTitle(node: DomainNode): string {
  const lines = [node.description];
  if (node.params.length > 0) {
    lines.push(
      "",
      "Parameters:",
      ...node.params.map(
        (p) =>
          `${p.key}: ${p.valueType}${p.default !== undefined ? ` = ${String(p.default)}` : ""}`,
      ),
    );
  } else {
    lines.push("", "No parameters");
  }
  return lines.join("\n");
}

function NodeCard({ node }: { node: DomainNode }) {
  const hue = nodeHue(node.id);
  const accent = `hsl(${hue} 72% 48%)`;
  const tint = `color-mix(in srgb, hsl(${hue} 60% 50%) 16%, var(--surface-raised))`;

  return (
    <div
      title={buildNodeTitle(node)}
      className="flex h-28 w-28 shrink-0 flex-col overflow-hidden rounded-md border border-[var(--border)] transition-[border-color,box-shadow] hover:border-[var(--border-strong)] hover:shadow-sm"
      style={{ backgroundColor: tint }}
    >
      <div className="h-2 w-full shrink-0" style={{ backgroundColor: accent }} aria-hidden />
      <div className="flex min-h-0 flex-1 flex-col p-2.5">
        <p className="line-clamp-2 text-xs font-medium leading-tight text-[var(--fg)]">{node.name}</p>
        <p className="mt-1 truncate font-mono text-[9px] tracking-wide text-[var(--fg-subtle)]">
          {node.id}
        </p>
        <p className="mt-auto pt-1 font-mono text-[9px] tabular-nums text-[var(--fg-muted)]">
          {node.params.length === 0
            ? "No params"
            : `${node.params.length} param${node.params.length === 1 ? "" : "s"}`}
        </p>
      </div>
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
            <div className="mt-5 flex flex-wrap gap-3">
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
