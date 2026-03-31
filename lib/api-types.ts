import { Patch, ValidationResult } from "./schema";
import { Domain, DomainValidationResult } from "./domain";

export type GenerateMode = "full" | "pseudocode" | "json";

export type GenerateRequest = {
  prompt: string;
  mode: GenerateMode;
  pseudocode?: string;
  domain: unknown;
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
};

export type DomainBootstrapResponse = {
  rawJson?: string;
  validation?: DomainValidationResult;
  domain?: Domain;
  error?: string;
};
