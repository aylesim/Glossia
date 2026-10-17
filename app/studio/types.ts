import type { StepStatus, Usage } from "@/lib/ir/types";

export type StudioMode = "demo" | "live";

export type InspectorTab = "configure" | "run" | "trace" | "artifact";

export type StepView = {
  status: StepStatus;
  attempt: number;
  outputPreview?: string;
  ms?: number;
  usage?: Usage;
  error?: string;
  cached?: boolean;
};

export type CompileView = {
  attempts: number;
  ok: boolean;
  issues: { code: string; severity: string; message: string; nodeId?: string }[];
  diffLines: string[];
  pseudocode: string;
  durationMs: number;
  costUsd: number;
  model: string;
  demo: boolean;
  stats: { nodes: number; edges: number; depth: number; estimatedCostUsd: number };
};

export type TimelineItem = {
  nodeId: string;
  nodeType: string;
  label: string;
  status: StepStatus;
  ms: number;
  costUsd: number;
  attempt: number;
};
