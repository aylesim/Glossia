# Prompt design

Prompts are code: versioned, reviewed and recorded in the trace. `lib/llm/prompts.ts` exports `PROMPT_VERSIONS` and the builders. Compile attempts store the prompt version; runtime spans record it in `attributes.promptVersion`.

## Compiler

**Contract**: emit one JSON object for the domain, no prose.

- The domain context is compact: node type, description, ports and params. It is the type system, not a tutorial.
- The prompt states the envelope (`version`, `domainId`, `domainVersion`) and the rules that the analyzer will enforce.
- The provider receives a domain-aware JSON Schema, so the type enum is constrained before decoding.
- No chain-of-thought is requested. The graph is the reasoning artifact; the trace is the explanation.
- The model is told to prefer the smallest valid graph. The analyzer rejects unreachable and dead-end nodes.

## Repair

**Contract**: return the full corrected patch, keep what was valid, fix every listed error.

The repair prompt contains:

1. the domain context;
2. the original intent;
3. the invalid patch;
4. the exact issue list from the analyzer;
5. the rules again.

The error list is compact and machine-readable (`UNKNOWN_PARAM`, `MISSING_INPUT`, `PORT_TYPE_MISMATCH`, ...). This is the highest-leverage prompt in the system: it is where the deterministic analyzer teaches the model.

A deterministic autofix runs before the repair call for the cheap failures (missing envelope, unknown params, numeric strings, duplicate edges). The model is not asked to fix what code can fix safely.

## Node prompts

| Prompt | Contract | Why |
|--------|----------|-----|
| `plan` | `{ queries: string[] }` | Keep retrieval concrete; the search tool is lexical, so vague queries fail visibly. |
| `extractClaims` | `{ claims: [{ id, text, sourceId, quote, confidence }] }` | The quote is mandatory; the verifier checks it. |
| `outline` | `{ title, sections: [{ id, title, claimIds }] }` | Concrete claim references prevent empty sections. |
| `draftBrief` | Markdown | Prose is the product; forcing it through JSON adds escaping noise. |
| `reviseBrief` | `{ critique, draft }` | A bounded editorial pass; the prompt forbids new facts. |
| `answer` | Markdown | Quick-answer domain; states uncertainty when the corpus is thin. |

## Safety posture

- Retrieved content is data, not instructions. In a production retrieval pipeline it must be delimited and labelled as untrusted; the current corpus is trusted demo content, and the code keeps the boundary explicit.
- No secrets in graph params; the analyzer rejects keys that look like `sk-...`.
- The verifier fails closed: a claim with no matching quote is reported as unsupported.
- A failed editorial pass does not destroy a valid draft; it falls back to the extracted claims.

## Versioning

- Compiler: `compile.v2`; repair: `repair.v2`.
- Node prompts: `plan.v1`, `extract.v1`, `outline.v1`, `draft.v1`, `revise.v1`, `answer.v1`.
- Runtime cache includes `CACHE_VERSION`; bump it when prompt or executor semantics change.
- In a larger system the cache key and the trace would use a content hash of the prompt, not a hand-maintained string.
