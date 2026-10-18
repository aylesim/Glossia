import type {
  Domain,
  GraphIssue,
  NodeType,
  Patch,
  PatchStats,
  Port,
  ValidationResult,
} from "./types";
import { PatchSchema } from "./schema";
import { getNodeType, portOf } from "./query";
import { getModelInfo, costFor } from "@/lib/llm/registry";

export { getNodeType, portOf };

function isPortCompatible(from: Port, to: Port): boolean {
  return from.type === "any" || to.type === "any" || from.type === to.type;
}

function emptyStats(): PatchStats {
  return {
    nodes: 0,
    edges: 0,
    depth: 0,
    estimatedInputTokens: 0,
    estimatedOutputTokens: 0,
    estimatedCostUsd: 0,
  };
}

function estimateTokensForType(nodeType: NodeType): { input: number; output: number } {
  const ref = nodeType.executor.ref;
  if (ref === "input.question" || ref === "output.brief") return { input: 80, output: 40 };
  if (ref === "plan") return { input: 900, output: 350 };
  if (ref === "extractClaims") return { input: 2_400, output: 900 };
  if (ref === "outline") return { input: 1_800, output: 500 };
  if (ref === "draftBrief") return { input: 3_200, output: 1_400 };
  if (ref === "verifyCitations") return { input: 1_200, output: 300 };
  if (ref === "storyBeats") return { input: 900, output: 450 };
  if (ref === "draftScene") return { input: 2_200, output: 1_600 };
  if (
    ref === "input.notes" ||
    ref === "output.midi" ||
    ref === "transposeNotes" ||
    ref === "filterPitch" ||
    ref === "quantizeNotes" ||
    ref === "shapeDynamics" ||
    ref === "input.premise" ||
    ref === "output.scene" ||
    ref === "checkContinuity"
  ) {
    return { input: 0, output: 0 };
  }
  if (nodeType.category === "transform" || nodeType.category === "tool") {
    return { input: 600, output: 600 };
  }
  return { input: 700, output: 300 };
}

export function estimateStats(patch: Patch, domain: Domain, modelId?: string): PatchStats {
  let input = 0;
  let output = 0;
  for (const node of patch.nodes) {
    const type = getNodeType(domain, node.type);
    if (!type) continue;
    const estimate = estimateTokensForType(type);
    input += estimate.input;
    output += estimate.output;
  }
  const model = getModelInfo(modelId, "openai");
  return {
    nodes: patch.nodes.length,
    edges: patch.edges.length,
    depth: graphDepth(patch),
    estimatedInputTokens: input,
    estimatedOutputTokens: output,
    estimatedCostUsd: costFor(model, input, output),
  };
}

function predecessorsByNode(patch: Patch): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const node of patch.nodes) map.set(node.id, new Set());
  for (const edge of patch.edges) {
    if (!map.has(edge.to)) map.set(edge.to, new Set());
    map.get(edge.to)!.add(edge.from);
  }
  return map;
}

function successorsByNode(patch: Patch): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const node of patch.nodes) map.set(node.id, new Set());
  for (const edge of patch.edges) {
    if (!map.has(edge.from)) map.set(edge.from, new Set());
    map.get(edge.from)!.add(edge.to);
  }
  return map;
}

export function graphDepth(patch: Patch): number {
  const succ = successorsByNode(patch);
  const pred = predecessorsByNode(patch);
  const indegree = new Map<string, number>();
  for (const node of patch.nodes) indegree.set(node.id, pred.get(node.id)?.size ?? 0);
  const depth = new Map<string, number>();
  const queue = patch.nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0).map((node) => node.id);
  for (const id of queue) depth.set(id, 1);
  let head = 0;
  while (head < queue.length) {
    const id = queue[head++]!;
    const d = depth.get(id) ?? 1;
    for (const next of succ.get(id) ?? []) {
      depth.set(next, Math.max(depth.get(next) ?? 0, d + 1));
      indegree.set(next, (indegree.get(next) ?? 1) - 1);
      if ((indegree.get(next) ?? 0) === 0) queue.push(next);
    }
  }
  return Math.max(0, ...depth.values());
}

