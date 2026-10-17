import type { Usage } from "@/lib/ir/types";

export type LlmProviderId = "openai" | "openrouter" | "demo";

export type ModelInfo = {
  id: string;
  label: string;
  provider: "openai" | "openrouter";
  contextWindow: number;
  /** Approximate USD per 1M tokens. */
  inputPricePerMTok: number;
  outputPricePerMTok: number;
  tier: "planner" | "worker" | "judge";
  supportsJsonSchema: boolean;
};

export const MODELS: ModelInfo[] = [
  {
    id: "gpt-4.1-mini",
    label: "GPT-4.1 mini",
    provider: "openai",
    contextWindow: 1_000_000,
    inputPricePerMTok: 0.4,
    outputPricePerMTok: 1.6,
    tier: "worker",
    supportsJsonSchema: true,
  },
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    provider: "openai",
    contextWindow: 1_000_000,
    inputPricePerMTok: 2,
    outputPricePerMTok: 8,
    tier: "planner",
    supportsJsonSchema: true,
  },
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    provider: "openai",
    contextWindow: 128_000,
    inputPricePerMTok: 0.15,
    outputPricePerMTok: 0.6,
    tier: "worker",
    supportsJsonSchema: true,
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    provider: "openai",
    contextWindow: 128_000,
    inputPricePerMTok: 2.5,
    outputPricePerMTok: 10,
    tier: "planner",
    supportsJsonSchema: true,
  },
  {
    id: "openai/gpt-4.1-mini",
    label: "GPT-4.1 mini (OpenRouter)",
    provider: "openrouter",
    contextWindow: 1_000_000,
    inputPricePerMTok: 0.4,
    outputPricePerMTok: 1.6,
    tier: "worker",
    supportsJsonSchema: true,
  },
  {
    id: "openai/gpt-4.1",
    label: "GPT-4.1 (OpenRouter)",
    provider: "openrouter",
    contextWindow: 1_000_000,
    inputPricePerMTok: 2,
    outputPricePerMTok: 8,
    tier: "planner",
    supportsJsonSchema: true,
  },
  {
    id: "openrouter/free",
    label: "OpenRouter free router",
    provider: "openrouter",
    contextWindow: 64_000,
    inputPricePerMTok: 0,
    outputPricePerMTok: 0,
    tier: "worker",
    supportsJsonSchema: false,
  },
];

const FALLBACK: ModelInfo = {
  id: "custom",
  label: "Custom model",
  provider: "openai",
  contextWindow: 128_000,
  inputPricePerMTok: 0.5,
  outputPricePerMTok: 1.5,
  tier: "worker",
  supportsJsonSchema: false,
};

export function getModelInfo(id: string | undefined, provider?: "openai" | "openrouter"): ModelInfo {
  const found = MODELS.find((model) => model.id === id);
  if (found) return found;
  const fallbackProvider = provider ?? (id?.includes("/") ? "openrouter" : "openai");
  return { ...FALLBACK, id: id ?? FALLBACK.id, provider: fallbackProvider };
}

export function defaultModelFor(provider: "openai" | "openrouter"): string {
  if (provider === "openrouter") {
    return process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4.1-mini";
  }
  return process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
}

export function costFor(model: ModelInfo, inputTokens: number, outputTokens: number): number {
  const cost =
    (inputTokens / 1_000_000) * model.inputPricePerMTok +
    (outputTokens / 1_000_000) * model.outputPricePerMTok;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export function usageFor(model: ModelInfo, inputTokens: number, outputTokens: number): Usage {
  return {
    inputTokens,
    outputTokens,
    costUsd: costFor(model, inputTokens, outputTokens),
  };
}

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    costUsd: Math.round((a.costUsd + b.costUsd) * 1_000_000) / 1_000_000,
  };
}
