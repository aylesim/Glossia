import type { LlmModelOption } from "./llm-models";

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

type OpenRouterModelRecord = {
  id: string;
  name: string;
  pricing?: Record<string, string>;
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
};

type OpenRouterModelsResponse = {
  data: OpenRouterModelRecord[];
};

function isFreePricing(pricing: Record<string, string> | undefined): boolean {
  if (!pricing) return false;
  const prompt = Number.parseFloat(pricing.prompt ?? "1");
  const completion = Number.parseFloat(pricing.completion ?? "1");
  return prompt === 0 && completion === 0;
}

function isTextChatModel(model: OpenRouterModelRecord): boolean {
  const output = model.architecture?.output_modalities ?? [];
  const input = model.architecture?.input_modalities ?? [];
  return output.length === 1 && output[0] === "text" && input.includes("text");
}

export async function fetchFreeOpenRouterTextModels(): Promise<LlmModelOption[]> {
  const response = await fetch(OPENROUTER_MODELS_URL, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`OpenRouter models request failed (${response.status})`);
  }

  const payload = (await response.json()) as OpenRouterModelsResponse;
  const models = (payload.data ?? [])
    .filter((model) => isFreePricing(model.pricing) && isTextChatModel(model))
    .map((model) => ({ id: model.id, name: model.name || model.id }))
    .sort((a, b) => {
      if (a.id === "openrouter/free") return -1;
      if (b.id === "openrouter/free") return 1;
      return a.name.localeCompare(b.name);
    });

  return models;
}
