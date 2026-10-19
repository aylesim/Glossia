import type { Claim, Outline } from "@/lib/research/types";
import type { StoryBeat } from "@/lib/story/scene";

export const QUERIES_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["queries"],
  properties: {
    queries: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
  },
};

export const CLAIMS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["claims"],
  properties: {
    claims: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "text", "sourceId", "quote", "confidence"],
        properties: {
          id: { type: "string" },
          text: { type: "string" },
          sourceId: { type: "string" },
          quote: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
  },
};

export const OUTLINE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "sections"],
  properties: {
    title: { type: "string" },
    sections: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "claimIds"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          claimIds: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

export const REVISE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["critique", "draft"],
  properties: {
    critique: { type: "string" },
    draft: { type: "string" },
  },
};

export const STORY_BEATS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["beats"],
  properties: {
    beats: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "anchor"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          anchor: { type: "string" },
        },
      },
    },
  },
};

export const SCENE_REVISE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["critique", "scene"],
  properties: {
    critique: { type: "string" },
    scene: { type: "string" },
  },
};

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function coerceQueries(value: unknown, fallback: string): string[] {
  const record = asRecord(value);
  const raw = Array.isArray(record.queries) ? record.queries : asArray(value);
  const queries = raw
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
  return queries.length > 0 ? queries : [fallback];
}

function pickString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = asString(record[key]).trim();
    if (value) return value;
  }
  return "";
}

function coerceConfidence(value: unknown): number {
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.min(1, Math.max(0, parsed));
  }
  return Math.min(1, Math.max(0, asNumber(value, 0.7)));
}

function claimsArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  if (Array.isArray(record.claims)) return record.claims;
  const nested = asRecord(record.data);
  if (Array.isArray(nested.claims)) return nested.claims;
  const result = asRecord(record.result);
  if (Array.isArray(result.claims)) return result.claims;
  return [];
}

export function coerceClaims(value: unknown): Claim[] {
  const raw = claimsArray(value);
  const claims: Claim[] = [];
  for (const entry of raw) {
    const item = asRecord(entry);
    const text = pickString(item, ["text", "claim", "statement", "summary", "content"]);
    const sourceId = pickString(item, ["sourceId", "source_id", "source", "sourceID", "documentId"]);
    const quote = pickString(item, ["quote", "excerpt", "evidence", "passage", "citation"]);
    if (!text || !sourceId || !quote) continue;
    claims.push({
      id: asString(item.id, `c${claims.length + 1}`),
      text,
      sourceId,
      quote,
      confidence: coerceConfidence(item.confidence),
    });
  }
  return claims;
}

export function coerceOutline(value: unknown, claims: Claim[], fallbackTitle: string): Outline {
  const record = asRecord(value);
  const validIds = new Set(claims.map((claim) => claim.id));
  const rawSections = asArray(record.sections);
  const sections = rawSections
    .map((entry, index) => {
      const item = asRecord(entry);
      const claimIds = asArray(item.claimIds)
        .map((id) => asString(id))
        .filter((id) => validIds.has(id));
      return {
        id: asString(item.id, `s${index + 1}`),
        title: asString(item.title, `Section ${index + 1}`),
        claimIds,
      };
    })
    .filter((section) => section.claimIds.length > 0);

  if (sections.length === 0) {
    return {
      title: asString(record.title, fallbackTitle),
      sections: [
        {
          id: "s1",
          title: "Evidence",
          claimIds: claims.map((claim) => claim.id),
        },
      ],
    };
  }

  return {
    title: asString(record.title, fallbackTitle),
    sections,
  };
}

export function coerceDraft(value: unknown): string {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  return asString(record.draft);
}

export function coerceBeats(value: unknown, fallback: StoryBeat[]): StoryBeat[] {
  const record = asRecord(value);
  const raw = Array.isArray(record.beats) ? record.beats : asArray(value);
  const beats: StoryBeat[] = [];
  for (const entry of raw) {
    const item = asRecord(entry);
    const label = asString(item.label).trim();
    const anchor = asString(item.anchor).trim();
    if (!label || !anchor) continue;
    beats.push({
      id: asString(item.id, `b${beats.length + 1}`),
      label,
      anchor,
    });
  }
  return beats.length > 0 ? beats : fallback;
}
