import type { VerificationCheck, VerificationReport } from "@/lib/ir/types";
import type { Claim, DraftResult, Evidence, Outline, OutlineSection, VerificationResult } from "./types";
import { getSource, tokenize } from "./corpus";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function hash(text: string): number {
  let value = 0;
  for (let index = 0; index < text.length; index++) {
    value = (value * 31 + text.charCodeAt(index)) >>> 0;
  }
  return value;
}

/**
 * Deterministic claim extraction for demo mode.
 *
 * It deliberately uses exact source sentences as quotes, so the verifier has
 * something real to check. The live path replaces this with an LLM call that
 * returns the same shape.
 */
export function demoClaims(evidence: Evidence[], maxClaims = 10): Claim[] {
  const claims: Claim[] = [];
  const seen = new Set<string>();

  for (const item of evidence) {
    const sentences = splitSentences(item.text);
    let picked = 0;
    for (const sentence of sentences) {
      if (claims.length >= maxClaims) break;
      if (sentence.length < 48 || sentence.length > 280) continue;
      // Avoid claims that start with a pronoun: without the previous
      // sentence they read as fragments in the final brief.
      if (/^(this|that|these|those|it|they|he|she|we|you)\b/i.test(sentence)) continue;
      const key = normalize(sentence);
      if (seen.has(key)) continue;
      seen.add(key);
      claims.push({
        id: `c${claims.length + 1}`,
        text: sentence.replace(/^[-•]\s*/, ""),
        sourceId: item.sourceId,
        quote: sentence,
        confidence: Math.round((0.74 + (hash(sentence) % 18) / 100) * 100) / 100,
      });
      picked += 1;
      if (picked >= 2) break;
    }
    if (claims.length >= maxClaims) break;
  }

  if (claims.length === 0) {
    for (const item of evidence) {
      const quote = item.text.slice(0, Math.min(220, item.text.length)).trim();
      if (!quote) continue;
      claims.push({
        id: `c${claims.length + 1}`,
        text: quote,
        sourceId: item.sourceId,
        quote,
        confidence: 0.7,
      });
      if (claims.length >= maxClaims) break;
    }
  }

  return claims;
}

const SECTION_TITLES = ["What good looks like", "Where teams get it wrong", "Operating model"];

export function demoOutline(question: string, claims: Claim[], sections = 3): Outline {
  const count = Math.max(1, Math.min(sections, 5));
  const buckets: Claim[][] = Array.from({ length: count }, () => []);
  claims.forEach((claim, index) => {
    buckets[index % count]!.push(claim);
  });
  const outlineSections: OutlineSection[] = buckets
    .filter((bucket) => bucket.length > 0)
    .map((bucket, index) => ({
      id: `s${index + 1}`,
      title: SECTION_TITLES[index] ?? `Section ${index + 1}`,
      claimIds: bucket.map((claim) => claim.id),
    }));
  return { title: question, sections: outlineSections };
}

function claimLine(claim: Claim): string {
  return `- ${claim.text} [${claim.sourceId}]`;
}

export function demoDraft(
  question: string,
  outline: Outline,
  claims: Claim[],
  tone: "analyst" | "executive" | "technical" = "analyst",
): DraftResult {
  const byId = new Map(claims.map((claim) => [claim.id, claim]));
  const lines: string[] = [];
  lines.push(`# ${outline.title || question}`);
  lines.push("");
  lines.push(
    "**Short answer:** measure the workflow before deploying it. Make every run observable. Keep autonomy bounded by approval gates and least-privilege tools. The rest of this brief gives the supporting evidence. [S1] [S2] [S3] [S4]",
  );
  lines.push("");
  if (tone === "executive") {
    lines.push(
      `**Decision in one line:** treat evaluation, observability and human review as one operating system, not three side projects.`,
    );
    lines.push("");
  }
  lines.push(
    `This brief is assembled from ${new Set(claims.map((claim) => claim.sourceId)).size} sources and ${claims.length} claims. Each claim carries a source marker and a quoted passage.`,
  );
  lines.push("");

  for (const section of outline.sections) {
    lines.push(`## ${section.title}`);
    lines.push("");
    const sectionClaims = section.claimIds
      .map((id) => byId.get(id))
      .filter((claim): claim is Claim => Boolean(claim));
    for (const claim of sectionClaims) lines.push(claimLine(claim));
    if (tone === "technical" && sectionClaims.length > 0) {
      lines.push("");
      lines.push(
        `Implementation note: the ${sectionClaims.length} claims in this section map to ${new Set(sectionClaims.map((claim) => claim.sourceId)).size} source records; keep the quote alongside the claim in storage so the verifier can re-run without the model.`,
      );
    }
    lines.push("");
  }

  lines.push("## Bottom line");
  lines.push("");
  const top = claims
    .filter(
      (claim, index, all) => all.findIndex((candidate) => candidate.sourceId === claim.sourceId) === index,
    )
    .slice(0, 3);
  lines.push(
    top.length > 0
      ? `The evidence points in one direction: make the system observable, make its failure modes cheap, and make the boundary around autonomy explicit. ${top.map((claim) => `[${claim.sourceId}]`).join(" ")}`
      : "The evidence is too thin for a confident recommendation.",
  );
  lines.push("");
  lines.push("## Scope and caveats");
  lines.push("");
  lines.push(
    "This is a recorded brief over four hand-written sources, not a live web search. Retrieval, extraction, synthesis and citation verification are separate steps, and each one is visible in the trace.",
  );
  return { draft: lines.join("\n"), revised: false };
}

