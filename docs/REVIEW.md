# Review guide (5 minutes)

If you are evaluating Glossia, this is the shortest path through the interesting parts.

## 1. Open the landing (30s)

`/` states the thesis: intent → typed graph → execution → evidence. The hero graph is the same 12-node recipe the studio runs. The proof strip deliberately uses small, real numbers (12 nodes, 10 eval cases, max 2 repair attempts, $0.00 demo).

## 2. Compile in demo mode (90s)

Open `/studio`. Demo is selected by default and needs no key.

1. Click **Compile graph**.
2. Look at the **valid** card: `2 attempts`, `repair diff · 1`, and the pseudocode.
3. Expand **repair diff**: the first candidate had a missing edge; the repair pass added it.
4. The canvas is rendered from the validated patch only. An invalid patch never reaches the canvas.

What to notice in the code:

- `lib/ir/analyze.ts` — deterministic checks and issues.
- `lib/compiler.ts` — structured generation, autofix, repair loop, diff.
- `lib/ir/schema.ts` — domain-aware JSON Schema.

## 3. Run it (60s)

Click **Run**.

1. Nodes move from queued to running to ok; the timeline fills with latency and cost.
2. The artifact modal opens. Every claim has a source marker.
3. The right side shows the deterministic verification report: supported/total claims, support rate, sources.
4. Close the modal and open the **Artifact** tab in the inspector.
5. Click a source to open it; the source list is part of the artifact.

What to notice:

- `lib/runtime/executor.ts` — DAG scheduling, events, trace, budget.
- `lib/runtime/executors.ts` — node behavior, including the bounded critique/revise inside `draftBrief`.
- `lib/research/synthesis.ts` — deterministic quote verification.

## 4. Run it again (20s)

Click **Run** again. The content-addressed cache returns all 12 steps as `cached` in about 1ms. The artifact is restored from the cache as well.

This is the "edit one node, re-run only what changed" seam. The key includes executor identity, params, resolved inputs, model and a cache version.

## 5. Break it (60s)

- Open **Domain**, change `maxSources` to `99` or remove a node, apply, compile: the analyzer reports the issue.
- Try an invalid graph via the API: `POST /api/runs` with an empty patch returns `422 GRAPH_INVALID`.
- Set the token budget to 1000 and run in live mode against the mock provider: the run stops with `BUDGET_EXCEEDED` and keeps the partial trace.
- Start a run and click **Stop**: the status becomes `cancelled` and the remaining steps are `skipped`.

## 6. Evaluate it (60s)

Open `/eval` and click **Run eval suite**. Ten structural cases run in about five seconds in demo mode. The report shows pass rate, node recall/precision, edge F1, params, attempts, latency and cost per case. Click a row to see missing/extra types and issues.

The demo suite measures the pipeline, not the model. Switch to live to measure a real model; the key stays in the tab.

## 7. Read the trace (30s)

Back in `/studio`, click any node and open **Run** or **Trace**:

- **Run**: actual output preview, attempts, cost, tokens, error.
- **Trace**: run status, model, cost, duration, spans (node / LLM / tool).

## Key files

| Area | File |
|------|------|
| IR types | `lib/ir/types.ts` |
| Domain + node types | `lib/ir/domains.ts` |
| Analyzer | `lib/ir/analyze.ts` |
| Compiler / repair | `lib/compiler.ts` |
| Provider adapter | `lib/llm/adapter.ts` |
| Prompts | `lib/llm/prompts.ts` |
| DAG runtime | `lib/runtime/executor.ts` |
| Node executors | `lib/runtime/executors.ts` |
| Budget / cache | `lib/runtime/budget.ts`, `lib/runtime/cache.ts` |
| Run registry / SSE | `lib/runtime/store.ts`, `app/api/runs/[id]/stream/route.ts` |
| Verification | `lib/research/synthesis.ts` |
| Eval | `lib/eval/runner.ts`, `app/eval/EvalClient.tsx` |
| Studio | `app/studio/StudioClient.tsx` |

## Questions the project is designed to answer

1. How do you keep an LLM inside a schema? → domain-aware JSON Schema + Zod + deterministic analyzer + repair.
2. How do you orchestrate several calls? → typed DAG, port-level dataflow, bounded composite loops.
3. What happens when the model is wrong? → exact issues, repair, retry policy, budget stop, cancellation.
4. How do you know it works? → traces, cost, structural evals, cache-replay.
5. How do you make it usable? → demo mode without a key, live BYOK, canvas, timeline, artifact modal.

## Known limits

- Runs live in `.data/` on one node; the active registry is in-process. For multi-instance, swap the store for a database and the event bus for Redis/Postgres.
- The corpus is curated, not a live web search or PDF pipeline.
- Graph editing is read-only; compile/run/inspect is the current surface.
- The eval suite is structural; a calibrated LLM judge is next.
