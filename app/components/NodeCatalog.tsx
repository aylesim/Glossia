"use client";

import { useState } from "react";
import { Domain, DomainNode } from "@/lib/domain";

function colorFor(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = value.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 75% 55%)`;
}

function NodeCard({ node }: { node: DomainNode }) {
  const color = colorFor(node.id);

  return (
    <div
      className="rounded-lg border bg-slate-900 p-3 flex flex-col gap-2 transition-colors hover:bg-slate-800/70"
      style={{ borderColor: `${color}44` }}
    >
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 w-2.5 h-2.5 rounded-full shrink-0"
          style={{ background: color, boxShadow: `0 0 6px ${color}` }}
        />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-100 leading-tight">
            {node.name}
          </p>
          <p
            className="text-[10px] font-mono mt-0.5"
            style={{ color }}
          >
            {node.id}
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-snug">{node.description}</p>

      {node.params.length > 0 && (
        <div className="border-t border-slate-800 pt-2 space-y-1">
          {node.params.map((param) => (
            <div key={param.key} className="flex items-baseline gap-1.5 flex-wrap">
              <code className="text-[10px] text-slate-300 bg-slate-800 px-1 py-0.5 rounded">
                {param.key}
              </code>
              <span className="text-[10px] text-slate-600">{param.valueType}</span>
              {param.default !== undefined && (
                <span className="text-[10px] text-slate-600">
                  default: <span className="text-slate-500">{String(param.default)}</span>
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {node.params.length === 0 && (
        <p className="text-[10px] text-slate-700 italic">no params</p>
      )}
    </div>
  );
}

export default function NodeCatalog({ domain }: { domain: Domain | null }) {
  const [open, setOpen] = useState(false);
  const nodeCount = domain?.nodes.length ?? 0;

  return (
    <section>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 group w-full text-left"
      >
        <p className="text-xs text-slate-500 uppercase tracking-widest group-hover:text-slate-400 transition-colors">
          Available Nodes
        </p>
        <span className="text-xs text-slate-600 group-hover:text-slate-500 transition-colors">
          ({nodeCount})
        </span>
        <span
          className={`ml-1 text-slate-600 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        >
          ▶
        </span>
      </button>

      {open && (
        <>
          {domain ? (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {domain.nodes.map((node) => (
                <NodeCard key={node.id} node={node} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500">Define or load a domain to view the catalog.</p>
          )}
        </>
      )}
    </section>
  );
}
