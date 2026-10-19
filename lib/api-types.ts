import type { CompileResult, RunRecord } from "@/lib/ir/types";
import type { ModelInfo } from "@/lib/llm/registry";
import type { Domain } from "@/lib/ir/types";

export type ApiMode = "demo" | "live";
export type ApiProvider = "openai" | "openrouter" | "deepseek";

export type ApiError = {
  code: string;
  message: string;
  hint?: string;
};

export type ErrorResponse = { error: ApiError };

export type CompileRequest = {
  domainId: string;
  domainJson?: unknown;
  intent: string;
  mode: ApiMode;
  provider?: ApiProvider;
  model?: string;
  apiKey?: string;
};

export type CompileResponse = { result: CompileResult } | ErrorResponse;

export type RunRequest = {
  domainId: string;
  domainJson?: unknown;
  patch: unknown;
  mode: ApiMode;
  provider?: ApiProvider;
  model?: string;
  apiKey?: string;
  budget?: { maxUsd?: number; maxTokens?: number; maxWallMs?: number; maxSteps?: number };
};

export type RunResponse = { runId: string; run: RunRecord } | ErrorResponse;

export type RunsListResponse = {
  runs: {
    id: string;
    status: string;
    mode: string;
    model: string;
    startedAt: string;
    costUsd: number;
    domainId: string;
    title?: string;
    verification?: number;
  }[];
};

export type ModelsResponse = {
  domains: {
    id: string;
    version: string;
    name: string;
    description: string;
    nodeCount: number;
    executable: boolean;
  }[];
  models: ModelInfo[];
  defaultQuestion: string;
  demo: boolean;
};

export type DomainSummary = Pick<Domain, "id" | "version" | "name" | "description">;
