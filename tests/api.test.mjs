import test from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";

async function request(path, init) {
  const response = await fetch(`${BASE}${path}`, init);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  return { status: response.status, body };
}

async function compile(intent, mode = "demo", domainId = "research-brief") {
  return request("/api/compile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent, mode, domainId }),
  });
}

async function startRun(patch, mode = "demo", domainId = "research-brief", budget) {
  return request("/api/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patch, mode, domainId, budget }),
  });
}

const TERMINAL = new Set(["completed", "failed", "cancelled", "budget_exceeded"]);

async function waitForRun(runId, timeoutMs = 20_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { status, body } = await request(`/api/runs/${runId}`);
    if (status === 200 && body.run && TERMINAL.has(body.run.status)) return body.run;
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`run ${runId} did not reach a terminal state`);
}

test("health endpoint reports a live service", async () => {
  const { status, body } = await request("/api/health");
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.service, "glossia");
});

test("models exposes executable domains", async () => {
  const { status, body } = await request("/api/models");
  assert.equal(status, 200);
  const ids = body.domains.map((domain) => domain.id);
  assert.ok(ids.includes("research-brief"));
  assert.ok(ids.includes("quick-answer"));
  assert.ok(ids.includes("midi-remix"));
  assert.ok(ids.includes("story-scene"));
  assert.ok(ids.includes("open-intent"));
  assert.ok(body.models.length >= 4);
});

test("demo compiler repairs an invalid candidate and exposes the diff", async () => {
  const { status, body } = await compile(
    "How should a team ship an LLM workflow to production without losing control?",
  );
  assert.equal(status, 200);
  const result = body.result;
  assert.equal(result.ok, true);
  assert.equal(result.attempts.length, 2);
  assert.equal(result.patch.nodes.length, 12);
  assert.equal(result.patch.edges.length, 18);
  assert.equal(result.issues.filter((issue) => issue.severity === "error").length, 0);
  assert.ok(result.diff);
  assert.ok(result.diff.addedEdges.length >= 1);
  assert.ok(result.patch.nodes.some((node) => node.type === "input.question"));
  assert.ok(result.pseudocode.includes("Research question"));
});

test("demo run produces a verified artifact with a complete trace", async () => {
  const compiled = await compile(
    `Trace probe ${Date.now()}: how should a team ship an LLM workflow to production?`,
  );
  const patch = compiled.body.result.patch;
  const started = await startRun(patch);
  assert.equal(started.status, 200);
  const run = await waitForRun(started.body.runId);
  assert.equal(run.status, "completed");
  assert.equal(run.steps.length, 12);
  assert.equal(run.steps.filter((step) => step.status === "completed" || step.status === "cached").length, 12);
  assert.ok(run.artifact);
  assert.equal(run.artifact.verification.supportRate, 1);
  assert.equal(run.artifact.verification.sourcesUsed, 4);
  assert.ok(run.artifact.markdown.includes("[S1]"));
  assert.ok(run.spans.some((span) => span.kind === "llm"));
});

test("identical inputs hit the content-addressed cache", async () => {
  const compiled = await compile(
    "How should a team ship an LLM workflow to production without losing control?",
  );
  const patch = compiled.body.result.patch;
  const first = await waitForRun((await startRun(patch)).body.runId);
  assert.equal(first.status, "completed");
  const second = await waitForRun((await startRun(patch)).body.runId);
  assert.equal(second.status, "completed");
  assert.ok(second.artifact);
  assert.equal(second.steps.filter((step) => step.status === "cached").length, 12);
  assert.ok(second.durationMs <= 500);
});

