import type { Domain, NodeType, Patch, Port } from "./types";
import { layoutPatch } from "./layout";
import { getNodeType } from "./query";

const port = (
  name: string,
  type: Port["type"],
  description: string,
  extra?: Partial<Port>,
): Port => ({ name, type, description, ...extra });

const researchNodes: NodeType[] = [
  {
    id: "input.question",
    name: "Research question",
    description: "Entry point: the question the brief must answer.",
    category: "input",
    inputs: [],
    outputs: [port("question", "text", "The research question")],
    params: [
      {
        key: "question",
        type: "string",
        description: "Question to research.",
        required: true,
        ui: "textarea",
      },
    ],
    executor: { kind: "io", ref: "input.question" },
  },
  {
    id: "llm.plan",
    name: "Plan queries",
    description: "Turns the question into retrieval queries.",
    category: "llm",
    inputs: [port("question", "text", "Research question")],
    outputs: [port("queries", "json", "String array of search queries")],
    params: [
      {
        key: "maxQueries",
        type: "number",
        description: "Maximum queries to produce.",
        required: false,
        default: 3,
        min: 1,
        max: 6,
        ui: "slider",
      },
    ],
    executor: { kind: "llm", ref: "plan" },
  },
  {
    id: "tool.search",
    name: "Search corpus",
    description: "Searches the hand-written source corpus for the planned queries.",
    category: "tool",
    inputs: [port("queries", "json", "Queries from the planner")],
    outputs: [port("sources", "json", "Matched source documents")],
    params: [
      {
        key: "maxSources",
        type: "number",
        description: "Maximum sources to return.",
        required: false,
        default: 4,
        min: 1,
        max: 6,
        ui: "slider",
      },
      {
        key: "corpus",
        type: "enum",
        description: "Source corpus to search.",
        required: false,
        default: "demo",
        enum: ["demo"],
        ui: "select",
      },
    ],
    executor: { kind: "tool", ref: "search" },
  },
  {
    id: "tool.fetch",
    name: "Fetch documents",
    description: "Materialises the full text of the selected sources.",
    category: "tool",
    inputs: [port("sources", "json", "Source references")],
    outputs: [port("documents", "json", "Full documents")],
    params: [],
    executor: { kind: "tool", ref: "fetch" },
  },
  {
    id: "transform.chunk",
    name: "Chunk documents",
    description: "Splits documents into overlapping retrieval chunks.",
    category: "transform",
    inputs: [port("documents", "json", "Documents to split")],
    outputs: [port("chunks", "json", "Text chunks with source metadata")],
    params: [
      {
        key: "chunkWords",
        type: "number",
        description: "Approximate words per chunk.",
        required: false,
        default: 90,
        min: 30,
        max: 300,
        ui: "slider",
      },
    ],
    executor: { kind: "transform", ref: "chunk" },
  },
  {
    id: "transform.retrieve",
    name: "Retrieve evidence",
    description: "Ranks chunks against the queries and keeps the best evidence.",
    category: "transform",
    inputs: [
      port("chunks", "json", "Candidate chunks"),
      port("queries", "json", "Queries to rank against"),
    ],
    outputs: [port("evidence", "json", "Top evidence chunks")],
    params: [
      {
        key: "topK",
        type: "number",
        description: "Evidence chunks to keep.",
        required: false,
        default: 6,
        min: 1,
        max: 12,
        ui: "slider",
      },
    ],
    executor: { kind: "transform", ref: "retrieve" },
  },
  {
    id: "llm.extract",
    name: "Extract claims",
    description: "Extracts atomic, cited claims from the evidence.",
    category: "llm",
    inputs: [port("evidence", "json", "Evidence chunks")],
    outputs: [port("claims", "json", "Structured claims with quotes")],
    params: [
      {
        key: "maxClaims",
        type: "number",
        description: "Maximum claims to extract.",
        required: false,
        default: 10,
        min: 2,
        max: 20,
        ui: "slider",
      },
    ],
    executor: { kind: "llm", ref: "extractClaims" },
  },
  {
    id: "transform.dedupe",
    name: "Deduplicate claims",
    description: "Removes near-duplicate claims and keeps the strongest evidence.",
    category: "transform",
    inputs: [port("claims", "json", "Raw claims")],
    outputs: [port("claims", "json", "Deduplicated claims")],
    params: [
      {
        key: "similarity",
        type: "number",
        description: "Jaccard threshold for near-duplicates.",
        required: false,
        default: 0.82,
        min: 0.5,
        max: 0.99,
        ui: "slider",
      },
    ],
    executor: { kind: "transform", ref: "dedupeClaims" },
  },
  {
    id: "llm.outline",
    name: "Outline",
    description: "Groups claims into a tight brief outline.",
    category: "llm",
    inputs: [
      port("question", "text", "Research question"),
      port("claims", "json", "Deduplicated claims"),
    ],
    outputs: [port("outline", "json", "Sections with claim ids")],
    params: [
      {
        key: "sections",
        type: "number",
        description: "Number of sections.",
        required: false,
        default: 3,
        min: 1,
        max: 5,
        ui: "slider",
      },
    ],
    executor: { kind: "llm", ref: "outline" },
  },
  {
    id: "llm.draft",
    name: "Draft brief",
    description: "Writes the brief, then runs a bounded critique/revise pass.",
    category: "llm",
    inputs: [
      port("outline", "json", "Brief outline"),
      port("claims", "json", "Evidence-backed claims"),
    ],
    outputs: [port("draft", "text", "Markdown draft")],
    params: [
      {
        key: "refine",
        type: "boolean",
        description: "Run the internal critique/revise pass.",
        required: false,
        default: true,
        ui: "toggle",
      },
      {
        key: "tone",
        type: "enum",
        description: "Voice of the brief.",
        required: false,
        default: "analyst",
        enum: ["analyst", "executive", "technical"],
        ui: "select",
      },
    ],
    executor: { kind: "llm", ref: "draftBrief" },
  },
  {
    id: "verify.citations",
    name: "Verify citations",
    description: "Checks every claim quote against the source text.",
    category: "tool",
    inputs: [
      port("draft", "text", "Draft Markdown"),
      port("claims", "json", "Claims used in the draft"),
      port("evidence", "json", "Source evidence"),
    ],
    outputs: [
      port("verified", "text", "Draft with verification report"),
      port("report", "json", "Structured verification report"),
    ],
    params: [
      {
        key: "strict",
        type: "boolean",
        description: "Flag claims whose quote is not found verbatim.",
        required: false,
        default: true,
        ui: "toggle",
      },
    ],
    executor: { kind: "tool", ref: "verifyCitations" },
  },
  {
    id: "output.brief",
    name: "Brief output",
    description: "Publishes the final artifact.",
    category: "output",
    inputs: [
      port("verified", "text", "Verified draft"),
      port("report", "json", "Verification report"),
      port("sources", "json", "Source references for the artifact"),
    ],
    outputs: [],
    params: [
      {
        key: "title",
        type: "string",
        description: "Artifact title.",
        required: false,
        default: "Research brief",
      },
    ],
    executor: { kind: "io", ref: "output.brief" },
  },
];

