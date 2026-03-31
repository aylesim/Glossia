"use client";

import { useState } from "react";
import { POC_NODE_KINDS, NodeKindDefinition } from "@/lib/node-kinds";

const NODE_COLOR: Record<string, string> = {
  "midi.in": "#22c55e",
  "midi.out": "#ef4444",
  "filter.pitch": "#3b82f6",
  "filter.channel": "#6366f1",
  "transform.transpose": "#f59e0b",
  "time.quantize": "#8b5cf6",
  "velocity.scale": "#ec4899",
  "cc.map": "#14b8a6",
};

function NodeCard({ kind }: { kind: NodeKindDefinition }) {
  const color = NODE_COLOR[kind.type] ?? "#64748b";

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
            {kind.label}
          </p>
          <p
            className="text-[10px] font-mono mt-0.5"
            style={{ color }}
          >
            {kind.type}
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-snug">{kind.description}</p>

      {kind.params.length > 0 && (
        <div className="border-t border-slate-800 pt-2 space-y-1">
          {kind.params.map((p) => (
            <div key={p.key} className="flex items-baseline gap-1.5 flex-wrap">
              <code className="text-[10px] text-slate-300 bg-slate-800 px-1 py-0.5 rounded">
                {p.key}
              </code>
              <span className="text-[10px] text-slate-600">{p.valueType}</span>
              {p.default !== undefined && (
                <span className="text-[10px] text-slate-600">
                  default: <span className="text-slate-500">{String(p.default)}</span>
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {kind.params.length === 0 && (
        <p className="text-[10px] text-slate-700 italic">nessun parametro</p>
      )}
    </div>
  );
}

export default function NodeCatalog() {
  const [open, setOpen] = useState(false);

  return (
    <section>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 group w-full text-left"
      >
        <p className="text-xs text-slate-500 uppercase tracking-widest group-hover:text-slate-400 transition-colors">
          Nodi disponibili
        </p>
        <span className="text-xs text-slate-600 group-hover:text-slate-500 transition-colors">
          ({POC_NODE_KINDS.length})
        </span>
        <span
          className={`ml-1 text-slate-600 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        >
          ▶
        </span>
      </button>

      {open && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {POC_NODE_KINDS.map((kind) => (
            <NodeCard key={kind.type} kind={kind} />
          ))}
        </div>
      )}
    </section>
  );
}
