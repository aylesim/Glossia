/**
 * Glossia IR v2.
 *
 * The domain is the type system. The patch is a program written in it.
 * Everything the UI renders and the runtime executes derives from these types.
 */

export type PortType = "text" | "json" | "number" | "boolean" | "any";

export type Port = {
  name: string;
  type: PortType;
  description: string;
  /** Inputs are required unless explicitly optional. */
  required?: boolean;
  /** Allow multiple incoming edges; the executor receives an array. */
  multi?: boolean;
};

export type ParamType = "string" | "number" | "boolean" | "enum";

export type ParamSpec = {
  key: string;
  type: ParamType;
  description: string;
  required: boolean;
  default?: JsonValue;
  enum?: string[];
  min?: number;
  max?: number;
  ui?: "text" | "textarea" | "slider" | "select" | "toggle";
};

export type NodeCategory = "input" | "llm" | "tool" | "transform" | "control" | "output";

export type ExecutorRef = {
  kind: "llm" | "tool" | "transform" | "control" | "io";
  /** Key in the runtime executor registry. */
  ref: string;
};

export type NodeType = {
  id: string;
  name: string;
  description: string;
  category: NodeCategory;
  inputs: Port[];
  outputs: Port[];
  params: ParamSpec[];
  executor: ExecutorRef;
};

export type Domain = {
  id: string;
  version: string;
  name: string;
  description: string;
  semantics: string;
  nodeTypes: NodeType[];
};

export type NodeInstance = {
  id: string;
  type: string;
  params: Record<string, JsonValue>;
  label?: string;
  position?: { x: number; y: number };
};

export type Edge = {
  id: string;
  from: string;
  fromPort: string;
  to: string;
  toPort: string;
};

export type Patch = {
  version: "2";
  domainId: string;
  domainVersion: string;
  nodes: NodeInstance[];
  edges: Edge[];
  meta?: {
    title?: string;
    createdBy?: "llm" | "human" | "repair";
    promptVersion?: string;
  };
};

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type Usage = {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

export const EMPTY_USAGE: Usage = { inputTokens: 0, outputTokens: 0, costUsd: 0 };

export type GraphIssueFix =
  | { kind: "setParam"; nodeId: string; key: string; value: JsonValue }
  | { kind: "removeNode"; nodeId: string }
  | { kind: "removeEdge"; edgeId: string }
  | { kind: "addEdge"; from: string; fromPort: string; to: string; toPort: string };

export type GraphIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
  nodeId?: string;
  edgeId?: string;
  fix?: GraphIssueFix;
};

export type PatchStats = {
  nodes: number;
  edges: number;
  depth: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
};

export type ValidationResult =
  | { ok: true; patch: Patch; issues: GraphIssue[]; stats: PatchStats }
  | { ok: false; issues: GraphIssue[]; stats: PatchStats };

export type RunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "budget_exceeded";

export type StepStatus = "queued" | "running" | "completed" | "failed" | "cached" | "skipped";

export type StepRecord = {
  nodeId: string;
  nodeType: string;
  status: StepStatus;
  attempt: number;
  startedAt?: string;
  endedAt?: string;
  ms?: number;
  input?: Record<string, JsonValue | JsonValue[]>;
  output?: Record<string, JsonValue | JsonValue[]>;
  error?: string;
  usage: Usage;
  cached?: boolean;
};

export type Span = {
  id: string;
  runId: string;
  nodeId?: string;
  name: string;
  kind: "run" | "node" | "llm" | "tool" | "validate" | "repair";
  start: string;
  end?: string;
  status: "ok" | "error" | "cancelled";
  attributes: Record<string, JsonValue>;
  events?: { at: string; name: string; data?: JsonValue }[];
};

export type SourceRef = {
  id: string;
  title: string;
  url: string;
  excerpt: string;
};

export type VerificationCheck = {
  claimId: string;
  claim: string;
  sourceId: string;
  supported: boolean;
  method: "exact_quote" | "normalized_quote" | "missing";
};

export type VerificationReport = {
  totalClaims: number;
  supportedClaims: number;
  unsupportedClaims: number;
  supportRate: number;
  sourcesUsed: number;
  checks: VerificationCheck[];
};

export type Artifact = {
  kind: "markdown";
  title: string;
  markdown: string;
  sources: SourceRef[];
  verification: VerificationReport;
};

export type CompileAttempt = {
  attempt: number;
  raw: string;
  issues: GraphIssue[];
  usage: Usage;
  model: string;
  promptVersion: string;
  at: string;
};

export type PatchDiff = {
  addedNodes: string[];
  removedNodes: string[];
  changedParams: { nodeId: string; key: string; before?: JsonValue; after?: JsonValue }[];
  addedEdges: { from: string; fromPort: string; to: string; toPort: string }[];
  removedEdges: { from: string; fromPort: string; to: string; toPort: string }[];
};

export type CompileResult = {
  ok: boolean;
  patch?: Patch;
  domainId: string;
  pseudocode: string;
  attempts: CompileAttempt[];
  issues: GraphIssue[];
  diff?: PatchDiff;
  usage: Usage;
  model: string;
  provider: string;
  demo: boolean;
  stats: PatchStats;
  durationMs: number;
};

export type RunEvent =
  | { seq: number; type: "run.started"; runId: string; at: string; mode: "demo" | "live" }
  | { seq: number; type: "run.compiled"; runId: string; at: string; detail?: JsonValue }
  | { seq: number; type: "step.started"; runId: string; at: string; nodeId: string; nodeType: string; attempt: number }
  | { seq: number; type: "step.delta"; runId: string; at: string; nodeId: string; text: string }
  | {
      seq: number;
      type: "step.completed";
      runId: string;
      at: string;
      nodeId: string;
      ms: number;
      usage: Usage;
      outputPreview?: string;
      cached?: boolean;
    }
  | {
      seq: number;
      type: "step.failed";
      runId: string;
      at: string;
      nodeId: string;
      error: string;
      retryable: boolean;
    }
  | {
      seq: number;
      type: "run.completed";
      runId: string;
      at: string;
      costUsd: number;
      usage: Usage;
      artifact?: Artifact;
      durationMs: number;
    }
  | { seq: number; type: "run.failed"; runId: string; at: string; error: string; code: string }
  | { seq: number; type: "run.cancelled"; runId: string; at: string };

export type RunRecord = {
  id: string;
  patch: Patch;
  /** Snapshot of the domain, so an imported domain still renders on the run page. */
  domain?: Domain;
  domainId: string;
  domainVersion: string;
  mode: "demo" | "live";
  model: string;
  status: RunStatus;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  steps: StepRecord[];
  spans: Span[];
  usage: Usage;
  costUsd: number;
  artifact?: Artifact;
  error?: { code: string; message: string; hint?: string };
};

export type EvalCaseResult = {
  id: string;
  intent: string;
  ok: boolean;
  valid: boolean;
  nodeRecall: number;
  nodePrecision: number;
  edgeF1: number | null;
  paramAccuracy: number;
  attempts: number;
  latencyMs: number;
  costUsd: number;
  actualTypes: string[];
  missingTypes: string[];
  extraTypes: string[];
  issues: string[];
};

export type EvalReport = {
  id: string;
  createdAt: string;
  mode: "demo" | "live";
  model: string;
  domainId: string;
  cases: EvalCaseResult[];
  summary: {
    total: number;
    passed: number;
    passRate: number;
    avgNodeRecall: number;
    avgNodePrecision: number;
    avgEdgeF1: number | null;
    avgParamAccuracy: number;
    avgAttempts: number;
    totalCostUsd: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
  };
};
