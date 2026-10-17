import type { Usage } from "@/lib/ir/types";
import { AppError } from "@/lib/llm/types";

export type BudgetLimits = {
  maxUsd: number;
  maxTokens: number;
  maxWallMs: number;
  maxSteps: number;
};

export const DEFAULT_BUDGET: BudgetLimits = {
  maxUsd: 0.25,
  maxTokens: 60_000,
  maxWallMs: 120_000,
  maxSteps: 40,
};

export class BudgetExceededError extends AppError {
  constructor(message: string, hint: string) {
    super("BUDGET_EXCEEDED", message, { status: 402, hint });
    this.name = "BudgetExceededError";
  }
}

export class BudgetTracker {
  readonly limits: BudgetLimits;
  readonly startedAt = Date.now();
  usedUsd = 0;
  usedTokens = 0;
  steps = 0;

  constructor(limits: Partial<BudgetLimits> = {}) {
    const merged: BudgetLimits = { ...DEFAULT_BUDGET };
    for (const key of ["maxUsd", "maxTokens", "maxWallMs", "maxSteps"] as const) {
      const value = limits[key];
      if (typeof value === "number" && Number.isFinite(value) && value > 0) merged[key] = value;
    }
    this.limits = merged;
  }

  check(estimatedUsd = 0) {
    if (Date.now() - this.startedAt > this.limits.maxWallMs) {
      throw new BudgetExceededError(
        `Wall-clock budget exceeded (${this.limits.maxWallMs}ms).`,
        "Raise the time budget or run a smaller graph.",
      );
    }
    if (this.steps >= this.limits.maxSteps) {
      throw new BudgetExceededError(
        `Step budget exceeded (${this.limits.maxSteps}).`,
        "Raise the step budget or reduce the graph.",
      );
    }
    if (this.usedUsd + estimatedUsd > this.limits.maxUsd) {
      throw new BudgetExceededError(
        `Cost budget exceeded ($${this.usedUsd.toFixed(3)} used, $${this.limits.maxUsd.toFixed(3)} allowed).`,
        "Raise the budget or switch to a cheaper model.",
      );
    }
    if (this.usedTokens > this.limits.maxTokens) {
      throw new BudgetExceededError(
        `Token budget exceeded (${this.usedTokens}/${this.limits.maxTokens}).`,
        "Raise the token budget or shorten the evidence.",
      );
    }
  }

  add(usage: Usage) {
    this.steps += 1;
    this.usedUsd = Math.round((this.usedUsd + usage.costUsd) * 1_000_000) / 1_000_000;
    this.usedTokens += usage.inputTokens + usage.outputTokens;
  }

  snapshot() {
    return {
      usedUsd: this.usedUsd,
      usedTokens: this.usedTokens,
      steps: this.steps,
      elapsedMs: Date.now() - this.startedAt,
      limits: this.limits,
    };
  }
}
