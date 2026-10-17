import type { JsonValue, Patch, PatchDiff } from "./types";

function edgeKey(edge: { from: string; fromPort: string; to: string; toPort: string }): string {
  return `${edge.from}:${edge.fromPort}->${edge.to}:${edge.toPort}`;
}

function equal(a: JsonValue | undefined, b: JsonValue | undefined): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function diffPatches(before: Patch | undefined, after: Patch): PatchDiff {
  const beforeNodes = new Map((before?.nodes ?? []).map((node) => [node.id, node]));
  const afterNodes = new Map(after.nodes.map((node) => [node.id, node]));

  const addedNodes = after.nodes.filter((node) => !beforeNodes.has(node.id)).map((node) => node.id);
  const removedNodes = (before?.nodes ?? [])
    .filter((node) => !afterNodes.has(node.id))
    .map((node) => node.id);

  const changedParams: PatchDiff["changedParams"] = [];
  for (const node of after.nodes) {
    const previous = beforeNodes.get(node.id);
    if (!previous) continue;
    const keys = new Set([...Object.keys(previous.params), ...Object.keys(node.params)]);
    for (const key of keys) {
      if (!equal(previous.params[key], node.params[key])) {
        changedParams.push({
          nodeId: node.id,
          key,
          before: previous.params[key],
          after: node.params[key],
        });
      }
    }
  }

  const beforeEdges = new Map((before?.edges ?? []).map((edge) => [edgeKey(edge), edge]));
  const afterEdges = new Map(after.edges.map((edge) => [edgeKey(edge), edge]));

  return {
    addedNodes,
    removedNodes,
    changedParams,
    addedEdges: after.edges
      .filter((edge) => !beforeEdges.has(edgeKey(edge)))
      .map((edge) => ({
        from: edge.from,
        fromPort: edge.fromPort,
        to: edge.to,
        toPort: edge.toPort,
      })),
    removedEdges: (before?.edges ?? [])
      .filter((edge) => !afterEdges.has(edgeKey(edge)))
      .map((edge) => ({
        from: edge.from,
        fromPort: edge.fromPort,
        to: edge.to,
        toPort: edge.toPort,
      })),
  };
}

export function diffSize(diff: PatchDiff | undefined): number {
  if (!diff) return 0;
  return (
    diff.addedNodes.length +
    diff.removedNodes.length +
    diff.changedParams.length +
    diff.addedEdges.length +
    diff.removedEdges.length
  );
}

export function describeDiff(diff: PatchDiff | undefined): string[] {
  if (!diff) return [];
  const lines: string[] = [];
  for (const id of diff.addedNodes) lines.push(`+ node ${id}`);
  for (const id of diff.removedNodes) lines.push(`- node ${id}`);
  for (const change of diff.changedParams) {
    lines.push(`~ ${change.nodeId}.${change.key}: ${JSON.stringify(change.before)} → ${JSON.stringify(change.after)}`);
  }
  for (const edge of diff.addedEdges) {
    lines.push(`+ edge ${edge.from}.${edge.fromPort} → ${edge.to}.${edge.toPort}`);
  }
  for (const edge of diff.removedEdges) {
    lines.push(`- edge ${edge.from}.${edge.fromPort} → ${edge.to}.${edge.toPort}`);
  }
  return lines;
}
