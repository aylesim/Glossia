import type { Usage } from "@/lib/ir/types";
import type { LlmProviderId } from "./registry";

export type LlmTask =
  | "compile"
  | "repair"
  | "plan"
  | "extractClaims"
  | "outline"
  | "draftBrief"
  | "reviseBrief"
  | "answer"
  | "storyBeats"
  | "draftScene"
  | "reviseScene"
  | "domain"
  | "genericStep";

export type LlmRequest = {
  task: LlmTask;
  system: string;
  user: string;
  schema?: Record<string, unknown>;
  schemaName?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  /** Structured payload for the demo adapter and for trace inspection. */
  meta?: Record<string, unknown>;
};

export type LlmResponse = {
  text: string;
  parsed?: unknown;
  usage: Usage;
  model: string;
  provider: LlmProviderId;
  raw?: unknown;
};

export interface LlmAdapter {
  readonly provider: LlmProviderId;
  readonly model: string;
  generate(request: LlmRequest): Promise<LlmResponse>;
}

export class AppError extends Error {
  code: string;
  status: number;
  retryable: boolean;
  hint?: string;

  constructor(code: string, message: string, options?: { status?: number; retryable?: boolean; hint?: string }) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = options?.status ?? 500;
    this.retryable = options?.retryable ?? false;
    this.hint = options?.hint;
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const message = error instanceof Error ? error.message : String(error);
  return new AppError("INTERNAL", message, { status: 500 });
}
