import type {
  Artifact,
  JsonValue,
  NodeInstance,
  NodeType,
  SourceRef,
  Span,
  VerificationReport,
} from "@/lib/ir/types";
import type { LlmAdapter, LlmRequest, LlmResponse } from "@/lib/llm/types";
import { AppError } from "@/lib/llm/types";
import type { BudgetTracker } from "./budget";
import type { RunCache } from "./cache";
import type { RunEventDraft } from "./store";
import {
  CLAIMS_SCHEMA,
  OUTLINE_SCHEMA,
  QUERIES_SCHEMA,
  REVISE_SCHEMA,
  SCENE_REVISE_SCHEMA,
  STORY_BEATS_SCHEMA,
  asArray,
  asBoolean,
  asNumber,
  asRecord,
  asString,
  coerceBeats,
  coerceClaims,
  coerceDraft,
  coerceOutline,
  coerceQueries,
} from "./schemas";
import type { Chunk, Claim, Evidence, Outline } from "@/lib/research/types";
import { chunkDocuments, getSource, retrieveEvidence, searchCorpus, tokenize, toDocuments } from "@/lib/research/corpus";
import { demoClaims, demoOutline, verifyClaims } from "@/lib/research/synthesis";
import {
  checkSignal,
  filterByPitch,
  parsePhrase,
  quantizeSignal,
  shapeVelocity,
  signalToMarkdown,
  transposeSignal,
  type MidiSignal,
} from "@/lib/midi/notes";
import {
  checkContinuity,
  demoStoryBeats,
  sceneToMarkdown,
  type ContinuityReport,
  type StoryBeat,
} from "@/lib/story/scene";
import {
  buildAnswerPrompt,
  buildBeatsPrompt,
  buildDraftPrompt,
  buildExtractPrompt,
  buildOutlinePrompt,
  buildPlanPrompt,
  buildRevisePrompt,
  buildReviseScenePrompt,
  buildScenePrompt,
} from "@/lib/llm/prompts";
import { tryParseJson } from "@/lib/llm/adapter";

export type ExecutorContext = {
  runId: string;
  node: NodeInstance;
  nodeType: NodeType;
  params: Record<string, JsonValue>;
  inputs: Record<string, JsonValue | JsonValue[] | undefined>;
  adapter: LlmAdapter;
  mode: "demo" | "live";
  signal: AbortSignal;
  budget: BudgetTracker;
  cache: RunCache;
  emit: (event: RunEventDraft) => void;
  llm: (request: LlmRequest) => Promise<LlmResponse>;
  span: <T>(name: string, kind: Span["kind"], fn: () => Promise<T>) => Promise<T>;
};

export type ExecutorResult = {
  outputs: Record<string, JsonValue | JsonValue[]>;
  artifact?: Artifact;
  preview?: string;
};

export type NodeExecutor = (context: ExecutorContext) => Promise<ExecutorResult>;

function requireInput<T>(context: ExecutorContext, port: string): T {
  const value = context.inputs[port];
  if (value === undefined) {
    throw new AppError("MISSING_INPUT", `Node "${context.node.id}" is missing input "${port}".`, {
      status: 422,
    });
  }
  return value as T;
}

function inputArray<T>(context: ExecutorContext, port: string): T[] {
  const value = context.inputs[port];
  if (Array.isArray(value)) return value as T[];
  if (value === undefined) return [];
  return [value as T];
}

function previewValue(value: unknown): string {
  if (typeof value === "string") return value.slice(0, 180);
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (value && typeof value === "object") return JSON.stringify(value).slice(0, 180);
  return String(value ?? "");
}

const inputQuestion: NodeExecutor = async (context) => {
  const question = asString(context.params.question).trim();
  if (!question) {
    throw new AppError("MISSING_PARAM", "The question param cannot be empty.", { status: 422 });
  }
  return { outputs: { question }, preview: question };
};

const inputIntent: NodeExecutor = async (context) => {
  const intent = asString(context.params.intent).trim();
  if (!intent) {
    throw new AppError("MISSING_PARAM", "The intent param cannot be empty.", { status: 422 });
  }
  return { outputs: { intent }, preview: intent.slice(0, 160) };
};

