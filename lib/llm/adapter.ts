import OpenAI from "openai";
import type { ChatCompletion } from "openai/resources/chat/completions";
import { AppError, type LlmAdapter, type LlmRequest, type LlmResponse } from "./types";
import { DemoAdapter } from "./demo";
import { defaultModelFor, getModelInfo, usageFor, type LlmProviderId } from "./registry";

export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

export function tryParseJson(text: string): unknown {
  const candidate = extractJson(text);
  try {
    return JSON.parse(candidate);
  } catch {
    return undefined;
  }
}

function isSchemaUnsupported(error: unknown): boolean {
  if (!(error instanceof OpenAI.APIError)) return false;
  if (![400, 404, 422].includes(error.status)) return false;
  const message = `${error.message} ${JSON.stringify(error.error ?? {})}`.toLowerCase();
  return (
    message.includes("response_format") ||
    message.includes("json_schema") ||
    message.includes("json schema") ||
    message.includes("unsupported") ||
    message.includes("not supported")
  );
}

function mapProviderError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401 || error.status === 403) {
      return new AppError("PROVIDER_AUTH", "The provider rejected the API key.", {
        status: 401,
        hint: "Check the key in Settings, or use demo mode.",
      });
    }
    if (error.status === 429) {
      return new AppError("PROVIDER_RATE_LIMIT", "The provider is rate-limiting this key.", {
        status: 429,
        retryable: true,
        hint: "Retry in a moment or switch to a smaller model.",
      });
    }
    if (error.status === 408 || error.status >= 500) {
      return new AppError("PROVIDER_UNAVAILABLE", "The provider is unavailable right now.", {
        status: 503,
        retryable: true,
      });
    }
    return new AppError("PROVIDER_ERROR", error.message, { status: error.status ?? 500 });
  }
  if (error instanceof Error && error.name === "AbortError") {
    return new AppError("CANCELLED", "The request was cancelled.", { status: 499 });
  }
  return new AppError("PROVIDER_ERROR", error instanceof Error ? error.message : String(error), {
    status: 500,
  });
}

export class OpenAiAdapter implements LlmAdapter {
  readonly provider: "openai" | "openrouter";
  readonly model: string;
  private client: OpenAI;
  private supportsJsonSchema: boolean;

  constructor(options: { provider: "openai" | "openrouter"; apiKey: string; model: string }) {
    this.provider = options.provider;
    this.model = options.model;
    const info = getModelInfo(options.model, options.provider);
    this.supportsJsonSchema = info.supportsJsonSchema;
    const baseURL =
      options.provider === "openrouter"
        ? process.env.OPENROUTER_BASE_URL?.trim() || "https://openrouter.ai/api/v1"
        : process.env.OPENAI_BASE_URL?.trim() || undefined;
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL,
      defaultHeaders:
        options.provider === "openrouter"
          ? {
              Authorization: `Bearer ${options.apiKey}`,
              ...(process.env.OPENROUTER_HTTP_REFERER
                ? { "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER }
                : {}),
              "X-Title": process.env.OPENROUTER_APP_TITLE?.trim() || "Glossia",
            }
          : undefined,
    });
  }

  async generate(request: LlmRequest): Promise<LlmResponse> {
    const messages = [
      { role: "system" as const, content: request.system },
      { role: "user" as const, content: request.user },
    ];
    const base = {
      model: this.model,
      messages,
      temperature: request.temperature ?? 0.2,
      ...(request.maxTokens ? { max_tokens: request.maxTokens } : {}),
    };

    let completion: ChatCompletion;
    try {
      if (request.schema && this.supportsJsonSchema) {
        try {
          completion = await this.client.chat.completions.create(
            {
              ...base,
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: request.schemaName ?? "glossia_output",
                  schema: request.schema,
                  strict: false,
                },
              },
            },
            { signal: request.signal },
          );
        } catch (error) {
          if (!isSchemaUnsupported(error)) throw error;
          completion = await this.client.chat.completions.create(base, { signal: request.signal });
        }
      } else {
        completion = await this.client.chat.completions.create(base, { signal: request.signal });
      }
    } catch (error) {
      throw mapProviderError(error);
    }

    const text = completion.choices[0]?.message?.content ?? "";
    if (!text.trim()) {
      throw new AppError("EMPTY_RESPONSE", "The provider returned an empty response.", {
        status: 502,
        retryable: true,
      });
    }
    const usage = completion.usage;
    const inputTokens = usage?.prompt_tokens ?? Math.ceil(request.user.length / 4);
    const outputTokens = usage?.completion_tokens ?? Math.ceil(text.length / 4);

    return {
      text,
      parsed: request.schema ? tryParseJson(text) : undefined,
      usage: usageFor(getModelInfo(this.model, this.provider), inputTokens, outputTokens),
      model: this.model,
      provider: this.provider,
      raw: completion,
    };
  }
}

export type AdapterOptions = {
  mode: "demo" | "live";
  provider?: "openai" | "openrouter";
  model?: string;
  apiKey?: string;
};

export function createAdapter(options: AdapterOptions): LlmAdapter {
  if (options.mode === "demo") return new DemoAdapter();
  const provider = options.provider ?? (process.env.LLM_PROVIDER === "openrouter" ? "openrouter" : "openai");
  const model = options.model?.trim() || defaultModelFor(provider);
  const key =
    options.apiKey?.trim() ||
    (provider === "openrouter"
      ? process.env.OPENROUTER_API_KEY?.trim()
      : process.env.OPENAI_API_KEY?.trim());
  if (!key) {
    throw new AppError("PROVIDER_AUTH", `No API key configured for ${provider}.`, {
      status: 401,
      hint: "Switch to demo mode or add a key in Settings.",
    });
  }
  return new OpenAiAdapter({ provider, apiKey: key, model });
}

export function providerForModel(model: string): "openai" | "openrouter" {
  return model.includes("/") ? "openrouter" : "openai";
}

export function isLlmProvider(value: unknown): value is LlmProviderId {
  return value === "openai" || value === "openrouter" || value === "demo";
}
