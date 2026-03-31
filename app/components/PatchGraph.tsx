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
import NodeTypeFrame from "@/app/components/NodeTypeFrame";
import { buildDomainNodeTooltip, formatParamLineForPatch } from "@/lib/node-chrome";
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

    const title = kind
      ? `${n.id}\n\n${buildDomainNodeTooltip(kind)}`
      : `${n.id}\n\nType: ${n.type}`;

    return {
      id: n.id,
      position: { x: col * SPACING_X + 48, y: row * SPACING_Y + 48 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        label: (
          <NodeTypeFrame
            typeId={n.type}
            title={title}
            className="min-w-[14rem] max-w-[18rem] hover:border-[var(--border-strong)] hover:shadow-sm"
          >
            <div className="flex min-h-0 flex-1 flex-col p-2.5 text-left">
              <p className="line-clamp-2 text-xs font-medium leading-tight text-[var(--fg)]">
                {kind?.name ?? n.type}
              </p>
              <p className="mt-1 truncate font-mono text-[9px] tracking-wide text-[var(--fg-subtle)]">
                {kind ? n.type : n.id}
              </p>
              {kind ? (
                <p className="mt-0.5 truncate font-mono text-[9px] text-[var(--fg-muted)]">{n.id}</p>
              ) : null}
              <div className="mt-2 min-h-0 max-h-28 overflow-y-auto border-t border-[color-mix(in_srgb,var(--border)_70%,transparent)] pt-2">
                {kind && kind.params.length > 0 ? (
                  <ul className="space-y-1">
                    {kind.params.map((p) => (
                      <li
                        key={p.key}
                        className="break-all font-mono text-[9px] leading-snug text-[var(--fg-muted)]"
                      >
                        {formatParamLineForPatch(p, n.params)}
                      </li>
                    ))}
                  </ul>
                ) : !kind && paramEntries.length > 0 ? (
                  <ul className="space-y-1">
                    {paramEntries.map(([k, v]) => (
                      <li
                        key={k}
                        className="break-all font-mono text-[9px] leading-snug text-[var(--fg-muted)]"
                      >
                        {k}: {String(v)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-mono text-[9px] text-[var(--fg-muted)]">No params</p>
                )}
              </div>
            </div>
          </NodeTypeFrame>
        ),
      },
      style: {
        padding: 0,
        background: "transparent",
        border: "none",
        boxShadow: "none",
        minWidth: "auto",
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
