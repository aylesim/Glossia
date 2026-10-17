import type { Domain, GraphIssue } from "@/lib/ir/types";
import type { LlmTask } from "./types";
import { formatDomainContext } from "@/lib/ir/domains";
import { formatIssues } from "@/lib/ir/analyze";

export const PROMPT_VERSIONS: Record<LlmTask, string> = {
  compile: "compile.v2",
  repair: "repair.v2",
  plan: "plan.v1",
  extractClaims: "extract.v1",
  outline: "outline.v1",
  draftBrief: "draft.v1",
  reviseBrief: "revise.v1",
  answer: "answer.v1",
  domain: "domain.v1",
};

export const PATCH_SYSTEM = `You are Glossia, a compiler that turns product intent into a typed graph program.
You do not chat. You do not explain. You emit a single JSON object that matches the provided schema.
The domain is a type system: node types, ports and params are the only vocabulary you may use.
Prefer the smallest graph that satisfies the intent. Every required input port must be connected.
Never invent node types, ports or params. Never put secrets in params.`;

export function buildPatchPrompt(domain: Domain, intent: string): string {
  return `Domain:
${formatDomainContext(domain)}

User intent:
"""${intent}"""

Compile the intent into a patch for this domain.
Rules:
- version must be "2"; domainId "${domain.id}"; domainVersion "${domain.version}".
- node.type must be one of the domain node ids.
- node.id must be short, lowercase and unique (for example: q, plan, search).
- every edge needs id, from, fromPort, to, toPort; ports must exist on the connected node types.
- every required input port must have exactly one incoming edge.
- params may only use keys declared on that node type; respect types and enums.
- no cycles; bounded loops belong inside composite nodes.
- output only the JSON object, with no markdown fences and no prose.`;
}

export function buildRepairPrompt(
  domain: Domain,
  intent: string,
  raw: string,
  issues: GraphIssue[],
): string {
  return `The patch below is invalid. Fix it and return the full corrected patch.

Domain:
${formatDomainContext(domain)}

User intent:
"""${intent}"""

Invalid patch:
${raw}

Validation issues:
${formatIssues(issues)}

Rules:
- Keep everything that was already valid.
- Fix every error listed above; warnings are optional.
- Do not add new node types or params that are not in the domain.
- Output only the corrected JSON object, with no markdown fences and no prose.`;
}

export function buildPlanPrompt(question: string, maxQueries: number): string {
  return `Research question: """${question}"""
Produce at most ${maxQueries} retrieval queries that would surface the evidence needed to answer it.
Return JSON: { "queries": ["..."] }. Keep each query short and specific.`;
}

export function buildExtractPrompt(evidence: string, maxClaims: number): string {
  return `Evidence:
${evidence}

Extract at most ${maxClaims} atomic claims that help answer the research question.
Every claim must include an exact quote copied from one evidence chunk; do not paraphrase the quote.
Return JSON: { "claims": [{ "id": "c1", "text": "...", "sourceId": "S1", "quote": "...", "confidence": 0.8 }] }.
If a sentence does not support a claim, skip it. Do not invent sources.`;
}

export function buildOutlinePrompt(question: string, claims: string, sections: number): string {
  return `Research question: """${question}"""

Claims:
${claims}

Build an outline with at most ${sections} sections. Each section must reference existing claim ids.
Return JSON: { "title": "...", "sections": [{ "id": "s1", "title": "...", "claimIds": ["c1"] }] }.
Use a narrative order, not the extraction order.`;
}

export function buildDraftPrompt(
  question: string,
  outline: string,
  claims: string,
  tone: string,
): string {
  return `Research question: """${question}"""
Tone: ${tone}

Outline:
${outline}

Claims:
${claims}

Write a Markdown research brief. Rules:
- Use the outline sections as ## headings.
- Every bullet claim must end with its source marker, for example [S1].
- Do not introduce facts that are not in the claims.
- Start with a one-paragraph answer to the question.
- End with a short "Bottom line" section.
Return only Markdown.`;
}

export function buildRevisePrompt(draft: string): string {
  return `Critique and revise this research brief. Keep every citation valid and every claim traceable.

Draft:
${draft}

Return JSON: { "critique": "one or two concrete issues", "draft": "the revised Markdown" }.
Do not add facts that are not already in the draft. Improve structure and clarity, not coverage.`;
}

export function buildAnswerPrompt(question: string, style: string): string {
  return `Question: """${question}"""
Style: ${style}
Answer in Markdown. Be concrete, avoid filler, and state uncertainty when the corpus does not support a claim.`;
}

export function buildDomainPrompt(description: string): string {
  return `Create a graph domain for this product description:
"""${description}"""

Return JSON with: id, version, name, description, semantics, nodeTypes.
Each node type needs: id, name, description, category (input|llm|tool|transform|control|output),
inputs, outputs, params, executor { kind, ref }.
Ports need name, type (text|json|number|boolean|any), description.
Params need key, type (string|number|boolean|enum), description, required, optional default/enum/min/max.
Keep it small and executable: at most 8 node types.`;
}
