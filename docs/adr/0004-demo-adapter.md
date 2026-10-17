# ADR 0004 — Demo is an adapter, not a separate pipeline

## Status

Accepted.

## Context

A portfolio demo must work without an API key, but a "fake mode" that bypasses the real code path proves nothing. The demo also needs to be deterministic enough for screenshots and tests.

## Decision

`DemoAdapter` implements the same `LlmAdapter` interface as the live provider. It returns:

- an invalid patch on the first compile, and a corrected patch on repair;
- deterministic queries, claims, outline and draft for the runtime;
- realistic usage numbers with zero cost.

The compiler, analyzer, repair loop, scheduler, verification, trace and UI are the same code in both modes. Only the adapter changes.

## Consequences

- The demo exercises the repair loop, the runtime and the verifier.
- A broken demo output is a real pipeline failure, not a UI lie.
- The fixture must be kept in sync with prompt/schema changes; `CACHE_VERSION` and the integration tests are the guardrails.
- The demo eval measures the pipeline, not the model. The UI labels this explicitly.