test("the presets are different graphs, not one brief in three costumes", async () => {
  const midi = await compile(
    "Transpose the phrase up a fifth, keep only notes in C3-G5, quantize to 1/16, and pull the dynamics back 25%.",
    "demo",
    "midi-remix",
  );
  assert.equal(midi.status, 200);
  assert.equal(midi.body.result.ok, true);
  assert.equal(midi.body.result.attempts.length, 2);
  assert.equal(midi.body.result.patch.nodes.length, 6);
  assert.ok(midi.body.result.patch.nodes.every((node) => !node.type.startsWith("llm.")));
  const midiRun = await waitForRun(
    (await startRun(midi.body.result.patch, "demo", "midi-remix")).body.runId,
  );
  assert.equal(midiRun.status, "completed");
  assert.ok(midiRun.artifact);
  assert.equal(midiRun.artifact.verification, undefined);
  assert.equal(midiRun.artifact.checks.length, 5);
  assert.ok(midiRun.artifact.checks.every((check) => check.passed));
  assert.ok(midiRun.artifact.markdown.includes("transpose +7 st"));
  assert.ok(midiRun.artifact.markdown.includes("quantize 1/16"));

  const story = await compile(
    "A lighthouse keeper finds a door in the fog that opens onto a city she has never visited. Write it as a tense third-person scene.",
    "demo",
    "story-scene",
  );
  assert.equal(story.status, 200);
  assert.equal(story.body.result.ok, true);
  assert.equal(story.body.result.attempts.length, 2);
  assert.equal(story.body.result.patch.nodes.length, 5);
  assert.ok(story.body.result.patch.nodes.some((node) => node.type === "llm.scene"));
  const storyRun = await waitForRun(
    (await startRun(story.body.result.patch, "demo", "story-scene")).body.runId,
  );
  assert.equal(storyRun.status, "completed");
  assert.ok(storyRun.artifact);
  assert.equal(storyRun.artifact.verification, undefined);
  assert.equal(storyRun.artifact.checks.length, 4);
  assert.ok(storyRun.artifact.checks.every((check) => check.passed));
  assert.ok(storyRun.artifact.markdown.includes("## Continuity"));
});

test("the demo eval suite runs ten structural cases", { timeout: 60_000 }, async () => {
  const { status, body } = await request("/api/eval", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "demo", limit: 10 }),
  });
  assert.equal(status, 200);
  assert.ok(body.report);
  assert.equal(body.report.summary.total, 10);
  assert.equal(body.report.summary.passed, 10);
  assert.ok(body.report.summary.avgNodeRecall >= 0.8);
  assert.ok(body.report.summary.avgEdgeF1 >= 0.5);
});

test("invalid graphs are rejected before execution", async () => {
  const { status, body } = await request("/api/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      domainId: "research-brief",
      mode: "demo",
      patch: {
        version: "2",
        domainId: "research-brief",
        domainVersion: "2.0.0",
        nodes: [],
        edges: [],
      },
    }),
  });
  assert.equal(status, 422);
  assert.equal(body.error.code, "GRAPH_INVALID");
});

test("cancellation reaches a terminal state", async () => {
  const compiled = await compile(
    "Cancellation probe: how should a platform team review an LLM workflow?",
  );
  const patch = compiled.body.result.patch;
  const started = await startRun(patch);
  const cancelled = await request(`/api/runs/${started.body.runId}/cancel`, { method: "POST" });
  assert.equal(cancelled.status, 200);
  const run = await waitForRun(started.body.runId);
  assert.ok(["cancelled", "completed"].includes(run.status));
  if (run.status === "cancelled") {
    assert.equal(run.error?.code, "CANCELLED");
  }
});

test(
  "live adapter path compiles and runs",
  { skip: process.env.TEST_LIVE !== "1", timeout: 90_000 },
  async () => {
    const compiled = await compile(
      `Live adapter probe ${Date.now()}: how should a team evaluate an LLM workflow?`,
      "live",
    );
    assert.equal(compiled.status, 200);
    assert.equal(compiled.body.result.ok, true);
    assert.ok(compiled.body.result.patch.nodes.length >= 3);
    const started = await startRun(compiled.body.result.patch, "live");
    assert.equal(started.status, 200);
    const run = await waitForRun(started.body.runId, 60_000);
    assert.equal(run.status, "completed");
    assert.ok(run.artifact);
    assert.ok(run.usage.inputTokens > 0);
  },
);
