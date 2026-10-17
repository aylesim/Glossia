"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Domain, Patch, StepStatus } from "@/lib/ir/types";
import { getNodeType } from "@/lib/ir/query";
import { layoutPatch } from "@/lib/ir/layout";
import WorkflowNode, { type WorkflowNodeData } from "./WorkflowNode";
import type { StepView } from "../types";

const NODE_TYPES = { workflow: WorkflowNode };

export default function GraphCanvas({
  patch,
  domain,
  steps,
  selectedNodeId,
  onSelectNode,
  readOnly = false,
}: {
  patch: Patch | null;
  domain: Domain;
  steps: Record<string, StepView>;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  readOnly?: boolean;
}) {
  const [instance, setInstance] = useState<ReactFlowInstance | null>(null);

  const flows = useMemo(() => {
    if (!patch) return { nodes: [] as Node[], edges: [] as Edge[] };
    const positions = layoutPatch(patch);
    const nodes: Node[] = patch.nodes.map((node) => {
      const type = getNodeType(domain, node.type);
      const step = steps[node.id];
      const data: WorkflowNodeData = {
        label: type?.name ?? node.type,
        typeId: node.type,
        nodeId: node.id,
        category: type?.category ?? "control",
        params: Object.entries(node.params).map(([key, value]) => ({
          key,
          value: typeof value === "string" ? value : JSON.stringify(value),
        })),
        inputs: type?.inputs ?? [],
        outputs: type?.outputs ?? [],
        status: step?.status ?? "queued",
        attempt: step?.attempt ?? 0,
        preview: step?.outputPreview,
        ms: step?.ms,
        costUsd: step?.usage?.costUsd,
        error: step?.error,
        selected: selectedNodeId === node.id,
      };
      return {
        id: node.id,
        type: "workflow",
        position: positions[node.id] ?? { x: 0, y: 0 },
        data,
        selected: selectedNodeId === node.id,
        draggable: false,
        style: {
          padding: 0,
          background: "transparent",
          border: "none",
          boxShadow: "none",
          width: 240,
          color: "var(--fg)",
        },
      };
    });

    const edges: Edge[] = patch.edges.map((edge) => {
      const targetStatus: StepStatus = steps[edge.to]?.status ?? "queued";
      const sourceStatus: StepStatus = steps[edge.from]?.status ?? "queued";
      const failed = targetStatus === "failed" || sourceStatus === "failed";
      const active = sourceStatus === "completed" || sourceStatus === "cached" || sourceStatus === "running";
      const done = targetStatus === "completed" || targetStatus === "cached";
      const color = failed
        ? "var(--danger)"
        : active
          ? "var(--accent)"
          : "var(--border-strong)";
      return {
        id: edge.id,
        source: edge.from,
        target: edge.to,
        sourceHandle: edge.fromPort,
        targetHandle: edge.toPort,
        type: "smoothstep",
        animated: sourceStatus === "running" || targetStatus === "running",
        style: {
          stroke: color,
          strokeWidth: active || failed ? 1.6 : 1.1,
          strokeOpacity: done ? 0.9 : 0.55,
        },
        markerEnd: {
          type: "arrowclosed" as const,
          color,
          width: 13,
          height: 13,
        },
      };
    });

    return { nodes, edges };
  }, [patch, domain, steps, selectedNodeId]);

  const onInit = useCallback((flow: ReactFlowInstance) => {
    setInstance(flow);
  }, []);

  useEffect(() => {
    if (!instance || !patch) return;
    const timer = window.setTimeout(() => {
      void instance.fitView({ padding: 0.14, maxZoom: 1, duration: 320 });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [instance, patch]);

  if (!patch) {
    return (
      <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 bg-[var(--bg)] px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)]">
          <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
        </div>
        <p className="font-serif text-xl text-[var(--fg)]">No graph yet</p>
        <p className="max-w-[300px] text-sm leading-6 text-[var(--fg-muted)]">
          Compile the intent on the left. The patch will appear here only if it passes the analyzer.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[var(--bg)]">
      <ReactFlow
        nodes={flows.nodes}
        edges={flows.edges}
        nodeTypes={NODE_TYPES}
        onInit={onInit}
        fitView
        fitViewOptions={{ padding: 0.16, maxZoom: 1.05 }}
        minZoom={0.2}
        maxZoom={1.3}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={!readOnly}
        panOnDrag
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        onNodeClick={(_, node) => onSelectNode(node.id)}
        onPaneClick={() => onSelectNode(null)}
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background variant={BackgroundVariant.Dots} color="var(--border)" gap={22} size={1.1} />
        <Controls
          showInteractive={false}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "var(--shadow-card)",
          }}
        />
      </ReactFlow>
    </div>
  );
}