export const RESEARCH_DOMAIN: Domain = {
  id: "research-brief",
  version: "2.0.0",
  name: "Research brief",
  description: "A cited brief built from a hand-written source corpus.",
  semantics:
    "Nodes are executable. LLM nodes are probabilistic; verification and analysis are deterministic. Loops are bounded inside composite nodes, so the graph stays a DAG.",
  nodeTypes: researchNodes,
};

const quickNodes: NodeType[] = [
  {
    id: "input.question",
    name: "Question",
    description: "Entry point.",
    category: "input",
    inputs: [],
    outputs: [port("question", "text", "Question")],
    params: [
      {
        key: "question",
        type: "string",
        description: "Question to answer.",
        required: true,
        ui: "textarea",
      },
    ],
    executor: { kind: "io", ref: "input.question" },
  },
  {
    id: "llm.answer",
    name: "Answer",
    description: "Answers the question with a single LLM call.",
    category: "llm",
    inputs: [port("question", "text", "Question")],
    outputs: [port("answer", "text", "Answer")],
    params: [
      {
        key: "style",
        type: "enum",
        description: "Answer style.",
        required: false,
        default: "concise",
        enum: ["concise", "detailed", "socratic"],
        ui: "select",
      },
    ],
    executor: { kind: "llm", ref: "answer" },
  },
  {
    id: "output.answer",
    name: "Answer output",
    description: "Publishes the answer.",
    category: "output",
    inputs: [port("answer", "text", "Answer")],
    outputs: [],
    params: [],
    executor: { kind: "io", ref: "output.answer" },
  },
];

