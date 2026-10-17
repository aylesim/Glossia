import "server-only";
import type { Domain, Patch, RunRecord, StepRecord } from "@/lib/ir/types";
import { EMPTY_USAGE } from "@/lib/ir/types";
import { formatIssues, validatePatchObject } from "@/lib/ir/analyze";
import { AppError } from "@/lib/llm/types";
import type { LlmProviderId } from "@/lib/llm/registry";
import { createAdapter } from "@/lib/llm/adapter";
import { BudgetTracker, type BudgetLimits } from "./budget";
import { globalRunCache } from "./cache";
import { executeRun } from "./executor";
import { createActiveRun, createRunId, publishEvent, saveRun } from "./store";

export type StartRunOptions = {
  patch: Patch;
  domain: Domain;
  mode: "demo" | "live";
  model?: string;
  provider?: "openai" | "openrouter";
  apiKey?: string;
  budget?: Partial<BudgetLimits>;
  concurrency?: number;
};

export async function startRun(options: StartRunOptions): Promise<RunRecord> {
  const validation = validatePatchObject(options.patch, options.domain, options.model);
  if (!validation.ok) {
    throw new AppError("GRAPH_INVALID", `The graph is not runnable:\n${formatIssues(validation.issues)}`, {
      status: 422,
      hint: "Compile again or fix the highlighted nodes.",
    });
  }

  const adapter = createAdapter({
    mode: options.mode,
    provider: options.provider,
    model: options.model,
    apiKey: options.apiKey,
  });

  const runId = createRunId();
  const steps: StepRecord[] = validation.patch.nodes.map((node) => ({
    nodeId: node.id,
    nodeType: node.type,
    status: "queued",
    attempt: 0,
    usage: { ...EMPTY_USAGE },
  }));

  const run: RunRecord = {
    id: runId,
    patch: validation.patch,
    domain: options.domain,
    domainId: options.domain.id,
    domainVersion: options.domain.version,
    mode: options.mode,
    model: adapter.model,
    status: "running",
    startedAt: new Date().toISOString(),
    steps,
    spans: [],
    usage: { ...EMPTY_USAGE },
    costUsd: 0,
  };

  const active = createActiveRun(run);
  const budget = new BudgetTracker(options.budget);
  publishEvent(run.id, { type: "run.started", mode: options.mode });

  void executeRun({
    run,
    domain: options.domain,
    patch: validation.patch,
    adapter,
    budget,
    cache: globalRunCache,
    signal: active.abort.signal,
    concurrency: options.concurrency,
  }).catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    run.status = "failed";
    run.endedAt = new Date().toISOString();
    run.error = { code: "INTERNAL", message };
    publishEvent(run.id, { type: "run.failed", error: message, code: "INTERNAL" });
    await saveRun(run);
  });

  return run;
}

export function providerFromRequest(value: unknown): "openai" | "openrouter" {
  return value === "openrouter" ? "openrouter" : "openai";
}

export function isLiveProvider(value: unknown): value is LlmProviderId {
  return value === "openai" || value === "openrouter";
}
