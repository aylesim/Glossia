import { z } from "zod";
import { Domain, getDomainNodeById } from "./domain";

const ParamValueSchema = z.union([z.string(), z.number(), z.boolean()]);

export const PatchNodeSchema = z.object({
  id: z.string().min(1, "id cannot be empty"),
  type: z.string().min(1, "type cannot be empty"),
  params: z.record(z.string(), ParamValueSchema).default({}),
});

export const PatchEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  fromPort: z.string().min(1).optional(),
  toPort: z.string().min(1).optional(),
});

export const PatchSchema = z.object({
  version: z.string().default("1"),
  nodes: z.array(PatchNodeSchema).min(1, "Patch must include at least one node"),
  edges: z.array(PatchEdgeSchema),
});

export type PatchNode = z.infer<typeof PatchNodeSchema>;
export type PatchEdge = z.infer<typeof PatchEdgeSchema>;
export type Patch = z.infer<typeof PatchSchema>;

export type ValidationResult =
  | { ok: true; patch: Patch }
  | { ok: false; errors: string[] };

function collectIntegrityErrors(patch: Patch, domain: Domain): string[] {
  const errors: string[] = [];

  const ids = patch.nodes.map((n) => n.id);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicates.length > 0) {
    errors.push(`Duplicate node ids: ${[...new Set(duplicates)].join(", ")}`);
  }

  const idSet = new Set(ids);
  for (const edge of patch.edges) {
    if (!idSet.has(edge.from)) {
      errors.push(`Edge: source node "${edge.from}" not found`);
    }
    if (!idSet.has(edge.to)) {
      errors.push(`Edge: target node "${edge.to}" not found`);
    }
  }

  for (const node of patch.nodes) {
    const domainNode = getDomainNodeById(domain, node.type);
    if (!domainNode) {
      errors.push(`Node type "${node.type}" is not defined in the current domain`);
      continue;
    }

    const allowedParams = new Map(domainNode.params.map((param) => [param.key, param]));
    for (const [key, value] of Object.entries(node.params ?? {})) {
      const spec = allowedParams.get(key);
      if (!spec) {
        errors.push(`Node "${node.id}" uses param "${key}" not allowed for type "${node.type}"`);
        continue;
      }
      if (typeof value !== spec.valueType) {
        errors.push(
          `Node "${node.id}" param "${key}" expected ${spec.valueType} but received ${typeof value}`,
        );
      }
    }
    for (const param of domainNode.params) {
      if (param.required && !(param.key in (node.params ?? {}))) {
        errors.push(`Node "${node.id}" requires param "${param.key}"`);
      }
    }
  }

  for (const edge of patch.edges) {
    const fromNode = patch.nodes.find((node) => node.id === edge.from);
    const toNode = patch.nodes.find((node) => node.id === edge.to);
    if (!fromNode || !toNode) continue;

    if (edge.fromPort) {
      const fromDomainNode = getDomainNodeById(domain, fromNode.type);
      if (
        fromDomainNode &&
        !fromDomainNode.outputs.some((port) => port.name === edge.fromPort)
      ) {
        errors.push(
          `Edge ${edge.from} -> ${edge.to}: fromPort "${edge.fromPort}" is invalid for "${fromNode.type}"`,
        );
      }
    }

    if (edge.toPort) {
      const toDomainNode = getDomainNodeById(domain, toNode.type);
      if (toDomainNode && !toDomainNode.inputs.some((port) => port.name === edge.toPort)) {
        errors.push(
          `Edge ${edge.from} -> ${edge.to}: toPort "${edge.toPort}" is invalid for "${toNode.type}"`,
        );
      }
    }
  }

  return errors;
}

export function validatePatch(raw: unknown, domain: Domain): ValidationResult {
  const result = PatchSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map(
        (i) => `${i.path.join(".") || "root"}: ${i.message}`,
      ),
    };
  }
  const integrityErrors = collectIntegrityErrors(result.data, domain);
  if (integrityErrors.length > 0) {
    return { ok: false, errors: integrityErrors };
  }
  return { ok: true, patch: result.data };
}

export function extractJsonFromModelOutput(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return text.trim();
}
