import type {
  CompileAttempt,
  CompileResult,
  Domain,
  JsonValue,
  Patch,
  PatchDiff,
  Usage,
} from "@/lib/ir/types";
import { PatchSchema, patchJsonSchema } from "@/lib/ir/schema";
import { formatIssues, validatePatch } from "@/lib/ir/analyze";
import { patchToPseudocode } from "@/lib/ir/domains";
import { diffPatches } from "@/lib/ir/diff";
import { hydratePatch } from "@/lib/llm/demo";
import { buildPatchPrompt, buildRepairPrompt, PATCH_SYSTEM, PROMPT_VERSIONS } from "@/lib/llm/prompts";
import { extractJson, tryParseJson } from "@/lib/llm/adapter";
import type { LlmAdapter } from "@/lib/llm/types";
import { AppError } from "@/lib/llm/types";

const MAX_ATTEMPTS = 2;

function addUsage(total: Usage, next: Usage): Usage {
  return {
    inputTokens: total.inputTokens + next.inputTokens,
    outputTokens: total.outputTokens + next.outputTokens,
    costUsd: Math.round((total.costUsd + next.costUsd) * 1_000_000) / 1_000_000,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Deterministic autofix for the cheap, unambiguous failures: missing envelope
 * fields, unknown params, numeric strings, duplicate edges. Semantic failures
 * (missing inputs, bad ports, cycles) are left to the model's repair pass.
 */
export function sanitizePatch(raw: unknown, domain: Domain): unknown {
  if (!isRecord(raw)) return raw;
  const next: Record<string, unknown> = { ...raw };
  next.version = "2";
  next.domainId = domain.id;
  next.domainVersion = domain.version;

  if (Array.isArray(next.nodes)) {
    next.nodes = next.nodes.map((candidate) => {
      if (!isRecord(candidate)) return candidate;
      const node: Record<string, unknown> = { ...candidate };
      const type = domain.nodeTypes.find((entry) => entry.id === node.type);
      const params = isRecord(node.params) ? { ...node.params } : {};
      if (type) {
        const specs = new Map(type.params.map((param) => [param.key, param]));
        for (const [key, value] of Object.entries(params)) {
          const spec = specs.get(key);
          if (!spec) {
            delete params[key];
            continue;
          }
          if (spec.type === "number" && typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
            params[key] = Number(value);
          }
          if (spec.type === "boolean" && typeof value === "string") {
            if (value === "true") params[key] = true;
            if (value === "false") params[key] = false;
          }
        }
      }
      node.params = params;
      return node;
    });
  }

  if (Array.isArray(next.edges)) {
    const seen = new Set<string>();
    next.edges = next.edges
      .map((candidate, index) => {
        if (!isRecord(candidate)) return candidate;
        const edge: Record<string, unknown> = { ...candidate };
        if (typeof edge.id !== "string" || edge.id.length === 0) edge.id = `e${index + 1}`;
        return edge;
      })
      .filter((candidate) => {
        if (!isRecord(candidate)) return false;
        const key = `${String(candidate.from)}:${String(candidate.fromPort)}->${String(candidate.to)}:${String(candidate.toPort)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  return next;
}

function errorCount(issues: { severity: string }[]): number {
  return issues.filter((issue) => issue.severity === "error").length;
}

export type CompileOptions = {
  domain: Domain;
  intent: string;
  adapter: LlmAdapter;
  mode: "demo" | "live";
  signal?: AbortSignal;
};

export async function compileIntent(options: CompileOptions): Promise<CompileResult> {
  const { domain, intent, adapter, mode, signal } = options;
  const started = Date.now();
  const attempts: CompileAttempt[] = [];
  let totalUsage: Usage = { inputTokens: 0, outputTokens: 0, costUsd: 0 };
  let firstParsed: Patch | undefined;
  let best: { patch?: Patch; issues: ReturnType<typeof validatePatch>["issues"]; raw: string } | undefined;

  for (let attempt = 0; attempt <= MAX_ATTEMPTS; attempt++) {
    const isRepair = attempt > 0;
    const last = attempts[attempts.length - 1];
    const system = PATCH_SYSTEM;
    const user = isRepair && last
      ? buildRepairPrompt(domain, intent, last.raw, last.issues)
      : buildPatchPrompt(domain, intent);

    const response = await adapter.generate({
      task: isRepair ? "repair" : "compile",
      system,
      user,
      schema: patchJsonSchema(domain),
      schemaName: "glossia_patch",
      temperature: 0.1,
      maxTokens: 4_000,
      signal,
      meta: { domainId: domain.id, question: intent, attempt },
    });

    totalUsage = addUsage(totalUsage, response.usage);
    const raw = extractJson(response.text);
    const parsed = response.parsed ?? tryParseJson(response.text);
    const sanitized = sanitizePatch(parsed, domain);
    const validation = validatePatch(sanitized, domain, adapter.model);

    if (attempt === 0) {
      const candidate = PatchSchema.safeParse(sanitized);
      if (candidate.success) firstParsed = hydratePatch(candidate.data, domain, intent);
    }

    attempts.push({
      attempt,
      raw,
      issues: validation.issues,
      usage: response.usage,
      model: response.model,
      promptVersion: isRepair ? PROMPT_VERSIONS.repair : PROMPT_VERSIONS.compile,
      at: new Date().toISOString(),
    });

    if (!best || errorCount(validation.issues) < errorCount(best.issues)) {
      best = {
        patch: validation.ok ? validation.patch : undefined,
        issues: validation.issues,
        raw,
      };
    }

    if (validation.ok) {
      const hydrated = hydratePatch(validation.patch, domain, intent);
      const finalValidation = validatePatch(hydrated, domain, adapter.model);
      const finalPatch = finalValidation.ok ? finalValidation.patch : hydrated;
      const diff: PatchDiff | undefined = firstParsed
        ? diffPatches(firstParsed, finalPatch)
        : undefined;
      return {
        ok: true,
        patch: finalPatch,
        domainId: domain.id,
        pseudocode: patchToPseudocode(finalPatch, domain),
        attempts,
        issues: finalValidation.issues,
        diff,
        usage: totalUsage,
        model: adapter.model,
        provider: adapter.provider,
        demo: mode === "demo",
        stats: finalValidation.stats,
        durationMs: Date.now() - started,
      };
    }
  }

  if (!best) {
    throw new AppError("COMPILE_FAILED", "The compiler produced no candidate patch.", { status: 502 });
  }

  return {
    ok: false,
    domainId: domain.id,
    pseudocode: "",
    attempts,
    issues: best.issues,
    usage: totalUsage,
    model: adapter.model,
    provider: adapter.provider,
    demo: mode === "demo",
    stats: {
      nodes: 0,
      edges: 0,
      depth: 0,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      estimatedCostUsd: 0,
    },
    durationMs: Date.now() - started,
  };
}

export function compileErrorMessage(result: CompileResult): string {
  return `Compilation failed after ${result.attempts.length} attempt(s).\n${formatIssues(result.issues)}`;
}

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function jsonParam(value: unknown): JsonValue {
  return value as JsonValue;
}
