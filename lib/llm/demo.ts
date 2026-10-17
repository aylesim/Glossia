import type { Domain, Patch, Usage } from "@/lib/ir/types";
import type { Claim, Evidence, Outline } from "@/lib/research/types";
import { demoAnswer, demoClaims, demoDraft, demoOutline, demoRevisedDraft } from "@/lib/research/synthesis";
import { getDomain } from "@/lib/ir/domains";
import { AppError, type LlmAdapter, type LlmRequest, type LlmResponse } from "./types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function researchPatch(question: string): Patch {
  return {
    version: "2",
    domainId: "research-brief",
    domainVersion: "2.0.0",
    nodes: [
      { id: "q", type: "input.question", params: { question } },
      { id: "plan", type: "llm.plan", params: { maxQueries: 3 } },
      { id: "search", type: "tool.search", params: { maxSources: 4, corpus: "demo" } },
      { id: "fetch", type: "tool.fetch", params: {} },
      { id: "chunk", type: "transform.chunk", params: { chunkWords: 90 } },
      { id: "retrieve", type: "transform.retrieve", params: { topK: 6 } },
      { id: "extract", type: "llm.extract", params: { maxClaims: 10 } },
      { id: "dedupe", type: "transform.dedupe", params: { similarity: 0.82 } },
      { id: "outline", type: "llm.outline", params: { sections: 3 } },
      { id: "draft", type: "llm.draft", params: { refine: true, tone: "analyst" } },
      { id: "verify", type: "verify.citations", params: { strict: true } },
      { id: "out", type: "output.brief", params: { title: "Research brief" } },
    ],
    edges: [
      { id: "e1", from: "q", fromPort: "question", to: "plan", toPort: "question" },
      { id: "e2", from: "plan", fromPort: "queries", to: "search", toPort: "queries" },
      { id: "e3", from: "search", fromPort: "sources", to: "fetch", toPort: "sources" },
      { id: "e4", from: "fetch", fromPort: "documents", to: "chunk", toPort: "documents" },
      { id: "e5", from: "chunk", fromPort: "chunks", to: "retrieve", toPort: "chunks" },
      { id: "e6", from: "plan", fromPort: "queries", to: "retrieve", toPort: "queries" },
      { id: "e7", from: "retrieve", fromPort: "evidence", to: "extract", toPort: "evidence" },
      { id: "e8", from: "extract", fromPort: "claims", to: "dedupe", toPort: "claims" },
      { id: "e9", from: "dedupe", fromPort: "claims", to: "outline", toPort: "claims" },
      { id: "e10", from: "q", fromPort: "question", to: "outline", toPort: "question" },
      { id: "e11", from: "outline", fromPort: "outline", to: "draft", toPort: "outline" },
      { id: "e12", from: "dedupe", fromPort: "claims", to: "draft", toPort: "claims" },
      { id: "e13", from: "draft", fromPort: "draft", to: "verify", toPort: "draft" },
      { id: "e14", from: "dedupe", fromPort: "claims", to: "verify", toPort: "claims" },
      { id: "e15", from: "retrieve", fromPort: "evidence", to: "verify", toPort: "evidence" },
      { id: "e16", from: "verify", fromPort: "verified", to: "out", toPort: "verified" },
      { id: "e17", from: "verify", fromPort: "report", to: "out", toPort: "report" },
      { id: "e18", from: "search", fromPort: "sources", to: "out", toPort: "sources" },
    ],
    meta: { title: "Research brief", createdBy: "llm", promptVersion: "compile.v2" },
  };
}

export function badResearchPatch(question: string): Patch {
  const patch = researchPatch(question);
  const search = patch.nodes.find((node) => node.id === "search");
  if (search) search.params = { ...search.params, max_results: 6 };
  patch.edges = patch.edges.filter((edge) => edge.id !== "e10");
  return patch;
}

export function quickPatch(question: string): Patch {
  return {
    version: "2",
    domainId: "quick-answer",
    domainVersion: "2.0.0",
    nodes: [
      { id: "q", type: "input.question", params: { question } },
      { id: "answer", type: "llm.answer", params: { style: "concise" } },
      { id: "out", type: "output.answer", params: {} },
    ],
    edges: [
      { id: "e1", from: "q", fromPort: "question", to: "answer", toPort: "question" },
      { id: "e2", from: "answer", fromPort: "answer", to: "out", toPort: "answer" },
    ],
    meta: { title: "Quick answer", createdBy: "llm", promptVersion: "compile.v2" },
  };
}

export function badQuickPatch(question: string): Patch {
  const patch = quickPatch(question);
  const answer = patch.nodes.find((node) => node.id === "answer");
  if (answer) answer.params = { ...answer.params, verbosity: "high" };
  patch.edges = patch.edges.filter((edge) => edge.id !== "e1");
  return patch;
}

