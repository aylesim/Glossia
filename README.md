# ✨ Glossia

**Describe workflows in natural language. Get validated graphs back.**

Glossia is a **proof of concept** by [Aylesim](https://github.com/aylesim) ([Alessandro Miracapillo](https://github.com/aylesim)) for using **large language models** to design **semantic graph pipelines**: you agree on a vocabulary of node types, write what you want in plain language, and the studio turns that into **schema-checked JSON** plus an **interactive diagram**.

🔗 **Repository:** [github.com/aylesim/Glossia](https://github.com/aylesim/Glossia)

> ⚠️ **Experimental PoC** — nodes are semantic stubs (structure + intent), not a runtime engine. No production guarantees.

---

## 🎯 What problem does it explore?

Most LLM demos stop at chat. Glossia asks a different question:

> Can we use natural language to **author structured workflows** that stay **valid**, **inspectable**, and **editable** as JSON?

The hypothesis is a simple pipeline:

```text
🗣️ natural language  →  📝 pseudocode  →  📦 patch JSON  →  🕸️ graph UI
```

Everything the UI renders comes from **validated artifacts**, not free-form model text.

---

## 🧩 Core ideas

| Concept | What it means |
|--------|----------------|
| **Domain JSON** | Defines which node types exist, their ports, and params — your project vocabulary |
| **Patch JSON** | A concrete graph: nodes, edges, and typed parameters |
| **Two sources of truth** | Domain and patch are separate; the patch is always checked against the active domain |
| **Zod validation** | Same schemas on server and client — invalid JSON never becomes the graph |

---

## 🚀 What you can do in the studio

1. **🏗️ Domain** — Bootstrap a domain from a prompt, pick a preset, paste JSON, or import/export `.json`
2. **📚 Catalog** — Browse node types allowed in the active domain
3. **✍️ Compose** — Describe a flow in natural language; generate pseudocode and/or patch JSON
4. **✅ Validate** — See schema and domain errors before trusting the output
5. **🕸️ Graph** — Explore the pipeline in **React Flow** (pan, zoom, inspect connections)
6. **🔁 Iterate** — Regenerate JSON, edit pseudocode, switch tabs between pseudocode / raw JSON / validation

### Generation modes

- **Full pipeline** — prompt → pseudocode → patch JSON
- **Pseudocode only** — intermediate step for review
- **JSON from pseudocode** — refine structure when the prose is already right

### LLM providers

- **OpenAI** — API key in UI or `.env.local`
- **OpenRouter** — free-text model list loaded from the API; optional attribution headers

Keys typed in the browser are stored **locally only** (not sent to Glossia servers except your chosen provider).

---

## 🎹 Built-in presets

Load a preset to skip cold-start and see a full demo path:

| Preset | Domain flavor | Example intent |
|--------|---------------|----------------|
| 🎵 **MIDI** | Note / transform / output nodes | Musical flow with validated ports |
| 🖼️ **Image processing** | `image.in`, filter, resize, `image.out` | Camera → blur → HD → output |
| 📄 **Text / NLP** | normalize → embed → classify | Document tagging pipeline |
| 🎛️ **Modular synth** | osc, envelope, filter, audio out | CV routing and audio path |

You can still **generate a custom domain** with the LLM or hand-edit domain JSON.

---

## 🛠️ Tech stack

| Layer | Choice |
|-------|--------|
| Framework | **Next.js 16** (App Router) |
| UI | **React 19**, **Tailwind CSS 4** |
| Graph | **@xyflow/react** |
| Validation | **Zod 4** |
| LLM | **OpenAI** SDK (OpenAI + OpenRouter routes) |
| Language | **TypeScript** |

---

## ⚡ Quick start

```bash
npm install
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**.

1. Choose **OpenAI** or **OpenRouter** in the toolbar  
2. Pick a model (OpenRouter fetches available models automatically)  
3. Paste your API key (browser storage) **or** set env vars below and leave the field empty  

Optional `.env.local`:

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# or
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=openrouter/free
```

---

## 🔐 Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LLM_PROVIDER` | no | `openai` | Server default when UI does not send one (`openai` \| `openrouter`) |
| `OPENAI_API_KEY` | no | — | Used when provider is OpenAI and UI key is empty |
| `OPENROUTER_API_KEY` | no | — | Used when provider is OpenRouter and UI key is empty |
| `OPENAI_MODEL` | no | `gpt-4o-mini` | OpenAI model id |
| `OPENROUTER_MODEL` | no | `openrouter/free` | OpenRouter default when UI model unset |
| `OPENROUTER_HTTP_REFERER` | no | — | Optional OpenRouter attribution |
| `OPENROUTER_APP_TITLE` | no | — | Optional OpenRouter `X-Title` header |

---

## 📐 JSON contracts (short)

### Domain

- Metadata: `id`, `name`, `description`, `semantics`
- `nodeTypes[]`: each type lists inputs, outputs, and parameter specs

### Patch

- `version`, `nodes[]` (`id`, `type`, `params`), `edges[]` (`from`, `to`, optional ports)
- Integrity: unique ids, edges reference real nodes, `type` must exist in domain, params match spec

See **`docs/PIANO-POC.md`** for the full PoC plan, success criteria, and design rationale.

---

## 📁 Project structure

```text
lib/
  domain.ts              # Domain Zod schema + validation
  domain-presets.ts      # MIDI, image, NLP, modular synth presets
  schema.ts              # Patch schema + validation vs active domain
  context.ts             # Prompt builders (bootstrap + compose)
  api-types.ts           # Shared API types
  openai-server.ts       # LLM client (request key or env)
  examples.ts            # Example fixtures

app/
  page.tsx               # Home → studio workspace
  home/                  # Studio UI (domain, compose, results, graph)
  components/
    PatchGraph.tsx       # React Flow viewer
    NodeCatalog.tsx      # Domain node listing
  api/
    domain/bootstrap/    # POST: description → Domain JSON
    generate/            # POST: prompt + domain → pseudocode / patch
    openrouter/models/   # GET: model list for OpenRouter

examples/
  sample-patch.json

docs/
  PIANO-POC.md           # Detailed PoC plan (Italian)
```

---

## 🧪 Suggested demo flow (~2 min)

1. Load the **MIDI** (or any) preset from the toolbar  
2. Skim the **node catalog** — same vocabulary the composer must use  
3. Edit the compose prompt or run **Generate**  
4. Open **Graph** — confirm nodes/edges match the patch JSON  
5. Break something on purpose (invalid `type`) and read **validation** feedback  

---

## 🚧 Limitations (by design)

- No execution engine — graphs describe **intent**, not running code  
- Quality depends on model + prompt; validation catches structure, not semantics  
- Domain and patch live in **localStorage** in the browser for this PoC  
- API routes call LLMs server-side; never commit real API keys  

---

## 📜 License & author

Built as an open experimentation project by **Aylesim**.

Questions, ideas, or PRs welcome on [GitHub](https://github.com/aylesim/Glossia).

---

## 📚 Further reading

- [`docs/PIANO-POC.md`](docs/PIANO-POC.md) — PoC goals, pipeline steps, deliverables checklist
