# Glossia: graph composer PoC

By [Aylesim](https://github.com/aylesim). [GitHub repository](https://github.com/aylesim/Glossia).

Proof of concept: **compose multi-domain semantic graphs** using an LLM, with validated JSON artifacts as source of truth.

## What It Does

1. Define a domain in natural language (e.g. _"image processing pipeline"_).
2. The system generates a **Domain JSON** with node types, ports, and params.
3. In the active domain, describe a flow: the system generates **pseudocode** and then **patch JSON**.
4. The patch is validated against Zod schemas and the current domain.
5. The UI renders the graph interactively with nodes and edges.

The app keeps two separate SoTs: domain JSON and patch JSON.

## Local Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), choose **OpenAI** or **OpenRouter** in the toolbar, pick a model (OpenRouter loads free text models automatically), and paste your API key (stored in the browser only). For local development you can set `OPENAI_API_KEY` or `OPENROUTER_API_KEY` in `.env.local` and leave the field empty.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LLM_PROVIDER` | no | `openai` | Server default provider when the UI does not send one (`openai` or `openrouter`) |
| `OPENAI_API_KEY` | no | — | OpenAI key when provider is OpenAI and the UI field is empty |
| `OPENROUTER_API_KEY` | no | — | OpenRouter key when provider is OpenRouter and the UI field is empty |
| `OPENAI_MODEL` | no | `gpt-4o-mini` | OpenAI model id |
| `OPENROUTER_MODEL` | no | `openrouter/free` | OpenRouter default when UI model unset (falls back to `OPENAI_MODEL` if set) |
| `OPENROUTER_HTTP_REFERER` | no | — | Optional OpenRouter attribution header |
| `OPENROUTER_APP_TITLE` | no | — | Optional OpenRouter `X-Title` header |

## Project Structure

```text
lib/
  domain.ts           # Domain Zod schema + validation
  domain-presets.ts   # Domain preset library (MIDI, image, NLP, modular synth)
  schema.ts           # Patch Zod schema + validation against active domain
  context.ts          # Prompt builders for domain bootstrap and composition
  api-types.ts        # Shared request/response types for client and routes
  openai-server.ts    # OpenAI client from request key or env
  examples.ts         # Example patch fixtures

app/
  page.tsx                      # Demo UI
  components/PatchGraph.tsx     # Graph viewer (React Flow)
  api/domain/bootstrap/route.ts # POST: domain description -> Domain JSON
  api/generate/route.ts         # POST: prompt + domain -> pseudocode/patch JSON

examples/
  sample-patch.json   # Example patch JSON

docs/
  PIANO-POC.md        # Detailed project plan
```

## Domains and Nodes

- The PoC includes domain presets: MIDI, image processing, NLP chain, modular synth.
- You can generate a new domain with the LLM or paste domain JSON manually.
- You can import/export a domain as a `.json` file.
- Nodes remain **semantic stubs**: they describe graph structure and intent, with no real execution.

## Generation Modes

- **Step 1 Domain Bootstrap**: domain description -> Domain JSON.
- **Step 2 Graph Composition**:
  - full pipeline (pseudocode -> JSON),
  - pseudocode only,
  - JSON from pseudocode.
- The active domain is saved in `localStorage`.
