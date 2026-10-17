import type {
  Artifact,
  Domain,
  JsonValue,
  NodeType,
  Patch,
  RunRecord,
  Span,
  Usage,
} from "@/lib/ir/types";
import { EMPTY_USAGE } from "@/lib/ir/types";
import { getNodeType } from "@/lib/ir/analyze";
import { PROMPT_VERSIONS } from "@/lib/llm/prompts";
import type { LlmAdapter, LlmRequest } from "@/lib/llm/types";
import { AppError, toAppError } from "@/lib/llm/types";
import { BudgetExceededError, type BudgetTracker } from "./budget";
import type { RunCache } from "./cache";
import { getExecutor, type ExecutorContext } from "./executors";
import { publishEvent, saveRun, type RunEventDraft } from "./store";

type ExecuteOptions = {
  run: RunRecord;
  domain: Domain;
  patch: Patch;
  adapter: LlmAdapter;
  budget: BudgetTracker;
  cache: RunCache;
  signal: AbortSignal;
  concurrency?: number;
};

function addUsage(total: Usage, next: Usage): Usage {
  return {
    inputTokens: total.inputTokens + next.inputTokens,
    outputTokens: total.outputTokens + next.outputTokens,
    costUsd: Math.round((total.costUsd + next.costUsd) * 1_000_000) / 1_000_000,
  };
}

function withDefaults(type: NodeType, params: Record<string, JsonValue>): Record<string, JsonValue> {
  const resolved: Record<string, JsonValue> = {};
  for (const spec of type.params) {
    if (spec.default !== undefined) resolved[spec.key] = spec.default;
  }
  return { ...resolved, ...params };
}

function outgoingByNode(patch: Patch): Map<string, string[]> {
  const map = new Map<string, Set<string>>();
  for (const node of patch.nodes) map.set(node.id, new Set());
  for (const edge of patch.edges) {
    if (!map.has(edge.from)) map.set(edge.from, new Set());
    map.get(edge.from)!.add(edge.to);
  }
  return new Map([...map.entries()].map(([id, set]) => [id, [...set]]));
}

function predecessorCounts(patch: Patch): Map<string, number> {
  const map = new Map<string, Set<string>>();
  for (const node of patch.nodes) map.set(node.id, new Set());
  for (const edge of patch.edges) {
    if (!map.has(edge.to)) map.set(edge.to, new Set());
    map.get(edge.to)!.add(edge.from);
  }
  return new Map([...map.entries()].map(([id, set]) => [id, set.size]));
}

