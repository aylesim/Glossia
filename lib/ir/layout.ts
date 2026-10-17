import type { Patch } from "./types";

export type NodePosition = { x: number; y: number };

/**
 * Deterministic, compact layout.
 *
 * A pure longest-path layout turns a 12-node chain into a 3,700px strip that
 * cannot fit a split-pane canvas. Instead we keep the topological order and
 * wrap it into a small grid. Edges stay readable because the order is preserved;
 * the graph reads like a storyboard rather than a single endless row.
 */
export function layoutPatch(patch: Patch): Record<string, NodePosition> {
  const indegree = new Map<string, number>();
  const successors = new Map<string, string[]>();
  const predecessors = new Map<string, string[]>();

  for (const node of patch.nodes) {
    indegree.set(node.id, 0);
    successors.set(node.id, []);
    predecessors.set(node.id, []);
  }
  for (const edge of patch.edges) {
    if (!indegree.has(edge.to) || !successors.has(edge.from)) continue;
    if (predecessors.get(edge.to)?.includes(edge.from)) continue;
    predecessors.get(edge.to)!.push(edge.from);
    successors.get(edge.from)!.push(edge.to);
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  }

  const level = new Map<string, number>();
  const queue = patch.nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0).map((node) => node.id);
  for (const id of queue) level.set(id, 0);
  let head = 0;
  while (head < queue.length) {
    const id = queue[head++]!;
    const current = level.get(id) ?? 0;
    for (const next of successors.get(id) ?? []) {
      level.set(next, Math.max(level.get(next) ?? 0, current + 1));
      indegree.set(next, (indegree.get(next) ?? 1) - 1);
      if ((indegree.get(next) ?? 0) === 0) queue.push(next);
    }
  }

  let fallback = Math.max(0, ...level.values()) + 1;
  for (const node of patch.nodes) {
    if (!level.has(node.id)) {
      level.set(node.id, fallback);
      fallback += 1;
    }
  }

  const ordered = [...patch.nodes].sort((a, b) => {
    const levelDiff = (level.get(a.id) ?? 0) - (level.get(b.id) ?? 0);
    if (levelDiff !== 0) return levelDiff;
    return patch.nodes.indexOf(a) - patch.nodes.indexOf(b);
  });

  const total = ordered.length;
  const columns = total <= 4 ? Math.max(1, total) : total <= 9 ? 3 : total <= 16 ? 3 : 4;
  const spacingX = 278;
  const spacingY = 214;

  const positions: Record<string, NodePosition> = {};
  ordered.forEach((node, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    positions[node.id] = node.position ?? {
      x: col * spacingX + 40,
      y: row * spacingY + 48,
    };
  });
  return positions;
}

export function graphBounds(patch: Patch, positions: Record<string, NodePosition>) {
  const values = Object.values(positions);
  if (values.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return {
    minX: Math.min(...values.map((position) => position.x)),
    minY: Math.min(...values.map((position) => position.y)),
    maxX: Math.max(...values.map((position) => position.x)),
    maxY: Math.max(...values.map((position) => position.y)),
  };
}
