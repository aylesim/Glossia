import { Domain, formatDomainForModelContext } from "./domain";

export function buildDomainBootstrapSystemPrompt(): string {
  return `
You are an assistant that defines graph-composition domains.
You must return ONLY valid JSON that follows this format:
- version: string
- id: string (kebab-case recommended)
- name: string
- description: string
- semantics: string
- nodes: array of node types
Each node type requires:
- id: unique string
- name: string
- description: string
- inputs: array of { name, description }
- outputs: array of { name, description }
- params: array di { key, valueType, description, required, default? }
valueType can only be: string, number, boolean.
Do not add any text outside JSON.
`.trim();
}

export function buildDomainBootstrapPrompt(domainDescription: string): string {
  return `
User domain description:
"${domainDescription}"

Generate the requested domain JSON.
`.trim();
}

export function buildComposeSystemPrompt(domain: Domain): string {
  return `
You are an assistant for semantic graph composition.
The current domain and allowed node types are:

${formatDomainForModelContext(domain)}

Patch rules:
- Patch JSON must include: version, nodes, edges.
- Each node: unique id, type, params.
- type must be one of the domain node ids.
- params can only use keys allowed by that node type.
- Each edge: from and to must reference existing node ids.
- Do not add extra text outside requested pseudocode/JSON.
`.trim();
}

export function buildPseudocodePrompt(userPrompt: string): string {
  return `
User request:
"${userPrompt}"

Describe the flow as numbered pseudocode: ordered node list, node type for each step, and key params.
Do not generate JSON in this step.
`.trim();
}

export function buildJsonPrompt(userPrompt: string, pseudocode: string): string {
  return `
User request:
"${userPrompt}"

Pseudocode:
${pseudocode}

Generate ONLY the patch JSON in a \`\`\`json code block.
`.trim();
}
