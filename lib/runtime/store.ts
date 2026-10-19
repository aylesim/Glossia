import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { EvalReport, RunEvent, RunRecord } from "@/lib/ir/types";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type RunEventDraft = DistributiveOmit<RunEvent, "seq" | "runId" | "at">;

type ActiveRun = {
  run: RunRecord;
  events: RunEvent[];
  listeners: Set<(event: RunEvent) => void>;
  abort: AbortController;
};

function resolveDataDir(): string {
  if (process.env.GLOSSIA_DATA_DIR) return process.env.GLOSSIA_DATA_DIR;
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join("/tmp", "glossia");
  }
  return path.join(process.cwd(), ".data");
}

const DATA_DIR = resolveDataDir();
const RUNS_DIR = path.join(DATA_DIR, "runs");
const EVAL_DIR = path.join(DATA_DIR, "eval");
// Next.js can evaluate the same module in separate route bundles. A plain
// module-level Map would give the POST route and the SSE route different views
// of the same run. Pin the active registry to globalThis so every route in the
// process shares it. (For multi-process deployments, swap this for a real
// event bus / database; the repository interface is the seam.)
const globalStore = globalThis as typeof globalThis & {
  __glossiaActiveRuns?: Map<string, ActiveRun>;
};
const activeRuns = globalStore.__glossiaActiveRuns ?? new Map<string, ActiveRun>();
globalStore.__glossiaActiveRuns = activeRuns;

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeJson(file: string, value: unknown) {
  await ensureDir(path.dirname(file));
  const temp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temp, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(temp, file);
}

export function createRunId(): string {
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createActiveRun(run: RunRecord): ActiveRun {
  const active: ActiveRun = {
    run,
    events: [],
    listeners: new Set(),
    abort: new AbortController(),
  };
  activeRuns.set(run.id, active);
  return active;
}

export function getActiveRun(runId: string): ActiveRun | undefined {
  return activeRuns.get(runId);
}

export function publishEvent(runId: string, draft: RunEventDraft): RunEvent {
  const active = activeRuns.get(runId);
  const event = {
    ...draft,
    runId,
    at: new Date().toISOString(),
    seq: (active?.events.length ?? 0) + 1,
  } as RunEvent;
  if (!active) return event;
  active.events.push(event);
  for (const listener of active.listeners) {
    try {
      listener(event);
    } catch {
      // A dead SSE client must not break the run.
    }
  }
  return event;
}

export function getRunEvents(runId: string, afterSeq = 0): RunEvent[] {
  const active = activeRuns.get(runId);
  if (!active) return [];
  return active.events.filter((event) => event.seq > afterSeq);
}

export function subscribeToRun(
  runId: string,
  afterSeq: number,
  listener: (event: RunEvent) => void,
): () => void {
  const active = activeRuns.get(runId);
  if (!active) return () => {};
  for (const event of active.events) {
    if (event.seq > afterSeq) listener(event);
  }
  active.listeners.add(listener);
  return () => active.listeners.delete(listener);
}

export function cancelRun(runId: string): boolean {
  const active = activeRuns.get(runId);
  if (!active) return false;
  active.abort.abort();
  return true;
}

export function runFilePath(runId: string): string {
  return path.join(RUNS_DIR, `${runId}.json`);
}

export async function saveRun(run: RunRecord): Promise<void> {
  await writeJson(runFilePath(run.id), run);
}

export async function loadRun(runId: string): Promise<RunRecord | undefined> {
  const active = activeRuns.get(runId);
  if (active) return active.run;
  try {
    const raw = await fs.readFile(runFilePath(runId), "utf8");
    return JSON.parse(raw) as RunRecord;
  } catch {
    return undefined;
  }
}

export async function listRuns(limit = 20): Promise<RunRecord[]> {
  const inMemory = [...activeRuns.values()].map((entry) => entry.run);
  const fromDisk: RunRecord[] = [];
  try {
    const files = await fs.readdir(RUNS_DIR);
    for (const file of files.filter((entry) => entry.endsWith(".json"))) {
      try {
        const raw = await fs.readFile(path.join(RUNS_DIR, file), "utf8");
        fromDisk.push(JSON.parse(raw) as RunRecord);
      } catch {
        // ignore a partially written run
      }
    }
  } catch {
    // no runs yet
  }
  const byId = new Map<string, RunRecord>();
  for (const run of [...fromDisk, ...inMemory]) byId.set(run.id, run);
  return [...byId.values()]
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
    .slice(0, limit);
}

export async function saveEval(report: EvalReport): Promise<void> {
  await ensureDir(EVAL_DIR);
  await writeJson(path.join(EVAL_DIR, `${report.id}.json`), report);
  await writeJson(path.join(EVAL_DIR, "latest.json"), report);
}

export async function loadLatestEval(): Promise<EvalReport | undefined> {
  try {
    const raw = await fs.readFile(path.join(EVAL_DIR, "latest.json"), "utf8");
    return JSON.parse(raw) as EvalReport;
  } catch {
    return undefined;
  }
}

export async function loadEval(id: string): Promise<EvalReport | undefined> {
  try {
    const raw = await fs.readFile(path.join(EVAL_DIR, `${id}.json`), "utf8");
    return JSON.parse(raw) as EvalReport;
  } catch {
    return undefined;
  }
}

export function activeRunCount(): number {
  return activeRuns.size;
}
