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
  asArray,
  asBoolean,
  asNumber,
  asRecord,
  asString,
  coerceClaims,
  coerceDraft,
  coerceOutline,
  coerceQueries,
} from "./schemas";
import type { Chunk, Claim, Evidence, Outline } from "@/lib/research/types";
import { chunkDocuments, getSource, retrieveEvidence, searchCorpus, tokenize, toDocuments } from "@/lib/research/corpus";
import { demoClaims, demoOutline, verifyClaims } from "@/lib/research/synthesis";
import {
  buildAnswerPrompt,
  buildDraftPrompt,
  buildExtractPrompt,
  buildOutlinePrompt,
  buildPlanPrompt,
  buildRevisePrompt,
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

const extractClaims: NodeExecutor = async (context) => {
  const evidence = inputArray<Evidence>(context, "evidence");
  const maxClaims = asNumber(context.params.maxClaims, 10);
  const request = (extra: string): LlmRequest => ({
    task: "extractClaims",
    system:
      "You extract atomic, evidence-backed claims. Output JSON only. Quotes must be copied verbatim from the evidence.",
    user: `${buildExtractPrompt(JSON.stringify(evidence, null, 2), maxClaims)}${extra}`,
    schema: CLAIMS_SCHEMA,
    schemaName: "claims",
    temperature: 0.1,
    maxTokens: 2_000,
    meta: { evidence, maxClaims },
  });

  let response = await context.llm(request(""));
  let claims = coerceClaims(response.parsed ?? tryParseJson(response.text));
  if (claims.length === 0) {
    response = await context.llm(
      request("\nYour previous answer had no valid claims. Return at least one claim with an exact quote."),
    );
    claims = coerceClaims(response.parsed ?? tryParseJson(response.text));
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
    verification: {
      totalClaims: 0,
      supportedClaims: 0,
      unsupportedClaims: 0,
      supportRate: 1,
      sourcesUsed: 0,
      checks: [],
    },
  };
  return { outputs: {}, artifact, preview: answerText.slice(0, 120) };
};

export const EXECUTORS: Record<string, NodeExecutor> = {
  "input.question": inputQuestion,
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
