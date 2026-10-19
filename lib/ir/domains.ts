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

const openIntentNodes: NodeType[] = [
  {
    id: "input.intent",
    name: "Intent",
    description: "The user goal this workflow must accomplish.",
    category: "input",
    inputs: [],
    outputs: [port("intent", "text", "Full user intent")],
    params: [
      {
        key: "intent",
        type: "string",
        description: "What the workflow should do.",
        required: true,
        ui: "textarea",
      },
    ],
    executor: { kind: "io", ref: "input.intent" },
  },
  {
    id: "llm.task",
    name: "Task step",
    description: "One LLM step with a specific instruction (plan, draft, transform, review, etc.).",
    category: "llm",
    inputs: [
      port("intent", "text", "Original user intent"),
      port("context", "text", "Output from a previous step", { required: false }),
    ],
    outputs: [port("result", "text", "Step output")],
    params: [
      {
        key: "instruction",
        type: "string",
        description: "What this step must do.",
        required: true,
        ui: "textarea",
      },
    ],
    executor: { kind: "llm", ref: "genericTask" },
  },
  {
    id: "output.markdown",
    name: "Markdown output",
    description: "Publishes the final deliverable.",
    category: "output",
    inputs: [port("content", "text", "Final markdown")],
    outputs: [],
    params: [
      {
        key: "title",
        type: "string",
        description: "Artifact title.",
        required: false,
        default: "Result",
      },
    ],
    executor: { kind: "io", ref: "output.markdown" },
  },
];

export const OPEN_INTENT_DOMAIN: Domain = {
  id: "open-intent",
  version: "1.0.0",
  name: "Open intent",
  description: "Compile any intent into a small DAG of generic task steps, then run it.",
  semantics: `The compiler chooses how many llm.task nodes you need (usually 1–4).
Always start with input.intent wired to every task's intent port.
Chain tasks through the context port when later steps depend on earlier output.
End with exactly one output.markdown node connected to the final result.
For multimodal asks (images, video, APIs you cannot call), plan honestly in text and produce the best textual deliverable (brief, spec, prompt pack, checklist).
Never use research-only nodes (search, citations) unless the user explicitly needs a cited brief.`,
  nodeTypes: openIntentNodes,
};

const midiNodes: NodeType[] = [
  {
    id: "input.notes",
    name: "Note phrase",
    description: "Entry point: a phrase written as C4:96@0 tokens.",
    category: "input",
    inputs: [],
    outputs: [port("signal", "json", "Parsed note signal")],
    params: [
      {
        key: "phrase",
        type: "string",
        description: "Tokens like C4:96@0; start is in beats. A token without @ follows the previous one.",
        required: false,
        default:
          "C2:110@0 E4:84@0.18 G4:76@0.4 B4:66@0.62 C5:58@0.9 A4:96@1.12 F#4:104@1.38 G4:88@1.6 E4:44@1.84",
        ui: "textarea",
      },
    ],
    executor: { kind: "io", ref: "input.notes" },
  },
  {
    id: "transform.transpose",
    name: "Transpose",
    description: "Shifts every note by a number of semitones.",
    category: "transform",
    inputs: [port("signal", "json", "Note signal")],
    outputs: [port("signal", "json", "Transposed signal")],
    params: [
      {
        key: "semitones",
        type: "number",
        description: "Semitones to add; negative values transpose down.",
        required: false,
        default: 0,
        min: -24,
        max: 24,
        ui: "slider",
      },
    ],
    executor: { kind: "transform", ref: "transposeNotes" },
  },
  {
    id: "filter.pitch",
    name: "Pitch filter",
    description: "Keeps notes inside a MIDI pitch range (48 = C3, 79 = G5).",
    category: "transform",
    inputs: [port("signal", "json", "Note signal")],
    outputs: [port("signal", "json", "Filtered signal")],
    params: [
      {
        key: "minPitch",
        type: "number",
        description: "Lowest MIDI pitch to keep.",
        required: false,
        default: 48,
        min: 0,
        max: 127,
        ui: "slider",
      },
      {
        key: "maxPitch",
        type: "number",
        description: "Highest MIDI pitch to keep.",
        required: false,
        default: 79,
        min: 0,
        max: 127,
        ui: "slider",
      },
    ],
    executor: { kind: "transform", ref: "filterPitch" },
  },
  {
    id: "time.quantize",
    name: "Quantize",
    description: "Snaps note onsets to a rhythmic grid.",
    category: "transform",
    inputs: [port("signal", "json", "Note signal")],
    outputs: [port("signal", "json", "Quantized signal")],
    params: [
      {
        key: "grid",
        type: "enum",
        description: "Grid to snap onsets to.",
        required: false,
        default: "1/16",
        enum: ["1/4", "1/8", "1/16", "1/32"],
        ui: "select",
      },
    ],
    executor: { kind: "transform", ref: "quantizeNotes" },
  },
  {
    id: "velocity.dynamics",
    name: "Shape dynamics",
    description: "Scales note velocities and enforces a floor.",
    category: "transform",
    inputs: [port("signal", "json", "Note signal")],
    outputs: [port("signal", "json", "Scaled signal")],
    params: [
      {
        key: "factor",
        type: "number",
        description: "Velocity multiplier.",
        required: false,
        default: 0.75,
        min: 0.25,
        max: 1.5,
        ui: "slider",
      },
      {
        key: "floor",
        type: "number",
        description: "Minimum velocity after scaling.",
        required: false,
        default: 20,
        min: 1,
        max: 64,
        ui: "slider",
      },
    ],
    executor: { kind: "transform", ref: "shapeVelocity" },
  },
  {
    id: "output.midi",
    name: "Phrase output",
    description: "Publishes the transformed phrase and its checks.",
    category: "output",
    inputs: [port("signal", "json", "Final note signal")],
    outputs: [],
    params: [
      {
        key: "title",
        type: "string",
        description: "Artifact title.",
        required: false,
        default: "MIDI phrase",
      },
    ],
    executor: { kind: "io", ref: "output.midi" },
  },
];

