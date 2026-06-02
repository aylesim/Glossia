import { Patch, ValidationResult } from "./schema";
import { Domain, DomainValidationResult } from "./domain";
import type { LlmProvider } from "./llm-provider";

export type GenerateMode = "full" | "pseudocode" | "json";

export type GenerateRequest = {
  prompt: string;
  mode: GenerateMode;
  pseudocode?: string;
  domain: unknown;
  openAiApiKey?: string;
  llmProvider?: LlmProvider;
  llmModel?: string;
};

export type OpenRouterModelsResponse = {
  models: { id: string; name: string }[];
  error?: string;
};

export type GenerateResponse = {
  pseudocode?: string;
  rawJson?: string;
  validation?: ValidationResult;
  patch?: Patch;
  error?: string;
};

export type DomainBootstrapRequest = {
  description: string;
  openAiApiKey?: string;
  llmProvider?: LlmProvider;
  llmModel?: string;
};

export type DomainBootstrapResponse = {
  rawJson?: string;
  validation?: DomainValidationResult;
  domain?: Domain;
  error?: string;
};
