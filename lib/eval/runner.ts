import "server-only";
import type { EvalCaseResult, EvalReport, Patch } from "@/lib/ir/types";
import type { LlmAdapter } from "@/lib/llm/types";
import { compileIntent } from "@/lib/compiler";
import { getDomain } from "@/lib/ir/domains";
import { saveEval } from "@/lib/runtime/store";
import { EVAL_CASES, type EvalCase } from "./dataset";

export type EvalOptions = {
  mode: "demo" | "live";
  adapter: LlmAdapter;
  limit?: number;
  domainId?: string;
  cases?: EvalCase[];
};

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index] ?? 0;
}

function actualTypePairs(patch: Patch | undefined): [string, string][] {
  if (!patch) return [];
  const typeById = new Map(patch.nodes.map((node) => [node.id, node.type]));
  return patch.edges
    .map((edge) => [typeById.get(edge.from), typeById.get(edge.to)] as [string | undefined, string | undefined])
    .filter((pair): pair is [string, string] => Boolean(pair[0] && pair[1]));
}

function multisetF1(expected: [string, string][], actual: [string, string][]): number {
  const counts = (pairs: [string, string][]) => {
    const map = new Map<string, number>();
    for (const [from, to] of pairs) {
      const key = `${from}->${to}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  };
  const expectedCounts = counts(expected);
  const actualCounts = counts(actual);
  let intersection = 0;
  for (const [key, value] of expectedCounts) {
    intersection += Math.min(value, actualCounts.get(key) ?? 0);
  }
  const expectedTotal = expected.length;
  const actualTotal = actual.length;
  if (expectedTotal === 0 || actualTotal === 0 || intersection === 0) return 0;
  const precision = intersection / actualTotal;
  const recall = intersection / expectedTotal;
  return (2 * precision * recall) / (precision + recall);
}

function paramAccuracy(patch: Patch | undefined, expected: EvalCase["expectedParams"]): number {
  if (!expected || expected.length === 0) return 1;
  if (!patch) return 0;
  let matches = 0;
  for (const expectation of expected) {
    const node = patch.nodes.find((candidate) => candidate.type === expectation.nodeType);
    if (!node) continue;
    if (JSON.stringify(node.params[expectation.key]) === JSON.stringify(expectation.value)) matches += 1;
  }
  return matches / expected.length;
}

function evaluateCase(testCase: EvalCase, patch: Patch | undefined, valid: boolean, attempts: number, latencyMs: number, costUsd: number, issues: string[]): EvalCaseResult {
  const expected = [...new Set(testCase.expectedTypes)];
  const actual = [...new Set((patch?.nodes ?? []).map((node) => node.type))];
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const intersection = [...expectedSet].filter((type) => actualSet.has(type));
  const nodeRecall = expectedSet.size === 0 ? 1 : intersection.length / expectedSet.size;
  const nodePrecision = actualSet.size === 0 ? 0 : intersection.length / actualSet.size;
  const edgeF1 = testCase.expectedEdges
    ? round(multisetF1(testCase.expectedEdges, actualTypePairs(patch)))
    : null;
  const params = round(paramAccuracy(patch, testCase.expectedParams));

  return {
    id: testCase.id,
    intent: testCase.intent,
    ok: valid && nodeRecall >= 0.6,
    valid,
    nodeRecall: round(nodeRecall),
    nodePrecision: round(nodePrecision),
    edgeF1,
    paramAccuracy: params,
    attempts,
    latencyMs,
    costUsd,
    actualTypes: actual,
    missingTypes: expected.filter((type) => !actualSet.has(type)),
    extraTypes: actual.filter((type) => !expectedSet.has(type)),
    issues,
  };
}

export async function runEvalSuite(options: EvalOptions): Promise<EvalReport> {
  const domain = getDomain(options.domainId ?? "research-brief");
  if (!domain) throw new Error(`Unknown domain "${options.domainId}".`);
  const cases = (options.cases ?? EVAL_CASES).slice(0, Math.max(1, Math.min(options.limit ?? 10, 20)));
  const results: EvalCaseResult[] = [];

  for (const testCase of cases) {
    const result = await compileIntent({
      domain,
      intent: testCase.intent,
      adapter: options.adapter,
      mode: options.mode,
    });
    const errors = result.issues.filter((issue) => issue.severity === "error");
    results.push(
      evaluateCase(
        testCase,
        result.patch,
        result.ok && errors.length === 0,
        result.attempts.length,
        result.durationMs,
        result.usage.costUsd,
        errors.map((issue) => `${issue.code}: ${issue.message}`),
      ),
    );
  }

  const latencies = results.map((result) => result.latencyMs);
  const edgeScores = results.map((result) => result.edgeF1).filter((value): value is number => value !== null);
  const passed = results.filter((result) => result.ok).length;
  const report: EvalReport = {
    id: `eval_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    mode: options.mode,
    model: options.adapter.model,
    domainId: domain.id,
    cases: results,
    summary: {
      total: results.length,
      passed,
      passRate: round(results.length === 0 ? 0 : passed / results.length),
      avgNodeRecall: round(results.reduce((sum, result) => sum + result.nodeRecall, 0) / Math.max(1, results.length)),
      avgNodePrecision: round(
        results.reduce((sum, result) => sum + result.nodePrecision, 0) / Math.max(1, results.length),
      ),
      avgEdgeF1:
        edgeScores.length === 0
          ? null
          : round(edgeScores.reduce((sum, value) => sum + value, 0) / edgeScores.length),
      avgParamAccuracy: round(
        results.reduce((sum, result) => sum + result.paramAccuracy, 0) / Math.max(1, results.length),
      ),
      avgAttempts: round(results.reduce((sum, result) => sum + result.attempts, 0) / Math.max(1, results.length), 2),
      totalCostUsd: round(results.reduce((sum, result) => sum + result.costUsd, 0), 5),
      p50LatencyMs: percentile(latencies, 50),
      p95LatencyMs: percentile(latencies, 95),
    },
  };

  try {
    await saveEval(report);
  } catch {}
  return report;
}
