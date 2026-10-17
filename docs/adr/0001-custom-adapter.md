# ADR 0001 — A thin custom adapter instead of an orchestration framework

## Status

Accepted.

## Context

The project needs structured output, retries, usage accounting, cancellation and a demo/live switch. The Vercel AI SDK and similar frameworks provide these, but the orchestration itself is the thing this POC is meant to demonstrate.

## Decision

Use a small `LlmAdapter` interface (`lib/llm/adapter.ts`) with:

- one OpenAI-compatible implementation (OpenAI, OpenRouter, Ollama, vLLM, local mock);
- one recorded demo implementation;
- explicit error mapping and usage accounting.

The runtime owns scheduling, retries, budget and tracing. The adapter owns only the provider call.

## Consequences

- More code than a framework call, but every behavior is inspectable and testable.
- Provider-specific features are opt-in rather than inherited from a framework.
- The same `LlmRequest`/`LlmResponse` contract supports the demo fixture and a real provider, so the compiler/runtime paths are identical.
- If the project grows, the adapter boundary makes it possible to swap in a framework for streaming or tool loops without touching the graph/runtime.