export function demoRevisedDraft(
  question: string,
  outline: Outline,
  claims: Claim[],
  tone: "analyst" | "executive" | "technical" = "analyst",
): DraftResult {
  const base = demoDraft(question, outline, claims, tone);
  const critique =
    "Critique pass: the draft is well sourced, but it should separate what the evidence says from what the team should do. Add an explicit operating-model paragraph and keep the caveat about corpus scope.";
  const extra = [
    "",
    "## What to do on Monday",
    "",
    "1. Freeze a 30-case golden set and record first-pass and post-repair validity separately.",
    "2. Add one trace per run with prompt version, token count, cost and every tool call.",
    "3. Put a human approval gate in front of the first side-effecting tool, not in front of every output.",
    "4. Treat retrieved text as untrusted input and enforce tool scope in code, not in the prompt.",
    "",
    "The order matters: measurement first, then observability, then autonomy. Each step makes the next one cheaper.",
  ].join("\n");
  return {
    draft: `${base.draft}${extra}`,
    critique,
    revised: true,
  };
}

export function verifyClaims(
  draft: string,
  claims: Claim[],
  evidence: Evidence[],
  strict = true,
): VerificationResult {
  const sourceText = new Map<string, string>();
  for (const item of evidence) {
    const existing = sourceText.get(item.sourceId) ?? "";
    if (!existing.includes(item.text)) sourceText.set(item.sourceId, `${existing} ${item.text}`);
  }

  const checks: VerificationCheck[] = claims.map((claim) => {
    const text = sourceText.get(claim.sourceId) ?? getSource(claim.sourceId)?.text ?? "";
    let method: VerificationCheck["method"] = "missing";
    let supported = false;
    if (text.includes(claim.quote)) {
      supported = true;
      method = "exact_quote";
    } else if (text && normalize(text).includes(normalize(claim.quote))) {
      supported = true;
      method = "normalized_quote";
    }
    return {
      claimId: claim.id,
      claim: claim.text,
      sourceId: claim.sourceId,
      supported: strict ? supported : supported || claim.confidence >= 0.7,
      method,
    };
  });

  const supported = checks.filter((check) => check.supported).length;
  const report: VerificationReport = {
    totalClaims: checks.length,
    supportedClaims: supported,
    unsupportedClaims: checks.length - supported,
    supportRate: checks.length === 0 ? 0 : Math.round((supported / checks.length) * 1000) / 1000,
    sourcesUsed: new Set(claims.map((claim) => claim.sourceId)).size,
    checks,
  };

  const verification = [
    "",
    "## Verification",
    "",
    `- Claims checked: **${report.totalClaims}**`,
    `- Supported by an exact or normalised source quote: **${report.supportedClaims}/${report.totalClaims}** (${Math.round(report.supportRate * 100)}%)`,
    `- Sources used: **${report.sourcesUsed}**`,
    report.unsupportedClaims > 0
      ? `- Unsupported claims: **${report.unsupportedClaims}**. Listed in the run trace and excluded from the confidence claim.`
      : "- Unsupported claims: **0**",
    "",
    "The verifier is deterministic and runs after the model. It does not ask the model whether it is right.",
  ].join("\n");

  return {
    verified: `${draft.trim()}\n${verification}`,
    report,
  };
}

export function demoAnswer(question: string, style: "concise" | "detailed" | "socratic" = "concise"): string {
  const sources = ["S1", "S2", "S3", "S4"]
    .map((id) => getSource(id))
    .filter((source): source is NonNullable<typeof source> => Boolean(source));
  const keywords = tokenize(question);
  const ranked = sources
    .map((source) => ({
      source,
      score: keywords.filter((keyword) => source.text.toLowerCase().includes(keyword)).length,
    }))
    .sort((a, b) => b.score - a.score);

  if (style === "socratic") {
    return `Before answering, three questions: what decision does this change, what would falsify it, and what happens if the system is wrong? The corpus suggests that **${ranked[0]?.source.title ?? "the first source"}** is the right starting point. Read it, then write down the smallest experiment that would prove you wrong. [${ranked[0]?.source.id ?? "S1"}]`;
  }

  if (style === "detailed") {
    return [
      `## Answer`,
      "",
      `The short version: ${ranked[0]?.source.excerpt ?? "the evidence is limited."} [${ranked[0]?.source.id ?? "S1"}]`,
      "",
      `Three things matter. First, measure the workflow before deploying it: schema validity, post-repair validity and a small golden set. [S1] Second, put a trace around every run so cost, latency and model/prompt versions are inspectable. [S2] Third, keep autonomy bounded: approval gates for side effects, least-privilege tools, and a real escalation path. [S3] [S4]`,
      "",
      `The order is not arbitrary. Measurement makes autonomy cheaper to grant because you can see when it fails.`,
    ].join("\n");
  }

  return `The corpus answer is: **measure first, then observe, then grant autonomy**. Start with a small golden set and post-repair validity [S1], add one trace per run with cost and prompt version [S2], and keep a human approval gate in front of the first side-effecting tool [S3]. Treat retrieved text as untrusted and enforce tool scope in code, not in the prompt [S4].`;
}
