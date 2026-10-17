import { createHash } from "node:crypto";
import type { Artifact, JsonValue, Usage } from "@/lib/ir/types";

export type CacheEntry = {
  outputs: Record<string, JsonValue | JsonValue[]>;
  usage: Usage;
  artifact?: Artifact;
  createdAt: string;
};

/**
 * Content-addressed cache. Key = executor identity + params + resolved inputs.
 * An edit to one node invalidates that node and its downstream, while upstream
 * steps keep hitting the cache. This is what makes "re-run only what changed"
 * visible in the demo.
 */
// Bump when prompts, executor semantics or output shapes change. In a larger
// system this would be a prompt/executor content hash.
const CACHE_VERSION = "2026-10-18.1";

export class RunCache {
  private entries = new Map<string, CacheEntry>();
  private hits = 0;

  key(parts: {
    nodeType: string;
    params: Record<string, JsonValue>;
    inputs: Record<string, JsonValue | JsonValue[] | undefined>;
    model: string;
  }): string {
    const payload = JSON.stringify({
      cacheVersion: CACHE_VERSION,
      nodeType: parts.nodeType,
      params: sortRecord(parts.params),
      inputs: sortRecord(parts.inputs as Record<string, JsonValue | undefined>),
      model: parts.model,
    });
    return createHash("sha256").update(payload).digest("hex").slice(0, 32);
  }

  get(key: string): CacheEntry | undefined {
    const entry = this.entries.get(key);
    if (entry) this.hits += 1;
    return entry;
  }

  set(key: string, outputs: Record<string, JsonValue | JsonValue[]>, usage: Usage, artifact?: Artifact) {
    this.entries.set(key, {
      outputs,
      usage,
      artifact,
      createdAt: new Date().toISOString(),
    });
  }

  get hitCount() {
    return this.hits;
  }

  get size() {
    return this.entries.size;
  }
}

function sortRecord<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));
}

const globalCache = globalThis as typeof globalThis & {
  __glossiaRunCache?: RunCache;
};
export const globalRunCache = globalCache.__glossiaRunCache ?? new RunCache();
globalCache.__glossiaRunCache = globalRunCache;