function cycleNodes(patch: Patch): string[] {
  const pred = predecessorsByNode(patch);
  const succ = successorsByNode(patch);
  const indegree = new Map<string, number>();
  for (const node of patch.nodes) indegree.set(node.id, pred.get(node.id)?.size ?? 0);
  const queue = patch.nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0).map((node) => node.id);
  const visited = new Set<string>();
  let head = 0;
  while (head < queue.length) {
    const id = queue[head++]!;
    visited.add(id);
    for (const next of succ.get(id) ?? []) {
      indegree.set(next, (indegree.get(next) ?? 1) - 1);
      if ((indegree.get(next) ?? 0) === 0) queue.push(next);
    }
  }
  return patch.nodes.filter((node) => !visited.has(node.id)).map((node) => node.id);
}

function collectReachabilityIssues(patch: Patch, domain: Domain, issues: GraphIssue[]) {
  const succ = successorsByNode(patch);
  const pred = predecessorsByNode(patch);
  const roots = patch.nodes.filter((node) => (pred.get(node.id)?.size ?? 0) === 0).map((node) => node.id);
  const outputs = patch.nodes
    .filter((node) => {
      const type = getNodeType(domain, node.type);
      return type ? type.outputs.length === 0 || type.category === "output" : false;
    })
    .map((node) => node.id);

  if (roots.length === 0) {
    issues.push({
      code: "NO_ROOT",
      severity: "error",
      message: "The graph has no entry point: every node has an incoming edge.",
    });
  }
  if (outputs.length === 0) {
    issues.push({
      code: "NO_OUTPUT",
      severity: "error",
      message: "The graph has no output node, so it cannot produce an artifact.",
    });
  }

  const forward = new Set<string>();
  const fQueue = [...roots];
  for (const id of fQueue) forward.add(id);
  let fHead = 0;
  while (fHead < fQueue.length) {
    const id = fQueue[fHead++]!;
    for (const next of succ.get(id) ?? []) {
      if (forward.has(next)) continue;
      forward.add(next);
      fQueue.push(next);
    }
  }

  const backward = new Set<string>();
  const bQueue = [...outputs];
  for (const id of bQueue) backward.add(id);
  let bHead = 0;
  while (bHead < bQueue.length) {
    const id = bQueue[bHead++]!;
    for (const previous of pred.get(id) ?? []) {
      if (backward.has(previous)) continue;
      backward.add(previous);
      bQueue.push(previous);
    }
  }

  for (const node of patch.nodes) {
    const type = getNodeType(domain, node.type);
    const isInput = type?.category === "input";
    if (!forward.has(node.id) && !isInput) {
      issues.push({
        code: "UNREACHABLE",
        severity: "warning",
        message: `Node "${node.id}" is not reachable from any entry point.`,
        nodeId: node.id,
      });
    }
    if (!backward.has(node.id) && type?.category !== "output" && (type?.outputs.length ?? 0) > 0) {
      issues.push({
        code: "DEAD_END",
        severity: "warning",
        message: `Node "${node.id}" does not contribute to any output.`,
        nodeId: node.id,
        fix: { kind: "removeNode", nodeId: node.id },
      });
    }
  }

}