export async function executeRun(options: ExecuteOptions): Promise<RunRecord> {
  const { run, domain, patch, adapter, budget, cache, signal, concurrency = 4 } = options;
  const nodeById = new Map(patch.nodes.map((node) => [node.id, node]));
  const steps = new Map(run.steps.map((step) => [step.nodeId, step]));
  const outputsByNode = new Map<string, Record<string, JsonValue | JsonValue[]>>();
  const incoming = new Map<string, typeof patch.edges>();
  for (const node of patch.nodes) incoming.set(node.id, []);
  for (const edge of patch.edges) incoming.get(edge.to)?.push(edge);

  const outgoing = outgoingByNode(patch);
  const predRemaining = predecessorCounts(patch);
  const startedAt = Date.now();

  const emit = (draft: RunEventDraft) => publishEvent(run.id, draft);

  const beginSpan = (name: string, kind: Span["kind"], attributes: Record<string, JsonValue>, nodeId?: string): Span => {
    const span: Span = {
      id: `sp_${run.id}_${run.spans.length + 1}`,
      runId: run.id,
      nodeId,
      name,
      kind,
      start: new Date().toISOString(),
      status: "ok",
      attributes,
    };
    run.spans.push(span);
    return span;
  };

  const endSpan = (span: Span, status: Span["status"]) => {
    span.end = new Date().toISOString();
    span.status = status;
  };

  const runNode = async (nodeId: string): Promise<void> => {
    if (signal.aborted) throw new AppError("CANCELLED", "The run was cancelled.", { status: 499 });
    const node = nodeById.get(nodeId);
    const step = steps.get(nodeId);
    if (!node || !step) throw new AppError("GRAPH_INVALID", `Unknown node "${nodeId}".`);
    const type = getNodeType(domain, node.type);
    if (!type) throw new AppError("UNKNOWN_NODE_TYPE", `Unknown node type "${node.type}".`);

    step.status = "running";
    step.attempt += 1;
    step.startedAt = new Date().toISOString();
    emit({ type: "step.started", nodeId, nodeType: node.type, attempt: step.attempt });

    const inputs: Record<string, JsonValue | JsonValue[] | undefined> = {};
    for (const port of type.inputs) {
      const edges = (incoming.get(nodeId) ?? []).filter((edge) => edge.toPort === port.name);
      if (edges.length === 0) {
        inputs[port.name] = undefined;
        if (port.required !== false) {
          throw new AppError("MISSING_INPUT", `Node "${nodeId}" is missing input "${port.name}".`, {
            status: 422,
          });
        }
        continue;
      }
      const values = edges.map((edge) => {
        const sourceOutputs = outputsByNode.get(edge.from);
        const value = sourceOutputs?.[edge.fromPort];
        if (value === undefined) {
          throw new AppError(
            "MISSING_OUTPUT",
            `Node "${nodeId}" could not read "${edge.from}.${edge.fromPort}".`,
            { status: 422 },
          );
        }
        return value;
      });
      inputs[port.name] = port.multi ? values : values[0];
    }

    const params = withDefaults(type, node.params);
    const cacheKey = cache.key({ nodeType: node.type, params, inputs, model: adapter.model });
    const cached = cache.get(cacheKey);
    if (cached) {
      step.status = "cached";
      step.cached = true;
      step.output = cached.outputs;
      step.endedAt = new Date().toISOString();
      step.ms = 0;
      outputsByNode.set(nodeId, cached.outputs);
      if (cached.artifact) run.artifact = cached.artifact;
      emit({
        type: "step.completed",
        nodeId,
        ms: 0,
        usage: EMPTY_USAGE,
        outputPreview: previewFromOutputs(cached.outputs),
        cached: true,
      });
      return;
    }

    const executor = getExecutor(type.executor.ref);
    if (!executor) {
      throw new AppError(
        "EXECUTOR_NOT_FOUND",
        `No runtime executor for "${type.executor.ref}" (node type "${type.id}").`,
        {
          status: 422,
          hint: "This domain is compile-only. Use the research-brief or quick-answer domain, or register an executor.",
        },
      );
    }

    let nodeUsage: Usage = { ...EMPTY_USAGE };
    const nodeSpan = beginSpan(`node.${nodeId}`, "node", {
      nodeType: node.type,
      executor: type.executor.ref,
    }, nodeId);

    const context: ExecutorContext = {
      runId: run.id,
      node,
      nodeType: type,
      params,
      inputs,
      adapter,
      mode: run.mode,
      signal,
      budget,
      cache,
      emit,
      span: async (name, kind, fn) => {
        const span = beginSpan(name, kind, { nodeId }, nodeId);
        try {
          const result = await fn();
          endSpan(span, "ok");
          return result;
        } catch (error) {
          span.attributes.error = toAppError(error).message;
          endSpan(span, signal.aborted ? "cancelled" : "error");
          throw error;
        }
      },
      llm: async (request: LlmRequest) => {
        budget.check();
        const span = beginSpan(`llm.${request.task}`, "llm", {
          task: request.task,
          model: adapter.model,
          promptVersion: PROMPT_VERSIONS[request.task] ?? "unknown",
          prompt: request.user.slice(0, 240),
        }, nodeId);
        try {
          const response = await adapter.generate({ ...request, signal });
          budget.add(response.usage);
          nodeUsage = addUsage(nodeUsage, response.usage);
          run.usage = addUsage(run.usage, response.usage);
          span.attributes.inputTokens = response.usage.inputTokens;
          span.attributes.outputTokens = response.usage.outputTokens;
          span.attributes.costUsd = response.usage.costUsd;
          endSpan(span, "ok");
          return response;
        } catch (error) {
          span.attributes.error = toAppError(error).message;
          endSpan(span, signal.aborted ? "cancelled" : "error");
          throw error;
        }
      },
    };

    try {
      const result = await executor(context);
      outputsByNode.set(nodeId, result.outputs);
      step.status = "completed";
      step.output = result.outputs;
      step.usage = nodeUsage;
      step.endedAt = new Date().toISOString();
      step.ms = Math.max(0, Date.parse(step.endedAt) - Date.parse(step.startedAt!));
      cache.set(cacheKey, result.outputs, nodeUsage, result.artifact);
      if (result.artifact) run.artifact = result.artifact as Artifact;
      endSpan(nodeSpan, "ok");
      emit({
        type: "step.completed",
        nodeId,
        ms: step.ms,
        usage: nodeUsage,
        outputPreview: result.preview ?? previewFromOutputs(result.outputs),
        cached: false,
      });
    } catch (error) {
      const appError = toAppError(error);
      step.status = "failed";
      step.error = appError.message;
      step.usage = nodeUsage;
      step.endedAt = new Date().toISOString();
      endSpan(nodeSpan, signal.aborted ? "cancelled" : "error");
      emit({
        type: "step.failed",
        nodeId,
        error: appError.message,
        retryable: appError.retryable,
      });
      throw appError;
    }
  };

  try {
    const queue = patch.nodes
      .filter((node) => (predRemaining.get(node.id) ?? 0) === 0)
      .map((node) => node.id);
    let active = 0;
    let completed = 0;

    await new Promise<void>((resolve, reject) => {
      const pump = () => {
        if (signal.aborted) {
          reject(new AppError("CANCELLED", "The run was cancelled.", { status: 499 }));
          return;
        }
        if (completed === patch.nodes.length) {
          resolve();
          return;
        }
        if (active === 0 && queue.length === 0) {
          reject(new AppError("GRAPH_STALLED", "The scheduler stalled: the graph may contain a cycle.", { status: 422 }));
          return;
        }
        while (active < concurrency && queue.length > 0) {
          const id = queue.shift()!;
          active += 1;
          void runNode(id)
            .then(() => {
              active -= 1;
              completed += 1;
              for (const next of outgoing.get(id) ?? []) {
                const remaining = (predRemaining.get(next) ?? 1) - 1;
                predRemaining.set(next, remaining);
                if (remaining === 0) queue.push(next);
              }
              pump();
            })
            .catch((error) => {
              active -= 1;
              reject(error);
            });
        }
      };
      pump();
    });

    run.status = "completed";
    run.endedAt = new Date().toISOString();
    run.durationMs = Date.now() - startedAt;
    run.costUsd = run.usage.costUsd;
    emit({
      type: "run.completed",
      costUsd: run.costUsd,
      usage: run.usage,
      artifact: run.artifact,
      durationMs: run.durationMs,
    });
    await saveRun(run);
    return run;
  } catch (error) {
    const appError = toAppError(error);
    const cancelled = appError.code === "CANCELLED" || signal.aborted;
    const budgetExceeded = appError instanceof BudgetExceededError || appError.code === "BUDGET_EXCEEDED";
    run.status = cancelled ? "cancelled" : budgetExceeded ? "budget_exceeded" : "failed";
    run.endedAt = new Date().toISOString();
    run.durationMs = Date.now() - startedAt;
    run.costUsd = run.usage.costUsd;
    run.error = {
      code: appError.code,
      message: appError.message,
      hint: appError.hint,
    };
    for (const step of run.steps) {
      if (step.status === "queued") step.status = "skipped";
    }
    if (cancelled) {
      emit({ type: "run.cancelled" });
    } else {
      emit({ type: "run.failed", error: appError.message, code: appError.code });
    }
    await saveRun(run);
    return run;
  }
}

function previewFromOutputs(outputs: Record<string, JsonValue | JsonValue[]>): string {
  const first = Object.entries(outputs)[0];
  if (!first) return "done";
  const [key, value] = first;
  if (typeof value === "string") return `${key}: ${value.slice(0, 120)}`;
  if (Array.isArray(value)) return `${key}: ${value.length} items`;
  if (value && typeof value === "object") return `${key}: ${JSON.stringify(value).slice(0, 120)}`;
  return `${key}: ${String(value)}`;
}
