# Glossia — graph composer PoC

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
# 1. Install dependencies
npm install

# 2. Configure API key
cp .env.local.example .env.local
# Then open .env.local and set OPENAI_API_KEY

# 3. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | yes | — | OpenAI API key |
| `OPENAI_MODEL` | no | `gpt-4o-mini` | Model to use (e.g. `gpt-4o`) |

## Project Structure

```text
lib/
  domain.ts           # Domain Zod schema + validation
  domain-presets.ts   # Domain preset library (MIDI, image, NLP, modular synth)
  schema.ts           # Patch Zod schema + validation against active domain
  context.ts          # Prompt builders for domain bootstrap and composition
  api-types.ts        # Shared request/response types for client and routes
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
