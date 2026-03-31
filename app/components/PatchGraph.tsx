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

function buildLayout(patch: Patch, domain: Domain): { nodes: Node[]; edges: Edge[] } {
  const SPACING_X = 320;
  const SPACING_Y = 160;
  const cols = Math.max(2, Math.ceil(Math.sqrt(patch.nodes.length) * 1.35));

  const flowNodes: Node[] = patch.nodes.map((n, i) => {
    const kind = getDomainNodeById(domain, n.type);
    const col = i % cols;
    const row = Math.floor(i / cols);

    const paramEntries = Object.entries(n.params ?? {});

    return {
      id: n.id,
      position: { x: col * SPACING_X + 48, y: row * SPACING_Y + 48 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        label: (
          <div style={{ textAlign: "left", fontSize: 12, lineHeight: 1.45, display: "grid", gap: 8 }}>
            <span
              style={{
                display: "inline-flex",
                width: "fit-content",
                border: "1px solid var(--graph-node-id-border)",
                background: "var(--graph-node-id-bg)",
                color: "var(--graph-node-id-text)",
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              {n.id}
            </span>
            <div style={{ color: "var(--graph-node-title)", fontSize: 14, fontWeight: 600, lineHeight: 1.25 }}>
              {kind?.name ?? n.type}
            </div>
            {paramEntries.length > 0 && (
              <div style={{ display: "grid", gap: 4 }}>
                {paramEntries.map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      gap: 10,
                      alignItems: "center",
                      fontSize: 11,
                    }}
                  >
                    <span style={{ color: "var(--graph-label-muted)", fontFamily: "var(--font-geist-mono), monospace" }}>
                      {k}
                    </span>
                    <span style={{ color: "var(--graph-param)", fontFamily: "var(--font-geist-mono), monospace" }}>
                      {String(v)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ),
      },
      style: {
        background: "var(--graph-node-bg)",
        border: "1px solid var(--graph-node-border)",
        borderRadius: 14,
        boxShadow: "var(--graph-node-shadow)",
        padding: "12px 14px",
        minWidth: 220,
        maxWidth: 260,
        color: "var(--fg)",
      },
    };
  });

  const flowEdges: Edge[] = patch.edges.map((e, i) => ({
    id: `e-${i}`,
    source: e.from,
    target: e.to,
    type: "smoothstep",
    animated: false,
    style: { stroke: "var(--graph-edge)", strokeWidth: 2 },
    markerEnd: { type: "arrowclosed" as const, color: "var(--graph-edge)" },
  }));

  return { nodes: flowNodes, edges: flowEdges };
}

export default function PatchGraph({ patch, domain }: { patch: Patch; domain: Domain }) {
  const { nodes, edges } = useMemo(() => buildLayout(patch, domain), [patch, domain]);
  const onInit = useCallback(() => {}, []);

  return (
    <div
      style={{
        width: "100%",
        height: 520,
        background: "var(--graph-bg)",
        overflow: "hidden",
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onInit={onInit}
        fitView
        fitViewOptions={{ padding: 0.12, maxZoom: 1 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="var(--graph-dots)" gap={20} size={1.1} />
        <Controls
          style={{
            background: "var(--graph-control-bg)",
            border: "1px solid var(--graph-control-border)",
            borderRadius: 10,
          }}
        />
      </ReactFlow>
    </div>
  );
}