export function demoPatchForDomain(domain: Domain, question: string, bad = false): Patch {
  if (domain.id === "research-brief") return bad ? badResearchPatch(question) : researchPatch(question);
  if (domain.id === "quick-answer") return bad ? badQuickPatch(question) : quickPatch(question);
  throw new AppError(
    "DEMO_DOMAIN_UNSUPPORTED",
    `Demo mode has no recorded compiler fixture for domain "${domain.id}".`,
    { status: 400, hint: "Switch to live mode or use the research-brief / quick-answer domains." },
  );
}

export function hydratePatch(patch: Patch, domain: Domain, intent: string): Patch {
  const next: Patch = JSON.parse(JSON.stringify(patch)) as Patch;
  for (const node of next.nodes) {
    if (node.type === "input.question") {
      node.params = { ...node.params, question: intent };
    }
  }
  next.meta = {
    ...next.meta,
    title: intent.length > 80 ? `${intent.slice(0, 77)}…` : intent,
  };
  if (domain.id === "research-brief") {
    const out = next.nodes.find((node) => node.type === "output.brief");
    if (out && typeof out.params.title !== "string") {
      out.params = { ...out.params, title: "Research brief" };
    }
  }
  return next;
}

function usageFor(text: string, output: string): Usage {
  return {
    inputTokens: Math.max(40, Math.round(text.length / 4)),
    outputTokens: Math.max(20, Math.round(output.length / 4)),
    costUsd: 0,
  };
}

/**
 * Demo adapter.
 *
 * It implements the exact same `LlmAdapter` interface as the live adapter, so
 * compile and runtime code paths are identical. It is a recorded fixture, not
 * a different pipeline. Live mode swaps the adapter and nothing else.
 */
export class DemoAdapter implements LlmAdapter {
  readonly provider = "demo" as const;
  readonly model = "demo/recorded";

  async generate(request: LlmRequest): Promise<LlmResponse> {
    await sleep(request.task === "compile" || request.task === "repair" ? 220 : 180);
    const meta = (request.meta ?? {}) as Record<string, unknown>;

    if (request.task === "compile" || request.task === "repair") {
      const domain = getDomain(String(meta.domainId ?? ""));
      if (!domain) {
        throw new AppError("DEMO_DOMAIN_UNSUPPORTED", `Unknown demo domain "${String(meta.domainId)}".`, {
          status: 400,
        });
      }
      const question = String(meta.question ?? "What should this workflow do?");
      const attempt = Number(meta.attempt ?? 0);
      const patch = demoPatchForDomain(domain, question, request.task === "compile" && attempt === 0);
      const text = JSON.stringify(patch, null, 2);
      return {
        text,
        parsed: patch,
        usage: usageFor(request.user, text),
        model: this.model,
        provider: this.provider,
      };
    }

    if (request.task === "plan") {
      const question = String(meta.question ?? "");
      const maxQueries = Number(meta.maxQueries ?? 3);
      const queries = [
        question,
        "How to evaluate an LLM workflow before production",
        "LLM observability traces cost and prompt versions",
        "human in the loop approval gates for AI agents",
        "prompt injection least privilege tool calling",
      ]
        .filter(Boolean)
        .slice(0, Math.max(1, maxQueries));
      const payload = { queries };
      return this.json(payload, request);
    }

    if (request.task === "extractClaims") {
      const evidence = (meta.evidence ?? []) as Evidence[];
      const maxClaims = Number(meta.maxClaims ?? 10);
      return this.json({ claims: demoClaims(evidence, maxClaims) }, request);
    }

    if (request.task === "outline") {
      const question = String(meta.question ?? "");
      const claims = (meta.claims ?? []) as Claim[];
      const sections = Number(meta.sections ?? 3);
      return this.json(demoOutline(question, claims, sections), request);
    }

    if (request.task === "draftBrief") {
      const question = String(meta.question ?? "");
      const outline = meta.outline as Outline;
      const claims = (meta.claims ?? []) as Claim[];
      const tone = (meta.tone ?? "analyst") as "analyst" | "executive" | "technical";
      return this.json(demoDraft(question, outline, claims, tone), request);
    }

    if (request.task === "reviseBrief") {
      const question = String(meta.question ?? "");
      const outline = meta.outline as Outline;
      const claims = (meta.claims ?? []) as Claim[];
      const tone = (meta.tone ?? "analyst") as "analyst" | "executive" | "technical";
      const revised = demoRevisedDraft(question, outline, claims, tone);
      return this.json({ critique: revised.critique, draft: revised.draft }, request);
    }

    if (request.task === "answer") {
      const question = String(meta.question ?? "");
      const style = (meta.style ?? "concise") as "concise" | "detailed" | "socratic";
      const text = demoAnswer(question, style);
      return {
        text,
        parsed: { answer: text },
        usage: usageFor(request.user, text),
        model: this.model,
        provider: this.provider,
      };
    }

    throw new AppError("DEMO_TASK_UNSUPPORTED", `Demo mode does not implement task "${request.task}".`);
  }

  private json(payload: unknown, request: LlmRequest): LlmResponse {
    const text = JSON.stringify(payload, null, 2);
    return {
      text,
      parsed: payload,
      usage: usageFor(request.user, text),
      model: this.model,
      provider: this.provider,
    };
  }
}