export function validatePatchObject(
  patch: Patch,
  domain: Domain,
  modelId?: string,
): ValidationResult {
  const issues: GraphIssue[] = [];
  const nodeIds = new Set<string>();

  if (patch.domainId !== domain.id) {
    issues.push({
      code: "DOMAIN_MISMATCH",
      severity: "error",
      message: `Patch targets domain "${patch.domainId}" but "${domain.id}" is active.`,
    });
  }
  if (patch.domainVersion !== domain.version) {
    issues.push({
      code: "DOMAIN_VERSION_MISMATCH",
      severity: "error",
      message: `Patch targets domain version "${patch.domainVersion}" but "${domain.version}" is active.`,
    });
  }

  for (const node of patch.nodes) {
    if (nodeIds.has(node.id)) {
      issues.push({
        code: "DUPLICATE_NODE_ID",
        severity: "error",
        message: `Duplicate node id "${node.id}".`,
        nodeId: node.id,
      });
    }
    nodeIds.add(node.id);

    const type = getNodeType(domain, node.type);
    if (!type) {
      issues.push({
        code: "UNKNOWN_NODE_TYPE",
        severity: "error",
        message: `Node "${node.id}" uses unknown type "${node.type}".`,
        nodeId: node.id,
      });
      continue;
    }

    const paramSpecs = new Map(type.params.map((param) => [param.key, param]));
    for (const [key, value] of Object.entries(node.params)) {
      const spec = paramSpecs.get(key);
      if (!spec) {
        issues.push({
          code: "UNKNOWN_PARAM",
          severity: "error",
          message: `Node "${node.id}" uses param "${key}", which is not defined on "${type.id}".`,
          nodeId: node.id,
        });
        continue;
      }
      const expected =
        spec.type === "enum"
          ? "string"
          : spec.type;
      if (typeof value !== expected) {
        issues.push({
          code: "PARAM_TYPE",
          severity: "error",
          message: `Node "${node.id}" param "${key}" expects ${expected} but received ${typeof value}.`,
          nodeId: node.id,
        });
        continue;
      }
      if (spec.type === "enum" && spec.enum && !spec.enum.includes(String(value))) {
        issues.push({
          code: "PARAM_ENUM",
          severity: "error",
          message: `Node "${node.id}" param "${key}" must be one of: ${spec.enum.join(", ")}.`,
          nodeId: node.id,
        });
      }
      if (typeof value === "number" && spec.min !== undefined && value < spec.min) {
        issues.push({
          code: "PARAM_RANGE",
          severity: "error",
          message: `Node "${node.id}" param "${key}" must be >= ${spec.min}.`,
          nodeId: node.id,
        });
      }
      if (typeof value === "number" && spec.max !== undefined && value > spec.max) {
        issues.push({
          code: "PARAM_RANGE",
          severity: "error",
          message: `Node "${node.id}" param "${key}" must be <= ${spec.max}.`,
          nodeId: node.id,
        });
      }
      if (typeof value === "string" && /^sk-[A-Za-z0-9_-]{12,}$/.test(value)) {
        issues.push({
          code: "SECRET_IN_PARAM",
          severity: "error",
          message: `Node "${node.id}" param "${key}" looks like an API key. Never put secrets in a graph.`,
          nodeId: node.id,
        });
      }
    }

    for (const spec of type.params) {
      if (spec.required && !(spec.key in node.params)) {
        issues.push({
          code: "MISSING_PARAM",
          severity: "error",
          message: `Node "${node.id}" requires param "${spec.key}".`,
          nodeId: node.id,
        });
      }
    }

    for (const [index, port] of type.inputs.entries()) {
      if (type.inputs.findIndex((candidate) => candidate.name === port.name) !== index) {
        issues.push({
          code: "DUPLICATE_PORT",
          severity: "error",
          message: `Node type "${type.id}" declares duplicate input port "${port.name}".`,
          nodeId: node.id,
        });
      }
    }
  }

  const edgeIds = new Set<string>();
  const edgeKeys = new Set<string>();
  for (const edge of patch.edges) {
    if (edgeIds.has(edge.id)) {
      issues.push({
        code: "DUPLICATE_EDGE_ID",
        severity: "error",
        message: `Duplicate edge id "${edge.id}".`,
        edgeId: edge.id,
      });
    }
    edgeIds.add(edge.id);

    const key = `${edge.from}:${edge.fromPort}->${edge.to}:${edge.toPort}`;
    if (edgeKeys.has(key)) {
      issues.push({
        code: "DUPLICATE_EDGE",
        severity: "error",
        message: `Duplicate edge ${key}.`,
        edgeId: edge.id,
      });
    }
    edgeKeys.add(key);

    const fromNode = patch.nodes.find((node) => node.id === edge.from);
    const toNode = patch.nodes.find((node) => node.id === edge.to);
    if (!fromNode || !toNode) {
      issues.push({
        code: "EDGE_ENDPOINT",
        severity: "error",
        message: `Edge "${edge.id}" references a node that does not exist.`,
        edgeId: edge.id,
      });
      continue;
    }
    if (edge.from === edge.to) {
      issues.push({
        code: "SELF_EDGE",
        severity: "error",
        message: `Edge "${edge.id}" connects a node to itself.`,
        edgeId: edge.id,
      });
      continue;
    }

    const fromType = getNodeType(domain, fromNode.type);
    const toType = getNodeType(domain, toNode.type);
    if (!fromType || !toType) continue;

    const fromPort = portOf(fromType.outputs, edge.fromPort);
    const toPort = portOf(toType.inputs, edge.toPort);
    if (!fromPort) {
      issues.push({
        code: "UNKNOWN_OUTPUT_PORT",
        severity: "error",
        message: `Node "${fromNode.id}" (${fromType.id}) has no output port "${edge.fromPort}".`,
        edgeId: edge.id,
      });
      continue;
    }
    if (!toPort) {
      issues.push({
        code: "UNKNOWN_INPUT_PORT",
        severity: "error",
        message: `Node "${toNode.id}" (${toType.id}) has no input port "${edge.toPort}".`,
        edgeId: edge.id,
      });
      continue;
    }
    if (!isPortCompatible(fromPort, toPort)) {
      issues.push({
        code: "PORT_TYPE_MISMATCH",
        severity: "error",
        message: `Cannot connect ${fromPort.type} ("${fromNode.id}.${fromPort.name}") to ${toPort.type} ("${toNode.id}.${toPort.name}").`,
        edgeId: edge.id,
      });
    }
  }

  for (const node of patch.nodes) {
    const type = getNodeType(domain, node.type);
    if (!type) continue;
    for (const input of type.inputs) {
      const incoming = patch.edges.filter((edge) => edge.to === node.id && edge.toPort === input.name);
      const required = input.required !== false;
      if (required && incoming.length === 0) {
        issues.push({
          code: "MISSING_INPUT",
          severity: "error",
          message: `Node "${node.id}" requires an edge into "${input.name}".`,
          nodeId: node.id,
        });
      }
      if (incoming.length > 1 && !input.multi) {
        issues.push({
          code: "MULTIPLE_PRODUCERS",
          severity: "error",
          message: `Node "${node.id}" input "${input.name}" has ${incoming.length} incoming edges but is not multi.`,
          nodeId: node.id,
        });
      }
    }
  }

  const cycle = cycleNodes(patch);
  if (cycle.length > 0) {
    issues.push({
      code: "CYCLE",
      severity: "error",
      message: `The graph contains a cycle involving: ${cycle.join(", ")}. Use a composite node for bounded loops.`,
    });
  }

  if (patch.nodes.length > 40) {
    issues.push({
      code: "TOO_MANY_NODES",
      severity: "error",
      message: `The graph has ${patch.nodes.length} nodes; the limit is 40.`,
    });
  }
  if (patch.edges.length > 80) {
    issues.push({
      code: "TOO_MANY_EDGES",
      severity: "error",
      message: `The graph has ${patch.edges.length} edges; the limit is 80.`,
    });
  }

  if (cycle.length === 0) collectReachabilityIssues(patch, domain, issues);

  for (const node of patch.nodes) {
    const type = getNodeType(domain, node.type);
    if (!type) continue;
    for (const output of type.outputs) {
      const consumed = patch.edges.some((edge) => edge.from === node.id && edge.fromPort === output.name);
      if (!consumed && type.category !== "output") {
        issues.push({
          code: "UNUSED_OUTPUT",
          severity: "warning",
          message: `Output "${node.id}.${output.name}" is never consumed.`,
          nodeId: node.id,
        });
      }
    }
  }

  const stats = estimateStats(patch, domain, modelId);
  if (stats.estimatedCostUsd > 0.25) {
    issues.push({
      code: "COST_ESTIMATE",
      severity: "warning",
      message: `Estimated run cost is $${stats.estimatedCostUsd.toFixed(3)}, above the demo budget.`,
    });
  }

  const errors = issues.filter((issue) => issue.severity === "error");
  if (errors.length > 0) return { ok: false, issues, stats };
  return { ok: true, patch, issues, stats };
}

export function validatePatch(raw: unknown, domain: Domain, modelId?: string): ValidationResult {
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    const issues: GraphIssue[] = parsed.error.issues.map((issue) => ({
      code: "SCHEMA_INVALID",
      severity: "error",
      message: `${issue.path.join(".") || "root"}: ${issue.message}`,
    }));
    return { ok: false, issues, stats: emptyStats() };
  }
  return validatePatchObject(parsed.data, domain, modelId);
}

export function formatIssues(issues: GraphIssue[]): string {
  return issues
    .map((issue) => `[${issue.severity.toUpperCase()}] ${issue.code}: ${issue.message}`)
    .join("\n");
}

export function issueFixLabel(issue: GraphIssue): string | undefined {
  if (!issue.fix) return undefined;
  switch (issue.fix.kind) {
    case "removeNode":
      return "Remove node";
    case "removeEdge":
      return "Remove edge";
    case "setParam":
      return "Fix param";
    case "addEdge":
      return "Add edge";
  }
}

