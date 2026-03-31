import { z } from "zod";
import { POC_NODE_TYPE_IDS } from "./node-kinds";

const NodeTypeSchema = z
  .string()
  .refine((val) => POC_NODE_TYPE_IDS.includes(val), {
    message: `Tipo nodo non valido. Tipi ammessi: ${POC_NODE_TYPE_IDS.join(", ")}`,
  });

export const PatchNodeSchema = z.object({
  id: z.string().min(1, "id non può essere vuoto"),
  type: NodeTypeSchema,
  params: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .default({}),
});

export const PatchEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

export const PatchSchema = z.object({
  version: z.string().default("1"),
  nodes: z.array(PatchNodeSchema).min(1, "La patch deve avere almeno un nodo"),
  edges: z.array(PatchEdgeSchema),
});

export type PatchNode = z.infer<typeof PatchNodeSchema>;
export type PatchEdge = z.infer<typeof PatchEdgeSchema>;
export type Patch = z.infer<typeof PatchSchema>;

export type ValidationResult =
  | { ok: true; patch: Patch }
  | { ok: false; errors: string[] };

function collectIntegrityErrors(patch: Patch): string[] {
  const errors: string[] = [];

  const ids = patch.nodes.map((n) => n.id);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicates.length > 0) {
    errors.push(`Id duplicati tra i nodi: ${[...new Set(duplicates)].join(", ")}`);
  }

  const idSet = new Set(ids);
  for (const edge of patch.edges) {
    if (!idSet.has(edge.from)) {
      errors.push(`Edge: nodo sorgente "${edge.from}" non trovato`);
    }
    if (!idSet.has(edge.to)) {
      errors.push(`Edge: nodo destinazione "${edge.to}" non trovato`);
    }
  }

  return errors;
}

export function validatePatch(raw: unknown): ValidationResult {
  const result = PatchSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map(
        (i) => `${i.path.join(".") || "root"}: ${i.message}`,
      ),
    };
  }
  const integrityErrors = collectIntegrityErrors(result.data);
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
