# Glossia

**LLM workflow composer with schema validation and graph rendering.**

Glossia is a proof of concept by [Alessandro Miracapillo](https://github.com/aylesim) for turning natural-language workflow descriptions into validated graph structures.

The project is meant to show practical LLM integration beyond a chat interface: prompt design, structured outputs, runtime validation, provider abstraction, and an interactive UI built around the generated data.

Repository: [github.com/aylesim/Glossia](https://github.com/aylesim/Glossia)

## What It Demonstrates

Glossia takes a workflow idea written in plain language and turns it into a graph made of typed nodes and edges.

The important part is not only generation. The app keeps the model output constrained by a domain schema, validates the result with Zod, and renders only validated JSON.

```text
natural language -> pseudocode -> patch JSON -> validation -> graph UI
```

This makes the project closer to an LLM-powered product workflow than to a one-off prompt demo.

## Why This Project Exists

LLMs are useful when they can translate intent into structured artifacts that software can trust. Glossia explores that pattern with a small but complete system:

- the user defines or selects a domain;
- the domain describes allowed node types, ports, and parameters;
- the user describes a workflow in natural language;
- the LLM produces an intermediate pseudocode representation;
- the app converts that into patch JSON;
- the patch is validated against both a generic graph schema and the active domain;
- the UI renders the final graph from JSON only.

The result is a demo that shows how to combine language models with deterministic checks instead of treating model output as final truth.

## Key Engineering Points

### LLM Orchestration

- Server-side API routes call OpenAI-compatible providers.
- OpenAI and OpenRouter are supported.
- The UI can pass a provider, model, and API key per request.
- Environment variables provide local development defaults.
- Prompt builders are separated from route logic so the generation flow stays inspectable.

### Structured Generation

Glossia uses a two-step generation path:

1. produce readable pseudocode from the user prompt;
2. produce graph JSON from that pseudocode and the active domain.

This gives the user a reviewable intermediate artifact and makes the final JSON easier to debug.

### Validation First

The graph is never rendered directly from free-form model text.

Validation checks include:

- unique node ids;
- edges pointing to existing nodes;
- node types existing in the active domain;
- params matching the domain definition;
- schema-valid domain and patch JSON.

### Product Surface

The app includes the parts needed to try the idea end to end:

- domain bootstrap from natural language;
- domain presets;
- import/export for domain JSON;
- model/provider selection;
- pseudocode, raw JSON, and validation views;
- graph visualization with React Flow;
- local persistence for current domain and workspace state.

## Built-In Domains

Glossia includes presets so the workflow can be tested without writing a domain from scratch.

| Preset | What it models |
|--------|----------------|
| MIDI | Notes, transformations, and musical output |
| Image processing | Input, filters, resize, and output |
| Text / NLP | Normalization, embeddings, classification |
| Modular synth | Oscillators, envelopes, filters, and audio routing |

Custom domains can also be generated with the LLM or edited manually as JSON.

## Tech Stack

| Area | Stack |
|------|-------|
| Framework | Next.js 16, App Router |
| Language | TypeScript |
| UI | React 19, Tailwind CSS 4 |
| Graph rendering | `@xyflow/react` |
| Validation | Zod 4 |
| LLM integration | OpenAI SDK, OpenRouter-compatible requests |

## Local Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

In the toolbar, choose OpenAI or OpenRouter, select a model, and provide an API key. Keys typed into the UI are stored in the browser and sent only with generation requests.

For local development, API keys can also be provided through `.env.local`:

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# or
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=openrouter/free
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LLM_PROVIDER` | no | `openai` | Server default when the UI does not send one (`openai` or `openrouter`) |
| `OPENAI_API_KEY` | no | none | OpenAI key used when the UI field is empty |
| `OPENROUTER_API_KEY` | no | none | OpenRouter key used when the UI field is empty |
| `OPENAI_MODEL` | no | `gpt-4o-mini` | Default OpenAI model |
| `OPENROUTER_MODEL` | no | `openrouter/free` | Default OpenRouter model when the UI does not set one |
| `OPENROUTER_HTTP_REFERER` | no | none | Optional OpenRouter attribution header |
| `OPENROUTER_APP_TITLE` | no | none | Optional OpenRouter `X-Title` header |

## Data Model

Glossia keeps two separate JSON artifacts.

### Domain JSON

The domain defines the vocabulary available to the workflow:

- domain metadata;
- node type definitions;
- allowed inputs and outputs;
- parameter names and types.

### Patch JSON

The patch defines one concrete graph:

- `version`;
- `nodes`;
- `edges`;
- optional port-level connections;
- node params.

The patch must validate against the current domain before it becomes the rendered graph.

## Project Structure

```text
lib/
  domain.ts              # Domain Zod schema and validation
  domain-presets.ts      # MIDI, image, NLP, and synth presets
  schema.ts              # Patch schema and validation against active domain
  context.ts             # Prompt builders for domain and graph generation
  api-types.ts           # Shared API request/response types
  openai-server.ts       # LLM client setup
  examples.ts            # Demo fixtures

app/
  page.tsx
  home/                  # Studio workspace and feature sections
  components/
    PatchGraph.tsx       # React Flow graph viewer
    NodeCatalog.tsx      # Active-domain node catalog
  api/
    domain/bootstrap/    # Domain generation route
    generate/            # Pseudocode and patch generation route
    openrouter/models/   # OpenRouter model list route

examples/
  sample-patch.json

docs/
  PIANO-POC.md           # Original PoC plan
```

## Suggested Review Flow

To understand the project quickly:

1. start the app with `npm run dev`;
2. load a preset domain;
3. inspect the node catalog;
4. run a generation from a natural-language prompt;
5. compare pseudocode, JSON, validation output, and graph rendering;
6. edit the JSON to trigger validation errors.

This shows the main value of the project: the model can propose a workflow, but the application owns the contract.

## Current Limits

Glossia is not a workflow execution engine. Nodes describe intent and structure, but they do not run real tasks.

Validation catches structural errors and domain mismatches. It does not prove that the generated workflow is semantically perfect.

State is stored locally in the browser because the goal is to demonstrate the LLM-to-structured-output pipeline, not multi-user persistence.

## Author

Built by [Alessandro Miracapillo](https://github.com/aylesim) as a focused LLM product engineering prototype.

See [`docs/PIANO-POC.md`](docs/PIANO-POC.md) for the original implementation plan.
