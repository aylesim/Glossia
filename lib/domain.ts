import { z } from "zod";

const ParamValueTypeSchema = z.enum(["string", "number", "boolean"]);

const PortSchema = z.object({
  name: z.string().min(1, "Port name cannot be empty"),
  description: z.string().min(1, "Port description cannot be empty"),
});

const NodeParamSchema = z.object({
  key: z.string().min(1, "Param key cannot be empty"),
  valueType: ParamValueTypeSchema,
  description: z.string().min(1, "Param description cannot be empty"),
  required: z.boolean().default(false),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

export const NodeSchema = z.object({
  id: z.string().min(1, "Node id cannot be empty"),
  name: z.string().min(1, "Node name cannot be empty"),
  description: z.string().min(1, "Node description cannot be empty"),
  inputs: z.array(PortSchema).default([]),
  outputs: z.array(PortSchema).default([]),
  params: z.array(NodeParamSchema).default([]),
});

export const DomainSchema = z.object({
  version: z.string().default("1"),
  id: z.string().min(1, "Domain id cannot be empty"),
  name: z.string().min(1, "Domain name cannot be empty"),
  description: z.string().min(1, "Domain description cannot be empty"),
  semantics: z.string().min(1, "Domain semantics cannot be empty"),
  nodes: z.array(NodeSchema).min(1, "Domain must include at least one node type"),
});

export type ParamValueType = z.infer<typeof ParamValueTypeSchema>;
export type DomainNodeParam = z.infer<typeof NodeParamSchema>;
export type DomainPort = z.infer<typeof PortSchema>;
export type DomainNode = z.infer<typeof NodeSchema>;
export type Domain = z.infer<typeof DomainSchema>;

export type DomainValidationResult =
  | { ok: true; domain: Domain }
  | { ok: false; errors: string[] };

function collectDomainIntegrityErrors(domain: Domain): string[] {
  const errors: string[] = [];
  const nodeIds = domain.nodes.map((node) => node.id);
  const duplicateNodeIds = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index);
  if (duplicateNodeIds.length > 0) {
    errors.push(`Duplicate node type ids: ${[...new Set(duplicateNodeIds)].join(", ")}`);
  }

  for (const node of domain.nodes) {
    const inputNames = node.inputs.map((port) => port.name);
    const duplicateInputs = inputNames.filter((name, index) => inputNames.indexOf(name) !== index);
    if (duplicateInputs.length > 0) {
      errors.push(`Node "${node.id}" has duplicate input ports: ${[...new Set(duplicateInputs)].join(", ")}`);
    }

    const outputNames = node.outputs.map((port) => port.name);
    const duplicateOutputs = outputNames.filter((name, index) => outputNames.indexOf(name) !== index);
    if (duplicateOutputs.length > 0) {
      errors.push(`Node "${node.id}" has duplicate output ports: ${[...new Set(duplicateOutputs)].join(", ")}`);
    }

    const paramKeys = node.params.map((param) => param.key);
    const duplicateParamKeys = paramKeys.filter((key, index) => paramKeys.indexOf(key) !== index);
    if (duplicateParamKeys.length > 0) {
      errors.push(`Node "${node.id}" has duplicate params: ${[...new Set(duplicateParamKeys)].join(", ")}`);
    }

    for (const param of node.params) {
      if (param.default !== undefined && typeof param.default !== param.valueType) {
        errors.push(`Node "${node.id}" param "${param.key}" default does not match valueType`);
      }
    }
  }

  return errors;
}

export function validateDomain(raw: unknown): DomainValidationResult {
  const result = DomainSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`),
    };
  }
  const integrityErrors = collectDomainIntegrityErrors(result.data);
  if (integrityErrors.length > 0) {
    return { ok: false, errors: integrityErrors };
  }
  return { ok: true, domain: result.data };
}

export function getDomainNodeById(domain: Domain, nodeTypeId: string): DomainNode | undefined {
  return domain.nodes.find((node) => node.id === nodeTypeId);
}

export function formatDomainForModelContext(domain: Domain): string {
  const lines: string[] = [];
  lines.push(`Domain: ${domain.name} (${domain.id})`);
  lines.push(domain.description);
  lines.push(`Semantics: ${domain.semantics}`);
  lines.push("");
  lines.push("Available node types:");
  for (const node of domain.nodes) {
    lines.push(`- ${node.id} (${node.name}): ${node.description}`);
    if (node.inputs.length > 0) {
      lines.push(`  inputs: ${node.inputs.map((port) => port.name).join(", ")}`);
    } else {
      lines.push("  inputs: none");
    }
    if (node.outputs.length > 0) {
      lines.push(`  outputs: ${node.outputs.map((port) => port.name).join(", ")}`);
    } else {
      lines.push("  outputs: none");
    }
    if (node.params.length > 0) {
      lines.push(
        `  params: ${node.params
          .map((param) => `${param.key}:${param.valueType}${param.required ? "!" : ""}`)
          .join(", ")}`,
      );
    } else {
      lines.push("  params: none");
    }
  }
  return lines.join("\n");
}

export const MIDI_DOMAIN_EXAMPLE: Domain = {
  version: "1",
  id: "midi-poc",
  name: "MIDI Graph PoC",
  description: "Example domain for composing MIDI pipelines as function graphs.",
  semantics:
    "Nodes are semantic stubs for this PoC: they describe structure and intent, but they do not execute real runtime transformations.",
  nodes: [
    {
      id: "midi.in",
      name: "MIDI Input",
      description: "Entry point for the MIDI flow in the patch.",
      inputs: [],
      outputs: [{ name: "midi", description: "Output MIDI event stream" }],
      params: [],
    },
    {
      id: "midi.out",
      name: "MIDI Output",
      description: "Terminal node of the MIDI flow.",
      inputs: [{ name: "midi", description: "Input MIDI event stream" }],
      outputs: [],
      params: [],
    },
    {
      id: "filter.pitch",
      name: "Pitch Range Filter",
      description: "Passes only notes whose pitch is in the minPitch-maxPitch range.",
      inputs: [{ name: "midi", description: "Input MIDI event stream" }],
      outputs: [{ name: "midi", description: "Filtered stream" }],
      params: [
        {
          key: "minPitch",
          valueType: "number",
          description: "Inclusive minimum pitch (0-127).",
          required: true,
          default: 0,
        },
        {
          key: "maxPitch",
          valueType: "number",
          description: "Inclusive maximum pitch (0-127).",
          required: true,
          default: 127,
        },
      ],
    },
    {
      id: "filter.channel",
      name: "Channel Filter",
      description: "Passes only events from the specified MIDI channel.",
      inputs: [{ name: "midi", description: "Input MIDI event stream" }],
      outputs: [{ name: "midi", description: "Filtered stream" }],
      params: [
        {
          key: "channel",
          valueType: "number",
          description: "MIDI channel 1-16.",
          required: true,
          default: 1,
        },
      ],
    },
    {
      id: "time.quantize",
      name: "Quantize",
      description: "Aligns note onset to the selected grid.",
      inputs: [{ name: "midi", description: "Input MIDI event stream" }],
      outputs: [{ name: "midi", description: "Quantized stream" }],
      params: [
        {
          key: "grid",
          valueType: "string",
          description: 'Grid resolution, for example "1/8" or "1/16".',
          required: true,
          default: "1/16",
        },
      ],
    },
    {
      id: "transform.transpose",
      name: "Transpose",
      description: "Shifts note pitch by a number of semitones.",
      inputs: [{ name: "midi", description: "Input MIDI event stream" }],
      outputs: [{ name: "midi", description: "Transposed stream" }],
      params: [
        {
          key: "semitones",
          valueType: "number",
          description: "Transpose amount in semitones.",
          required: true,
          default: 0,
        },
      ],
    },
    {
      id: "velocity.scale",
      name: "Velocity Scale",
      description: "Multiplies note velocity by a factor.",
      inputs: [{ name: "midi", description: "Input MIDI event stream" }],
      outputs: [{ name: "midi", description: "Velocity-scaled stream" }],
      params: [
        {
          key: "factor",
          valueType: "number",
          description: "Multiplication factor.",
          required: true,
          default: 1,
        },
      ],
    },
    {
      id: "cc.map",
      name: "CC Remap",
      description: "Remaps a controller change from fromCc to toCc.",
      inputs: [{ name: "midi", description: "Input MIDI event stream" }],
      outputs: [{ name: "midi", description: "CC-remapped stream" }],
      params: [
        {
          key: "fromCc",
          valueType: "number",
          description: "Source controller.",
          required: true,
          default: 1,
        },
        {
          key: "toCc",
          valueType: "number",
          description: "Destination controller.",
          required: true,
          default: 11,
        },
      ],
    },
  ],
};