export const QUICK_ANSWER_DOMAIN: Domain = {
  id: "quick-answer",
  version: "2.0.0",
  name: "Quick answer",
  description: "A minimal three-node domain that proves the engine is not hard-wired to research.",
  semantics: "One LLM call, one output. Useful as a smoke test and as a template.",
  nodeTypes: quickNodes,
};

export const DOMAINS: Domain[] = [RESEARCH_DOMAIN, QUICK_ANSWER_DOMAIN];

export const EXECUTABLE_DOMAIN_IDS = new Set(DOMAINS.map((domain) => domain.id));

export function getDomain(id: string): Domain | undefined {
  return DOMAINS.find((domain) => domain.id === id);
}

export function getDefaultDomain(): Domain {
  return RESEARCH_DOMAIN;
}

export function formatDomainContext(domain: Domain): string {
  const lines = [
    `Domain: ${domain.name} (${domain.id} v${domain.version})`,
    domain.description,
    `Semantics: ${domain.semantics}`,
    "",
    "Node types:",
  ];
  for (const node of domain.nodeTypes) {
    lines.push(`- ${node.id}: ${node.name}. ${node.description}`);
    lines.push(
      `  inputs: ${node.inputs.length === 0 ? "none" : node.inputs.map((input) => `${input.name}:${input.type}${input.required === false ? "?" : ""}${input.multi ? "[]" : ""}`).join(", ")}`,
    );
    lines.push(
      `  outputs: ${node.outputs.length === 0 ? "none" : node.outputs.map((output) => `${output.name}:${output.type}`).join(", ")}`,
    );
    lines.push(
      `  params: ${node.params.length === 0 ? "none" : node.params.map((param) => `${param.key}:${param.type}${param.required ? "!" : ""}${param.default !== undefined ? `=${JSON.stringify(param.default)}` : ""}`).join(", ")}`,
    );
  }
  return lines.join("\n");
}

export function patchToPseudocode(patch: Patch, domain: Domain): string {
  const positions = layoutPatch(patch);
  const ordered = [...patch.nodes].sort((a, b) => {
    const pa = positions[a.id] ?? { x: 0, y: 0 };
    const pb = positions[b.id] ?? { x: 0, y: 0 };
    return pa.x - pb.x || pa.y - pb.y;
  });
  const lines = ordered.map((node, index) => {
    const type = getNodeType(domain, node.type);
    const params = Object.entries(node.params)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(", ");
    return `${String(index + 1).padStart(2, "0")}. ${node.id}: ${type?.name ?? node.type}${params ? ` (${params})` : ""}`;
  });
  const edgeLines = patch.edges.map(
    (edge) => `    ${edge.from}.${edge.fromPort} → ${edge.to}.${edge.toPort}`,
  );
  return [...lines, "", "data flow:", ...edgeLines].join("\n");
}

export function patchTitle(patch: Patch): string {
  return patch.meta?.title ?? patch.nodes.find((node) => node.id === "out")?.params.title?.toString() ?? "Workflow";
}
