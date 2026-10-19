import OpenAI from "openai";
import type { ChatCompletion } from "openai/resources/chat/completions";
import { AppError, type LlmAdapter, type LlmRequest, type LlmResponse } from "./types";
import { DemoAdapter } from "./demo";
import {
  defaultModelFor,
  getModelInfo,
  usageFor,
  type LiveLlmProviderId,
  type LlmProviderId,
} from "./registry";

export function extractJson(text: string): string {
  const stripped = text
    .replace(/[\s\S]*?<\/think>/gi, "")
    .replace(/^[\s\S]*?<\/think>\s*/i, "")
    .trim();
  const fenced = stripped.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start !== -1 && end > start) return stripped.slice(start, end + 1);
  return stripped.trim();
}

export function tryParseJson(text: string): unknown {
  const candidate = extractJson(text);
  try {
    return JSON.parse(candidate);
  } catch {
    return undefined;
  }
}

export function extractCompletionText(completion: ChatCompletion): string {
  const message = completion.choices[0]?.message;
  if (!message) return "";

  const content = typeof message.content === "string" ? message.content.trim() : "";
  if (content) return content;

  if (Array.isArray(message.content)) {
    const joined = message.content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
          return part.text;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();
    if (joined) return joined;
  }

  const extra = message as unknown as Record<string, unknown>;
  for (const key of ["reasoning_content", "reasoning", "text"]) {
    const value = extra[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
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

function baseUrlForProvider(provider: LiveLlmProviderId): string | undefined {
  if (provider === "openrouter") {
    return process.env.OPENROUTER_BASE_URL?.trim() || "https://openrouter.ai/api/v1";
  }
  if (provider === "deepseek") {
    return process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com/v1";
  }
  return process.env.OPENAI_BASE_URL?.trim() || undefined;
}

export class OpenAiAdapter implements LlmAdapter {
  readonly provider: LiveLlmProviderId;
  readonly model: string;
  private client: OpenAI;
  private supportsJsonSchema: boolean;

  constructor(options: { provider: LiveLlmProviderId; apiKey: string; model: string }) {
    this.provider = options.provider;
    this.model = options.model;
    const info = getModelInfo(options.model, options.provider);
    this.supportsJsonSchema = info.supportsJsonSchema;
    const baseURL = baseUrlForProvider(options.provider);
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
    const tokenBudget = request.maxTokens
      ? this.model.includes("reasoner")
        ? Math.max(request.maxTokens, 8_000)
        : request.maxTokens
      : this.model.includes("reasoner")
        ? 8_000
        : undefined;
    const base = {
      model: this.model,
      messages,
      temperature: request.temperature ?? 0.2,
      ...(tokenBudget ? { max_tokens: tokenBudget } : {}),
    };

    const call = async (
      body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
    ): Promise<ChatCompletion> => {
      try {
        return await this.client.chat.completions.create(body, { signal: request.signal });
      } catch (error) {
        throw mapProviderError(error);
      }
    };

    let completion: ChatCompletion;
    let usedStructured = false;
    if (request.schema && this.supportsJsonSchema) {
      try {
        usedStructured = true;
        completion = await call({
          ...base,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: request.schemaName ?? "glossia_output",
              schema: request.schema,
              strict: false,
            },
          },
        });
      } catch (error) {
        if (!isSchemaUnsupported(error)) throw error;
        usedStructured = true;
        completion = await call({ ...base, response_format: { type: "json_object" } });
      }
    } else if (request.schema) {
      usedStructured = true;
      completion = await call({ ...base, response_format: { type: "json_object" } });
    } else {
      completion = await call(base);
    }

    let text = extractCompletionText(completion);
    if (!text.trim() && usedStructured) {
      completion = await call(base);
      text = extractCompletionText(completion);
    }
    if (!text.trim()) {
      completion = await call({
        ...base,
        max_tokens: Math.min(16_384, (tokenBudget ?? 2_048) * 2),
      });
      text = extractCompletionText(completion);
    }
    if (!text.trim()) {
      throw new AppError("EMPTY_RESPONSE", "The provider returned an empty response.", {
        status: 502,
        retryable: true,
        hint: this.model.includes("reasoner")
          ? "Try deepseek-chat for workflow steps, or increase the run budget."
          : "Retry or switch model.",
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
  provider?: LiveLlmProviderId;
  model?: string;
  apiKey?: string;
};

function defaultProviderFromEnv(): LiveLlmProviderId {
  const configured = process.env.LLM_PROVIDER?.trim();
  if (configured === "openrouter" || configured === "deepseek" || configured === "openai") {
    return configured;
  }
  return "openai";
}

function envApiKey(provider: LiveLlmProviderId): string | undefined {
  if (provider === "openrouter") return process.env.OPENROUTER_API_KEY?.trim();
  if (provider === "deepseek") return process.env.DEEPSEEK_API_KEY?.trim();
  return process.env.OPENAI_API_KEY?.trim();
}

export function createAdapter(options: AdapterOptions): LlmAdapter {
  if (options.mode === "demo") return new DemoAdapter();
  const provider = options.provider ?? defaultProviderFromEnv();
  const model = options.model?.trim() || defaultModelFor(provider);
  const key = options.apiKey?.trim() || envApiKey(provider);
  if (!key) {
    throw new AppError("PROVIDER_AUTH", `No API key configured for ${provider}.`, {
      status: 401,
      hint: "Switch to demo mode or add a key in Settings.",
    });
  }
  return new OpenAiAdapter({ provider, apiKey: key, model });
}

export function providerForModel(model: string): LiveLlmProviderId {
  if (model.includes("/")) return "openrouter";
  if (model.startsWith("deepseek")) return "deepseek";
  return "openai";
}

export function isLlmProvider(value: unknown): value is LlmProviderId {
  return (
    value === "openai" ||
    value === "openrouter" ||
    value === "deepseek" ||
    value === "demo"
  );
}