export const MIDI_DOMAIN: Domain = {
  id: "midi-remix",
  version: "1.0.0",
  name: "MIDI phrase",
  description: "A deterministic note pipeline: transpose, filter, quantize, shape dynamics.",
  semantics:
    "Every node is a pure transform over a note signal. No model runs; the same analyzer, DAG scheduler, cache and artifact surface are used.",
  nodeTypes: midiNodes,
};

const storyNodes: NodeType[] = [
  {
    id: "input.premise",
    name: "Premise",
    description: "Entry point: the situation the scene must dramatise.",
    category: "input",
    inputs: [],
    outputs: [port("premise", "text", "The story premise")],
    params: [
      {
        key: "premise",
        type: "string",
        description: "One or two sentences of situation.",
        required: true,
        ui: "textarea",
      },
    ],
    executor: { kind: "io", ref: "input.premise" },
  },
  {
    id: "llm.beats",
    name: "Story beats",
    description: "Turns the premise into a small set of dramatic beats.",
    category: "llm",
    inputs: [port("premise", "text", "Story premise")],
    outputs: [port("beats", "json", "Ordered beats with concrete anchors")],
    params: [
      {
        key: "count",
        type: "number",
        description: "Number of beats.",
        required: false,
        default: 3,
        min: 2,
        max: 5,
        ui: "slider",
      },
    ],
    executor: { kind: "llm", ref: "storyBeats" },
  },
  {
    id: "llm.scene",
    name: "Draft scene",
    description: "Writes the scene, then runs a bounded critique/revise pass.",
    category: "llm",
    inputs: [
      port("premise", "text", "Story premise"),
      port("beats", "json", "Beats to dramatise"),
    ],
    outputs: [port("scene", "text", "Markdown scene")],
    params: [
      {
        key: "pov",
        type: "enum",
        description: "Narration point of view.",
        required: false,
        default: "third",
        enum: ["third", "first"],
        ui: "select",
      },
      {
        key: "refine",
        type: "boolean",
        description: "Run the internal critique/revise pass.",
        required: false,
        default: true,
        ui: "toggle",
      },
      {
        key: "maxWords",
        type: "number",
        description: "Soft word budget.",
        required: false,
        default: 220,
        min: 80,
        max: 400,
        ui: "slider",
      },
    ],
    executor: { kind: "llm", ref: "draftScene" },
  },
  {
    id: "tool.continuity",
    name: "Continuity check",
    description: "Checks word budget, point of view, beat anchors and clichés.",
    category: "tool",
    inputs: [
      port("scene", "text", "Draft scene"),
      port("beats", "json", "Beats the scene must cover"),
    ],
    outputs: [
      port("scene", "text", "Scene with the check attached"),
      port("report", "json", "Structured continuity report"),
    ],
    params: [
      {
        key: "maxWords",
        type: "number",
        description: "Word budget to enforce.",
        required: false,
        default: 220,
        min: 80,
        max: 400,
        ui: "slider",
      },
      {
        key: "pov",
        type: "enum",
        description: "Expected narration point of view.",
        required: false,
        default: "third",
        enum: ["third", "first"],
        ui: "select",
      },
    ],
    executor: { kind: "tool", ref: "checkContinuity" },
  },
  {
    id: "output.scene",
    name: "Scene output",
    description: "Publishes the scene and its continuity report.",
    category: "output",
    inputs: [
      port("scene", "text", "Checked scene"),
      port("report", "json", "Continuity report"),
    ],
    outputs: [],
    params: [
      {
        key: "title",
        type: "string",
        description: "Artifact title.",
        required: false,
        default: "Story scene",
      },
    ],
    executor: { kind: "io", ref: "output.scene" },
  },
];

export const STORY_DOMAIN: Domain = {
  id: "story-scene",
  version: "1.0.0",
  name: "Story scene",
  description: "A premise becomes beats and a scene, then a deterministic continuity pass.",
  semantics:
    "LLM nodes are probabilistic; the continuity check is deterministic. The critique/revise loop is bounded inside the scene node, so the graph stays a DAG.",
  nodeTypes: storyNodes,
};

export const DOMAINS: Domain[] = [
  OPEN_INTENT_DOMAIN,
  RESEARCH_DOMAIN,
  QUICK_ANSWER_DOMAIN,
  MIDI_DOMAIN,
  STORY_DOMAIN,
];

export const EXECUTABLE_DOMAIN_IDS = new Set(DOMAINS.map((domain) => domain.id));

export function getDomain(id: string): Domain | undefined {
  return DOMAINS.find((domain) => domain.id === id);
}

export function getDefaultDomain(): Domain {
  return OPEN_INTENT_DOMAIN;
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
