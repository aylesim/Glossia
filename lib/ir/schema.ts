import { z } from "zod";
import type { Domain, JsonValue, Patch } from "./types";

const JsonValueSchema = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
) as unknown as z.ZodType<JsonValue>;

export const PortSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["text", "json", "number", "boolean", "any"]),
  description: z.string().min(1),
  required: z.boolean().optional(),
  multi: z.boolean().optional(),
});

export const ParamSpecSchema = z.object({
  key: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "enum"]),
  description: z.string().min(1),
  required: z.boolean().default(false),
  default: JsonValueSchema.optional(),
  enum: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  ui: z.enum(["text", "textarea", "slider", "select", "toggle"]).optional(),
});

export const NodeTypeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(["input", "llm", "tool", "transform", "control", "output"]),
  inputs: z.array(PortSchema).default([]),
  outputs: z.array(PortSchema).default([]),
  params: z.array(ParamSpecSchema).default([]),
  executor: z.object({
    kind: z.enum(["llm", "tool", "transform", "control", "io"]),
    ref: z.string().min(1),
  }),
});

export const DomainSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  semantics: z.string().min(1),
  nodeTypes: z.array(NodeTypeSchema).min(1),
});

export const NodeInstanceSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  params: z.record(z.string(), JsonValueSchema).default({}),
  label: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
});

export const EdgeSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  fromPort: z.string().min(1),
  to: z.string().min(1),
  toPort: z.string().min(1),
});

export const PatchSchema = z.object({
  version: z.literal("2"),
  domainId: z.string().min(1),
  domainVersion: z.string().min(1),
  nodes: z.array(NodeInstanceSchema).min(1),
  edges: z.array(EdgeSchema),
  meta: z
    .object({
      title: z.string().optional(),
      createdBy: z.enum(["llm", "human", "repair"]).optional(),
      promptVersion: z.string().optional(),
    })
    .optional(),
});

export function parseDomain(raw: unknown) {
  return DomainSchema.safeParse(raw);
}

export function parsePatch(raw: unknown) {
  return PatchSchema.safeParse(raw);
}

export function domainJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(DomainSchema) as Record<string, unknown>;
}

/**
 * Domain-aware JSON Schema used for structured generation.
 *
 * `params` stays open because each node type has its own parameter set; the
 * deterministic analyzer is the authority on params. Keeping `params` open
 * avoids brittle provider-side schema unions and lets the repair loop do its job.
 */
export function patchJsonSchema(domain: Domain): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["version", "domainId", "domainVersion", "nodes", "edges"],
    properties: {
      version: { const: "2" },
      domainId: { const: domain.id },
      domainVersion: { const: domain.version },
      nodes: {
        type: "array",
        minItems: 1,
        maxItems: 40,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "type", "params"],
          properties: {
            id: { type: "string", minLength: 1 },
            type: { type: "string", enum: domain.nodeTypes.map((node) => node.id) },
            params: { type: "object", additionalProperties: true },
          },
        },
      },
      edges: {
        type: "array",
        maxItems: 80,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "from", "fromPort", "to", "toPort"],
          properties: {
            id: { type: "string", minLength: 1 },
            from: { type: "string", minLength: 1 },
            fromPort: { type: "string", minLength: 1 },
            to: { type: "string", minLength: 1 },
            toPort: { type: "string", minLength: 1 },
          },
        },
      },
    },
  };
}

export function isPatch(value: unknown): value is Patch {
  return PatchSchema.safeParse(value).success;
}

export function isDomain(value: unknown): value is Domain {
  return DomainSchema.safeParse(value).success;
}
