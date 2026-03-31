# PoC Plan: Prompting the Glossia Graph (JSON as SoT)

This document describes what to build, in what order, and what final outcome should be demonstrable for a web-based proof of concept.

---

## 1. Context and Problem

Glossia models transformations as a directed graph:

- each node represents a function/operator,
- edges define data flow between functions,
- patch state must live in a single structured artifact.

JSON is the source of truth (SoT): the app must derive what it renders from validated JSON.

The core hypothesis is:

1. a user describes intent in natural language,
2. the model produces readable pseudocode,
3. the model produces schema-valid JSON from it.

The PoC demonstrates:
prompt -> intermediate representation -> valid JSON -> UI rendering.

---

## 2. PoC Goal

Build a web app that allows:

1. entering a natural-language request,
2. generating pseudocode for the flow,
3. generating patch JSON,
4. validating JSON with Zod,
5. rendering the graph from validated JSON only.

---

## 3. Suggested Stack

| Area | Choice | Why |
|------|--------|-----|
| Framework | Next.js (App Router) | Fast UI + server routes |
| Language | TypeScript | Strong type/schema alignment |
| Validation | Zod | Shared runtime validation |
| LLM | OpenAI API | Server-side model orchestration |
| Graph UI | React Flow | Lightweight visual graph rendering |

---

## 4. JSON Contract

Patch JSON includes:

- `version`
- `nodes` (`id`, `type`, `params`)
- `edges` (`from`, `to`, optional `fromPort`/`toPort`)

Integrity checks:

- all edge refs point to existing node ids,
- no duplicate node ids,
- node `type` exists in the active domain,
- params are allowed and type-correct for each node type.

---

## 5. Domain Model

Domain JSON is a separate artifact and includes:

- metadata (`id`, `name`, `description`, `semantics`),
- a list of node type definitions,
- per node type: inputs/outputs and parameter specs.

Node types are semantic stubs in this PoC: they define structure and meaning, not executable runtime behavior.

---

## 6. Generation Pipeline

### Step A: Domain Bootstrap

Input: domain description in natural language.  
Output: validated domain JSON.

### Step B: Graph Composition

Input: graph request + active domain.  
Output: pseudocode and patch JSON validated against domain + patch schema.

Modes:

- full pipeline,
- pseudocode only,
- JSON from pseudocode.

---

## 7. Application Requirements

- server API routes (never expose API keys client-side),
- clear 2-step UI:
  - Step 1: define/load/import domain
  - Step 2: compose graph in active domain
- domain persistence in localStorage,
- graph rendering derived from validated patch JSON only.

---

## 8. Deliverables

1. runnable Next.js project (`npm run dev`),
2. README with setup instructions,
3. end-to-end demo:
   - natural language -> pseudocode -> valid JSON,
   - graph rendered from validated JSON,
4. SoT principle respected for both domain and patch artifacts.

---

## 9. Success Criteria

- [ ] Domain and patch schemas are defined and validated.
- [ ] API pipeline is server-side only.
- [ ] UI shows prompt, intermediate output, JSON, and validation status.
- [ ] At least one meaningful preset/example works out of the box.
- [ ] End-to-end flow is demoable in under 2 minutes.
