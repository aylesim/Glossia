import type { Claim, Outline } from "@/lib/research/types";

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

export function coerceClaims(value: unknown): Claim[] {
  const record = asRecord(value);
  const raw = Array.isArray(record.claims) ? record.claims : asArray(value);
  const claims: Claim[] = [];
  for (const entry of raw) {
    const item = asRecord(entry);
    const text = asString(item.text).trim();
    const sourceId = asString(item.sourceId).trim();
    const quote = asString(item.quote).trim();
    if (!text || !sourceId || !quote) continue;
    claims.push({
      id: asString(item.id, `c${claims.length + 1}`),
      text,
      sourceId,
      quote,
      confidence: Math.min(1, Math.max(0, asNumber(item.confidence, 0.7))),
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
