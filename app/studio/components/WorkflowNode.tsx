"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { NodeCategory, StepStatus } from "@/lib/ir/types";

export type WorkflowNodeData = {
  label: string;
  typeId: string;
  nodeId: string;
  category: NodeCategory;
  params: { key: string; value: string }[];
  inputs: { name: string; type: string; required?: boolean }[];
  outputs: { name: string; type: string }[];
  status: StepStatus;
  attempt: number;
  preview?: string;
  ms?: number;
  costUsd?: number;
  error?: string;
  selected: boolean;
};

export type WorkflowFlowNode = Node<WorkflowNodeData, "workflow">;

const CATEGORY_COLOR: Record<NodeCategory, string> = {
  input: "var(--chart-1)",
  llm: "var(--chart-2)",
  tool: "var(--chart-3)",
  transform: "var(--chart-4)",
  control: "var(--chart-6)",
  output: "var(--accent)",
};

function statusLabel(status: StepStatus): string {
  if (status === "running") return "running";
  if (status === "completed") return "ok";
  if (status === "cached") return "cached";
  if (status === "failed") return "error";
  if (status === "skipped") return "skipped";
  return "queued";
}

function statusTone(status: StepStatus): string {
  if (status === "running") return "var(--accent)";
  if (status === "completed") return "var(--success)";
  if (status === "cached") return "var(--chart-4)";
  if (status === "failed") return "var(--danger)";
  return "var(--fg-subtle)";
}

export default function WorkflowNode({ data, selected }: NodeProps<WorkflowFlowNode>) {
  const color = CATEGORY_COLOR[data.category] ?? "var(--chart-6)";
  const isRunning = data.status === "running";
  const isFailed = data.status === "failed";
  const isCached = data.status === "cached";
  const tone = statusTone(data.status);

  return (
    <div
      className={`group relative w-[240px] rounded-xl border bg-[var(--surface)] text-left shadow-[var(--shadow-card)] transition-[border-color,box-shadow,transform] ${
        selected ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/30" : "border-[var(--border)]"
      } ${isRunning ? "animate-node-pulse" : ""} ${isFailed ? "border-[var(--danger)]" : ""} ${
        isCached ? "border-dashed border-[var(--chart-4)]" : ""
      }`}
      data-status={data.status}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
          <span className="truncate font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
            {data.typeId}
          </span>
        </div>
        <span
          className="shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em]"
          style={{ color: tone, background: `color-mix(in srgb, ${tone} 12%, transparent)` }}
        >
          {statusLabel(data.status)}
          {data.attempt > 1 ? ` · ${data.attempt}` : ""}
        </span>
      </div>

      <div className="space-y-2 px-3 py-2.5">
        <div>
          <p className="text-[12.5px] font-medium leading-tight text-[var(--fg)]">{data.label}</p>
          <p className="mt-0.5 font-mono text-[8.5px] tracking-wide text-[var(--fg-subtle)]">{data.nodeId}</p>
        </div>

        {data.params.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {data.params.slice(0, 3).map((param) => (
              <span
                key={param.key}
                className="max-w-full truncate rounded border border-[var(--border)] bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-[8px] text-[var(--fg-muted)]"
                title={`${param.key}=${param.value}`}
              >
                {param.key}={param.value}
              </span>
            ))}
          </div>
        ) : null}

        {data.error ? (
          <p className="line-clamp-2 rounded bg-[var(--danger-soft)] px-1.5 py-1 font-mono text-[8.5px] leading-snug text-[var(--danger)]">
            {data.error}
          </p>
        ) : data.preview ? (
          <p className="line-clamp-2 rounded bg-[var(--bg-elevated)] px-1.5 py-1 font-mono text-[8.5px] leading-snug text-[var(--fg-muted)]">
            {data.preview}
          </p>
        ) : (
          <p className="font-mono text-[8.5px] text-[var(--fg-subtle)]">waiting for input…</p>
        )}

        <div className="flex items-center justify-between font-mono text-[8px] text-[var(--fg-subtle)]">
          <span>{data.ms !== undefined ? `${Math.round(data.ms)}ms` : "—"}</span>
          <span>{data.costUsd !== undefined ? `$${data.costUsd.toFixed(4)}` : "—"}</span>
        </div>
      </div>

      {data.inputs.map((port, index) => (
        <Handle
          key={`in-${port.name}`}
          id={port.name}
          type="target"
          position={Position.Left}
          className="!h-2.5 !w-2.5 !border-2 !border-[var(--surface)]"
          style={{
            top: `${((index + 1) / (data.inputs.length + 1)) * 100}%`,
            background: color,
          }}
          title={`${port.name}: ${port.type}`}
        />
      ))}
      {data.outputs.map((port, index) => (
        <Handle
          key={`out-${port.name}`}
          id={port.name}
          type="source"
          position={Position.Right}
          className="!h-2.5 !w-2.5 !border-2 !border-[var(--surface)]"
          style={{
            top: `${((index + 1) / (data.outputs.length + 1)) * 100}%`,
            background: color,
          }}
          title={`${port.name}: ${port.type}`}
        />
      ))}
    </div>
  );
}