const genericTask: NodeExecutor = async (context) => {
  const instruction = asString(context.params.instruction, "Complete this step.").trim();
  const intent = requireInput<string>(context, "intent");
  const prior = asString(context.inputs.context).trim();
  const user = prior
    ? `User intent:\n${intent}\n\nPrior step output:\n${prior}\n\nThis step must:\n${instruction}`
    : `User intent:\n${intent}\n\nThis step must:\n${instruction}`;
  const response = await context.llm({
    task: "genericStep",
    system:
      "You are one step in a compiled workflow. Follow the step instruction. Output only this step's result.",
    user,
    temperature: 0.4,
    maxTokens: 2_800,
    meta: { intent, instruction, context: prior },
  });
  const text = coerceDraft(response.parsed ?? response.text) || response.text;
  return { outputs: { result: text }, preview: text.slice(0, 160) };
};

const outputMarkdown: NodeExecutor = async (context) => {
  const content = requireInput<string>(context, "content");
  const title = asString(context.params.title, "Result");
  const artifact: Artifact = {
    kind: "markdown",
    title,
    markdown: content,
    sources: [],
    checks: [
      {
        label: "deliverable present",
        detail: `${content.trim().split(/\s+/).filter(Boolean).length} words`,
        passed: content.trim().length > 0,
      },
    ],
  };
  return { outputs: {}, artifact, preview: content.slice(0, 120) };
};

const plan: NodeExecutor = async (context) => {
  const question = requireInput<string>(context, "question");
  const maxQueries = asNumber(context.params.maxQueries, 3);
  const response = await context.llm({
    task: "plan",
    system: "You produce retrieval queries. Output JSON only.",
    user: buildPlanPrompt(question, maxQueries),
    schema: QUERIES_SCHEMA,
    schemaName: "queries",
    temperature: 0.2,
    maxTokens: 500,
    meta: { question, maxQueries },
  });
  const queries = coerceQueries(response.parsed ?? tryParseJson(response.text), question);
  return { outputs: { queries: queries as JsonValue }, preview: queries.join(" · ") };
};

const search: NodeExecutor = async (context) => {
  const queries = inputArray<string>(context, "queries").filter((query) => typeof query === "string");
  const maxSources = asNumber(context.params.maxSources, 4);
  const sources = searchCorpus(queries, maxSources);
  const payload = sources.map((source) => ({
    id: source.id,
    title: source.title,
    url: source.url,
    excerpt: source.excerpt,
  }));
  return {
    outputs: { sources: payload as unknown as JsonValue },
    preview: payload.map((source) => source.id).join(", "),
  };
};

const fetchDocuments: NodeExecutor = async (context) => {
  const sources = inputArray<{ id: string }>(context, "sources");
  const documents = sources
    .map((source) => getSource(source.id))
    .filter((source): source is NonNullable<typeof source> => Boolean(source));
  return {
    outputs: { documents: toDocuments(documents) as unknown as JsonValue },
    preview: `${documents.length} documents`,
  };
};

const chunk: NodeExecutor = async (context) => {
  const documents = inputArray<{ id: string; title: string; url: string; text: string }>(context, "documents");
  const chunkWords = asNumber(context.params.chunkWords, 90);
  const chunks = chunkDocuments(documents, chunkWords);
  return {
    outputs: { chunks: chunks as unknown as JsonValue },
    preview: `${chunks.length} chunks`,
  };
};

const retrieve: NodeExecutor = async (context) => {
  const chunks = inputArray<Chunk>(context, "chunks");
  const queries = inputArray<string>(context, "queries");
  const topK = asNumber(context.params.topK, 6);
  const evidence = retrieveEvidence(chunks, queries, topK);
  return {
    outputs: { evidence: evidence as unknown as JsonValue },
    preview: `${evidence.length} evidence chunks`,
  };
};

