# Architecture

## Data flow

```text
intent
  → compiler (LLM + JSON Schema)
  → candidate patch
  → deterministic autofix
  → analyzer (schema, domain, params, ports, DAG, reachability, limits)
  → repair (LLM, max 2 attempts)  ──┐
  → validated patch                 │
  → DAG scheduler                   │
  → node executors (LLM / tool / transform / io)
  → SSE events + trace spans        │
  → artifact + deterministic checks
  → run record (JSON on disk)       │
  → eval suite ─────────────────────┘
```

The important separation is **probabilistic generation vs deterministic checks**. The model proposes a program. The analyzer decides whether it is a legal program. The runtime decides whether it can run. The verifier decides whether the artifact's claims survive contact with the sources. Other domains use the same seam: the story scene has a continuity check instead of citation verification, and the MIDI phrase is nothing but deterministic transforms.

## The IR

`lib/ir/types.ts` defines:

- `Domain` — id, version, metadata and `nodeTypes`.
- `NodeType` — category, typed `inputs`/`outputs`, `params`, `executor`.
- `Patch` — `nodes` (instances), `edges` (from/fromPort/to/toPort), metadata.
- `RunRecord` — steps, spans, usage, cost, artifact, error.
- `RunEvent` — the SSE contract.

Types are deliberately small: `text`, `json`, `number`, `boolean`, `any`. `json` is for structured payloads; the executor and analyzer know the shape by convention. This keeps the domain language expressive without a full JSON Schema type system inside the graph.

The built-in domains are `research-brief`, `story-scene`, `midi-remix` and the three-node `quick-answer` smoke test. Only the executable refs in `lib/runtime/executors.ts` can run; an imported domain without them is compile-only.

### Analyzer

`validatePatchObject` checks:

- domain id/version, unique node ids, known node types;
- unknown/missing/typed/enum/range params, required params, secret-like params;
- edge ids, duplicate edges, endpoints, self-edges, port existence, port type compatibility;
- required inputs, multiple producers, cycles;
- entry points, output nodes, unreachable nodes, dead ends;
- size limits and estimated cost.

Issues carry `severity`, a stable `code`, an optional `nodeId`/`edgeId` and, where safe, a deterministic `fix`.

### Compiler

`compileIntent`:

1. Calls the adapter with a domain-aware JSON Schema (`patchJsonSchema`).
2. Extracts JSON, applies `sanitizePatch` (envelope, unknown params, numeric strings, duplicate edges).
3. Validates with the analyzer.
4. If invalid, sends the original output and the exact issues to a repair call.
5. Repeats up to two repairs, records every attempt and computes a semantic diff from the first candidate to the final patch.
6. Hydrates the entry question and returns the validated patch, pseudocode and usage.

`CACHE_VERSION` in `lib/runtime/cache.ts` is the escape hatch for prompt/executor changes; in a larger system it becomes a content hash of the prompt and executor.

## Runtime

`lib/runtime/executor.ts` builds a graph of node dependencies (unique predecessors), seeds the ready queue, and runs up to `concurrency` nodes at a time.

Everything is port-level:

- a node is runnable when all required input ports have a value;
- fan-out is allowed; a `multi` input receives an array;
- values are immutable once written;
- a content-addressed cache stores node outputs and artifacts.

Each node has:

- a step record (`queued → running → completed | failed | cached | skipped`);
- a trace span;
- a node-local usage accumulator;
- the executor result (outputs, optional artifact, preview).

The scheduler never allows cycles; `validatePatchObject` rejects them. Bounded loops are composite nodes: `draftBrief` performs draft → critique → revise inside one node with two LLM spans. This was a deliberate tradeoff: a scheduler that supports arbitrary cycles is harder to reason about, debug and replay.

### Budget and cancellation

`BudgetTracker` checks dollar, token, wall-clock and step budgets before each model call. A violated budget throws `BudgetExceededError`; the run is marked `budget_exceeded`, unfinished steps are `skipped`, and the partial trace is saved.

Cancellation uses an `AbortController`; the signal is passed to the adapter and to the SDK request. The run is marked `cancelled` and the SSE client receives a terminal event.

### Event bus and persistence

`lib/runtime/store.ts`:

- keeps the active run map on `globalThis` so the POST route and the SSE route share the same run in the same process;
- buffers every `RunEvent` with a monotonic `seq`;
- supports replay from `Last-Event-ID`;
- writes finished runs to `.data/runs/<id>.json`.

This is a single-node POC design. The repository interface is the seam for a real database and a real event bus.

## LLM layer

`lib/llm/adapter.ts` defines one interface:

```ts
interface LlmAdapter {
  provider: "openai" | "openrouter" | "demo";
  model: string;
  generate(request: LlmRequest): Promise<LlmResponse>;
}
```

- `OpenAiAdapter` handles OpenAI, OpenRouter, Ollama, vLLM and the local mock via `OPENAI_BASE_URL` / `OPENROUTER_BASE_URL`.
- `DemoAdapter` implements the same interface with recorded responses. It returns an invalid candidate on the first compile, then a corrected one, so the live and demo paths share the repair code.
- Structured output tries provider-native `json_schema`; if the provider rejects it, the adapter retries without `response_format` and relies on the prompt/parser.
- Errors are mapped to a small taxonomy (`PROVIDER_AUTH`, `PROVIDER_RATE_LIMIT`, `PROVIDER_UNAVAILABLE`, `EMPTY_RESPONSE`, `CANCELLED`).

## Verification

`lib/research/synthesis.ts`:

- normalises claim quotes and source text;
- checks exact and normalised containment;
- records the method per claim;
- builds a `VerificationReport` used by the artifact and the UI.

The verifier runs after the model. It does not ask the model whether it is right.

## Eval

`lib/eval/runner.ts` runs the same compiler against a structural golden set:

- pass if valid and node recall ≥ 0.6;
- node recall/precision by type;
- edge F1 on the multiset of `(fromType, toType)`;
- params, attempts, latency, cost;
- p50/p95 and aggregate report saved to `.data/eval/`.

Demo and live differ only by the adapter.

## Frontend

- Landing: server component; static SVG hero; proof copy.
- Studio: one client component with a canvas (`@xyflow/react`), inspector, timeline, settings and artifact modal. State is local to the tab; keys are in `sessionStorage`.
- Eval lab: client; fetches/runs the suite and expands a case row.
- Run page: server; loads the run from `.data` and renders a read-only graph, trace and artifact.

The canvas uses a deterministic wrapped grid layout rather than a single 3,700px strip: a 12-node chain needs to fit a split-pane. The reader sees a storyboard, not a horizontal scroll.

## Deployment notes

- Demo mode works without a key and is the default portfolio surface.
- Live mode is BYOK or server env.
- `.data/` must be writable. On Vercel's serverless filesystem it is ephemeral and not shared across instances; for a real deployment use Postgres and an event bus, or run on a single node with a volume (Fly/Render).
- SSE requires a long-lived Node runtime; keep the route on the Node runtime.
