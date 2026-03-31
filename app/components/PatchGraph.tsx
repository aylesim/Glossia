"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  Position,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Patch } from "@/lib/schema";
import { Domain, getDomainNodeById } from "@/lib/domain";

function colorFor(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = value.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 75% 55%)`;
}

function buildLayout(patch: Patch, domain: Domain): { nodes: Node[]; edges: Edge[] } {
  const SPACING_X = 220;
  const SPACING_Y = 120;
  const cols = Math.ceil(Math.sqrt(patch.nodes.length));

  const flowNodes: Node[] = patch.nodes.map((n, i) => {
    const kind = getDomainNodeById(domain, n.type);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const color = colorFor(n.type);

    const paramLines = Object.entries(n.params ?? {})
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    return {
      id: n.id,
      position: { x: col * SPACING_X + 40, y: row * SPACING_Y + 40 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        label: (
          <div style={{ textAlign: "left", fontSize: 12, lineHeight: 1.4 }}>
            <div
              style={{
                fontWeight: 700,
                color,
                marginBottom: 2,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {kind?.name ?? n.type}
            </div>
            <div style={{ color: "#94a3b8", fontSize: 10 }}>{n.id}</div>
            {paramLines && (
              <pre
                style={{
                  marginTop: 4,
                  fontSize: 10,
                  color: "#cbd5e1",
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                }}
              >
                {paramLines}
              </pre>
            )}
          </div>
        ),
      },
      style: {
        background: "#1e293b",
        border: `2px solid ${color}`,
        borderRadius: 10,
        padding: "8px 12px",
        minWidth: 160,
        color: "#f1f5f9",
        boxShadow: `0 0 12px ${color}44`,
      },
    };
  });

  const flowEdges: Edge[] = patch.edges.map((e, i) => ({
    id: `e-${i}`,
    source: e.from,
    target: e.to,
    animated: true,
    style: { stroke: "#475569", strokeWidth: 2 },
    markerEnd: { type: "arrowclosed" as const, color: "#475569" },
  }));

  return { nodes: flowNodes, edges: flowEdges };
}

export default function PatchGraph({ patch, domain }: { patch: Patch; domain: Domain }) {
  const { nodes, edges } = useMemo(() => buildLayout(patch, domain), [patch, domain]);
  const onInit = useCallback(() => {}, []);

  return (
    <div style={{ width: "100%", height: 400, background: "#0f172a", borderRadius: 12, overflow: "hidden" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onInit={onInit}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="#1e293b" gap={20} />
        <Controls style={{ background: "#1e293b", border: "1px solid #334155" }} />
      </ReactFlow>
    </div>
  );
}