function alignClaimSourceIds(claims: Claim[], evidence: Evidence[]): Claim[] {
  const byLower = new Map(evidence.map((item) => [item.sourceId.toLowerCase(), item.sourceId]));
  return claims.map((claim) => ({
    ...claim,
    sourceId: byLower.get(claim.sourceId.toLowerCase()) ?? claim.sourceId,
  }));
}

const extractClaims: NodeExecutor = async (context) => {
  const evidence = inputArray<Evidence>(context, "evidence");
  const maxClaims = asNumber(context.params.maxClaims, 10);
  const request = (extra: string): LlmRequest => ({
    task: "extractClaims",
    system:
      "You extract atomic, evidence-backed claims. Output JSON only. Quotes must be copied verbatim from the evidence. Use sourceId values exactly as they appear in the evidence (for example S1, S2).",
    user: `${buildExtractPrompt(JSON.stringify(evidence, null, 2), maxClaims)}${extra}`,
    schema: CLAIMS_SCHEMA,
    schemaName: "claims",
    temperature: 0.1,
    maxTokens: 2_000,
    meta: { evidence, maxClaims },
  });

  const parseClaims = (response: LlmResponse) =>
    alignClaimSourceIds(
      coerceClaims(response.parsed ?? tryParseJson(response.text)),
      evidence,
    );

  let response = await context.llm(request(""));
  let claims = parseClaims(response);
  if (claims.length === 0) {
    response = await context.llm(
      request("\nYour previous answer had no valid claims. Return at least one claim with an exact quote."),
    );
    claims = parseClaims(response);
  }
  if (claims.length === 0 && evidence.length > 0) {
    claims = demoClaims(evidence, maxClaims);
  }
  if (claims.length === 0) {
    throw new AppError("NODE_OUTPUT_INVALID", "The model returned no usable claims.", {
      status: 502,
      retryable: true,
      hint: "Try a stronger model or a smaller evidence set.",
    });
  }
  return {
    outputs: { claims: claims as unknown as JsonValue },
    preview: `${claims.length} claims`,
  };
};

function jaccard(a: string, b: string): number {
  const left = new Set(tokenize(a));
  const right = new Set(tokenize(b));
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

const dedupeClaims: NodeExecutor = async (context) => {
  const claims = inputArray<Claim>(context, "claims");
  const threshold = asNumber(context.params.similarity, 0.82);
  const kept: Claim[] = [];
  for (const claim of claims) {
    const duplicate = kept.find((candidate) => jaccard(candidate.text, claim.text) >= threshold);
    if (duplicate) {
      if (claim.confidence > duplicate.confidence) {
        duplicate.text = claim.text;
        duplicate.quote = claim.quote;
        duplicate.sourceId = claim.sourceId;
        duplicate.confidence = claim.confidence;
      }
      continue;
    }
    kept.push({ ...claim });
  }
  kept.forEach((claim, index) => {
    claim.id = `c${index + 1}`;
  });
  return {
    outputs: { claims: kept as unknown as JsonValue },
    preview: `${claims.length} → ${kept.length} claims`,
  };
};

const outline: NodeExecutor = async (context) => {
  const question = requireInput<string>(context, "question");
  const claims = inputArray<Claim>(context, "claims");
  const sections = asNumber(context.params.sections, 3);
  const response = await context.llm({
    task: "outline",
    system: "You structure evidence into a narrative outline. Output JSON only.",
    user: buildOutlinePrompt(question, JSON.stringify(claims, null, 2), sections),
    schema: OUTLINE_SCHEMA,
    schemaName: "outline",
    temperature: 0.2,
    maxTokens: 1_200,
    meta: { question, claims, sections },
  });
  const outlineValue = coerceOutline(response.parsed ?? tryParseJson(response.text), claims, question);
  return {
    outputs: { outline: outlineValue as unknown as JsonValue },
    preview: outlineValue.sections.map((section) => section.title).join(" · "),
  };
};

const draftBrief: NodeExecutor = async (context) => {
  const outlineValue = requireInput<Outline>(context, "outline");
  const claims = inputArray<Claim>(context, "claims");
  const tone = asString(context.params.tone, "analyst");
  const refine = asBoolean(context.params.refine, true);
  const question = outlineValue.title || "Research question";

  const draftResponse = await context.llm({
    task: "draftBrief",
    system: "You write evidence-grounded research briefs in Markdown. Do not invent facts.",
    user: buildDraftPrompt(question, JSON.stringify(outlineValue, null, 2), JSON.stringify(claims, null, 2), tone),
    temperature: 0.3,
    maxTokens: 3_000,
    meta: { question, outline: outlineValue, claims, tone, refine },
  });
  const draft = coerceDraft(draftResponse.parsed ?? draftResponse.text);
  if (!draft.trim()) {
    throw new AppError("NODE_OUTPUT_INVALID", "The model returned an empty draft.", {
      status: 502,
      retryable: true,
    });
  }

  let finalDraft = draft;
  if (refine) {
    try {
      const reviseResponse = await context.llm({
        task: "reviseBrief",
        system: "You are a demanding editor. You preserve citations and never add unsupported facts.",
        user: buildRevisePrompt(draft),
        schema: REVISE_SCHEMA,
        schemaName: "revised_brief",
        temperature: 0.2,
        maxTokens: 3_000,
        meta: { question, outline: outlineValue, claims, tone },
      });
      const revised = coerceDraft(reviseResponse.parsed ?? tryParseJson(reviseResponse.text));
      if (revised.trim().length > 120) finalDraft = revised;
    } catch (error) {
      // A failed polish pass must not destroy a valid draft.
      if (error instanceof AppError && error.code === "CANCELLED") throw error;
    }
  }

  return {
    outputs: { draft: finalDraft },
    preview: `${finalDraft.length} chars${refine ? " · refined" : ""}`,
  };
};

const verifyCitations: NodeExecutor = async (context) => {
  const draft = requireInput<string>(context, "draft");
  const claims = inputArray<Claim>(context, "claims");
  const evidence = inputArray<Evidence>(context, "evidence");
  const strict = asBoolean(context.params.strict, true);
  const result = verifyClaims(draft, claims, evidence, strict);
  return {
    outputs: {
      verified: result.verified,
      report: result.report as unknown as JsonValue,
    },
    preview: `${result.report.supportedClaims}/${result.report.totalClaims} supported`,
  };
};

const outputBrief: NodeExecutor = async (context) => {
  const verified = requireInput<string>(context, "verified");
  const report = requireInput<VerificationReport>(context, "report");
  const sources = inputArray<{ id: string; title: string; url: string; excerpt?: string }>(context, "sources");
  const title = asString(context.params.title, "Research brief");
  const artifact: Artifact = {
    kind: "markdown",
    title,
    markdown: verified,
    sources: sources.map(
      (source): SourceRef => ({
        id: source.id,
        title: source.title,
        url: source.url,
        excerpt: source.excerpt ?? "",
      }),
    ),
    verification: report,
  };
  return {
    outputs: {},
    artifact,
    preview: `${Math.round((report.supportRate ?? 0) * 100)}% verified`,
  };
};

const answer: NodeExecutor = async (context) => {
  const question = requireInput<string>(context, "question");
  const style = asString(context.params.style, "concise");
  const response = await context.llm({
    task: "answer",
    system: "You answer clearly and honestly. If the evidence is thin, say so.",
    user: buildAnswerPrompt(question, style),
    temperature: 0.3,
    maxTokens: 1_200,
    meta: { question, style },
  });
  const text = coerceDraft(response.parsed ?? response.text) || response.text;
  return { outputs: { answer: text }, preview: text.slice(0, 160) };
};

const outputAnswer: NodeExecutor = async (context) => {
  const answerText = requireInput<string>(context, "answer");
  const artifact: Artifact = {
    kind: "markdown",
    title: "Answer",
    markdown: answerText,
    sources: [],
    checks: [
      {
        label: "answer present",
        detail: `${answerText.trim().split(/\s+/).filter(Boolean).length} words`,
        passed: answerText.trim().length > 0,
      },
    ],
  };
  return { outputs: {}, artifact, preview: answerText.slice(0, 120) };
};

const inputNotes: NodeExecutor = async (context) => {
  const phrase = asString(context.params.phrase);
  const signal = parsePhrase(phrase);
  if (signal.notes.length === 0) {
    throw new AppError("MISSING_PARAM", "The phrase param did not contain any valid notes.", {
      status: 422,
      hint: "Use tokens like C4:96@0.",
    });
  }
  return {
    outputs: { signal: signal as unknown as JsonValue },
    preview: `${signal.notes.length} notes`,
  };
};

const transposeNotes: NodeExecutor = async (context) => {
  const signal = requireInput<MidiSignal>(context, "signal");
  const semitones = asNumber(context.params.semitones, 0);
  const next = transposeSignal(signal, semitones);
  return {
    outputs: { signal: next as unknown as JsonValue },
    preview: `${semitones > 0 ? "+" : ""}${semitones} semitones`,
  };
};

const filterPitch: NodeExecutor = async (context) => {
  const signal = requireInput<MidiSignal>(context, "signal");
  const minPitch = asNumber(context.params.minPitch, 48);
  const maxPitch = asNumber(context.params.maxPitch, 79);
  const next = filterByPitch(signal, minPitch, maxPitch);
  return {
    outputs: { signal: next as unknown as JsonValue },
    preview: `${signal.notes.length} → ${next.notes.length} notes`,
  };
};

const quantizeNotes: NodeExecutor = async (context) => {
  const signal = requireInput<MidiSignal>(context, "signal");
  const grid = asString(context.params.grid, "1/16");
  const next = quantizeSignal(signal, grid);
  return {
    outputs: { signal: next as unknown as JsonValue },
    preview: `grid ${grid}`,
  };
};

const shapeDynamics: NodeExecutor = async (context) => {
  const signal = requireInput<MidiSignal>(context, "signal");
  const factor = asNumber(context.params.factor, 0.75);
  const floor = asNumber(context.params.floor, 20);
  const next = shapeVelocity(signal, factor, floor);
  return {
    outputs: { signal: next as unknown as JsonValue },
    preview: `×${factor} · floor ${floor}`,
  };
};

const outputMidi: NodeExecutor = async (context) => {
  const signal = requireInput<MidiSignal>(context, "signal");
  const title = asString(context.params.title, "MIDI phrase");
  const checks = checkSignal(signal);
  const passed = checks.filter((check) => check.passed).length;
  const artifact: Artifact = {
    kind: "markdown",
    title,
    markdown: signalToMarkdown(signal, title),
    sources: [],
    checks,
  };
  return {
    outputs: {},
    artifact,
    preview: `${signal.notes.length} notes · ${passed}/${checks.length} checks`,
  };
};

const inputPremise: NodeExecutor = async (context) => {
  const premise = asString(context.params.premise).trim();
  if (!premise) {
    throw new AppError("MISSING_PARAM", "The premise param cannot be empty.", { status: 422 });
  }
  return { outputs: { premise }, preview: premise };
};

const storyBeats: NodeExecutor = async (context) => {
  const premise = requireInput<string>(context, "premise");
  const count = asNumber(context.params.count, 3);
  const response = await context.llm({
    task: "storyBeats",
    system: "You structure a story into concrete, filmable beats. Output JSON only.",
    user: buildBeatsPrompt(premise, count),
    schema: STORY_BEATS_SCHEMA,
    schemaName: "story_beats",
    temperature: 0.4,
    maxTokens: 700,
    meta: { premise, count },
  });
  const beats = coerceBeats(
    response.parsed ?? tryParseJson(response.text),
    demoStoryBeats(premise, count),
  );
  return {
    outputs: { beats: beats as unknown as JsonValue },
    preview: beats.map((beat) => beat.label).join(" · "),
  };
};

const draftScene: NodeExecutor = async (context) => {
  const premise = requireInput<string>(context, "premise");
  const beats = inputArray<StoryBeat>(context, "beats");
  const pov = asString(context.params.pov, "third") === "first" ? "first" : "third";
  const refine = asBoolean(context.params.refine, true);
  const maxWords = asNumber(context.params.maxWords, 220);

  const draftResponse = await context.llm({
    task: "draftScene",
    system: "You write short literary scenes. You dramatise, you do not summarise.",
    user: buildScenePrompt(premise, JSON.stringify(beats, null, 2), pov, maxWords),
    temperature: 0.6,
    maxTokens: 1_800,
    meta: { premise, beats, pov, maxWords, refine },
  });
  const draft = coerceDraft(draftResponse.parsed ?? draftResponse.text);
  if (!draft.trim()) {
    throw new AppError("NODE_OUTPUT_INVALID", "The model returned an empty scene.", {
      status: 502,
      retryable: true,
    });
  }

  let finalScene = draft;
  if (refine) {
    try {
      const reviseResponse = await context.llm({
        task: "reviseScene",
        system: "You are a demanding editor. You cut explanation and preserve the images.",
        user: buildReviseScenePrompt(draft),
        schema: SCENE_REVISE_SCHEMA,
        schemaName: "revised_scene",
        temperature: 0.3,
        maxTokens: 1_800,
        meta: { premise, beats, pov },
      });
      const parsed = reviseResponse.parsed ?? tryParseJson(reviseResponse.text);
      const revised =
        typeof parsed === "string" ? parsed.trim() : asString(asRecord(parsed).scene).trim();
      if (revised.length > 120) finalScene = revised;
    } catch (error) {
      // A failed polish pass must not destroy a valid scene.
      if (error instanceof AppError && error.code === "CANCELLED") throw error;
    }
  }

  return {
    outputs: { scene: finalScene },
    preview: `${finalScene.length} chars${refine ? " · refined" : ""}`,
  };
};

const continuityCheck: NodeExecutor = async (context) => {
  const scene = requireInput<string>(context, "scene");
  const beats = inputArray<StoryBeat>(context, "beats");
  const maxWords = asNumber(context.params.maxWords, 220);
  const pov = asString(context.params.pov, "third") === "first" ? "first" : "third";
  const report = checkContinuity(scene, beats, { maxWords, pov });
  return {
    outputs: {
      scene,
      report: report as unknown as JsonValue,
    },
    preview: `${report.passed}/${report.total} checks`,
  };
};

const outputScene: NodeExecutor = async (context) => {
  const scene = requireInput<string>(context, "scene");
  const report = requireInput<ContinuityReport>(context, "report");
  const title = asString(context.params.title, "Story scene");
  const artifact: Artifact = {
    kind: "markdown",
    title,
    markdown: sceneToMarkdown(scene, report, title),
    sources: [],
    checks: report.checks,
  };
  return {
    outputs: {},
    artifact,
    preview: `${report.passed}/${report.total} checks`,
  };
};

export const EXECUTORS: Record<string, NodeExecutor> = {
  "input.intent": inputIntent,
  "input.question": inputQuestion,
  genericTask,
  "output.markdown": outputMarkdown,
  plan,
  search,
  fetch: fetchDocuments,
  chunk,
  retrieve,
  extractClaims,
  dedupeClaims,
  outline,
  draftBrief,
  verifyCitations,
  "output.brief": outputBrief,
  answer,
  "output.answer": outputAnswer,
  "input.notes": inputNotes,
  transposeNotes,
  filterPitch,
  quantizeNotes,
  shapeVelocity: shapeDynamics,
  "output.midi": outputMidi,
  "input.premise": inputPremise,
  storyBeats,
  draftScene,
  checkContinuity: continuityCheck,
  "output.scene": outputScene,
};

export function getExecutor(ref: string): NodeExecutor | undefined {
  return EXECUTORS[ref];
}

export function executorPreview(value: unknown): string {
  return previewValue(value);
}

export function asEvidence(value: unknown): Evidence[] {
  return asArray(value).map((entry) => asRecord(entry) as unknown as Evidence);
}

export function demoClaimFallback(evidence: Evidence[], maxClaims: number): Claim[] {
  return demoClaims(evidence, maxClaims);
}

export function demoOutlineFallback(question: string, claims: Claim[], sections: number): Outline {
  return demoOutline(question, claims, sections);
}
