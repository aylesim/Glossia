import http from "node:http";

/**
 * Local OpenAI-compatible mock used to exercise the live adapter path without
 * spending money or needing a provider key. It is a development fixture, not a
 * product dependency. Run with: node scripts/mock-openai.mjs
 */
const RESEARCH_PATCH = {
  "version": "2",
  "domainId": "research-brief",
  "domainVersion": "2.0.0",
  "nodes": [
    {
      "id": "q",
      "type": "input.question",
      "params": {
        "question": "How should a team ship an LLM workflow to production without losing control? Build a cited brief."
      }
    },
    {
      "id": "plan",
      "type": "llm.plan",
      "params": {
        "maxQueries": 3
      }
    },
    {
      "id": "search",
      "type": "tool.search",
      "params": {
        "maxSources": 4,
        "corpus": "demo"
      }
    },
    {
      "id": "fetch",
      "type": "tool.fetch",
      "params": {}
    },
    {
      "id": "chunk",
      "type": "transform.chunk",
      "params": {
        "chunkWords": 90
      }
    },
    {
      "id": "retrieve",
      "type": "transform.retrieve",
      "params": {
        "topK": 6
      }
    },
    {
      "id": "extract",
      "type": "llm.extract",
      "params": {
        "maxClaims": 10
      }
    },
    {
      "id": "dedupe",
      "type": "transform.dedupe",
      "params": {
        "similarity": 0.82
      }
    },
    {
      "id": "outline",
      "type": "llm.outline",
      "params": {
        "sections": 3
      }
    },
    {
      "id": "draft",
      "type": "llm.draft",
      "params": {
        "refine": true,
        "tone": "analyst"
      }
    },
    {
      "id": "verify",
      "type": "verify.citations",
      "params": {
        "strict": true
      }
    },
    {
      "id": "out",
      "type": "output.brief",
      "params": {
        "title": "Research brief"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "from": "q",
      "fromPort": "question",
      "to": "plan",
      "toPort": "question"
    },
    {
      "id": "e2",
      "from": "plan",
      "fromPort": "queries",
      "to": "search",
      "toPort": "queries"
    },
    {
      "id": "e3",
      "from": "search",
      "fromPort": "sources",
      "to": "fetch",
      "toPort": "sources"
    },
    {
      "id": "e4",
      "from": "fetch",
      "fromPort": "documents",
      "to": "chunk",
      "toPort": "documents"
    },
    {
      "id": "e5",
      "from": "chunk",
      "fromPort": "chunks",
      "to": "retrieve",
      "toPort": "chunks"
    },
    {
      "id": "e6",
      "from": "plan",
      "fromPort": "queries",
      "to": "retrieve",
      "toPort": "queries"
    },
    {
      "id": "e7",
      "from": "retrieve",
      "fromPort": "evidence",
      "to": "extract",
      "toPort": "evidence"
    },
    {
      "id": "e8",
      "from": "extract",
      "fromPort": "claims",
      "to": "dedupe",
      "toPort": "claims"
    },
    {
      "id": "e9",
      "from": "dedupe",
      "fromPort": "claims",
      "to": "outline",
      "toPort": "claims"
    },
    {
      "id": "e10",
      "from": "q",
      "fromPort": "question",
      "to": "outline",
      "toPort": "question"
    },
    {
      "id": "e11",
      "from": "outline",
      "fromPort": "outline",
      "to": "draft",
      "toPort": "outline"
    },
    {
      "id": "e12",
      "from": "dedupe",
      "fromPort": "claims",
      "to": "draft",
      "toPort": "claims"
    },
    {
      "id": "e13",
      "from": "draft",
      "fromPort": "draft",
      "to": "verify",
      "toPort": "draft"
    },
    {
      "id": "e14",
      "from": "dedupe",
      "fromPort": "claims",
      "to": "verify",
      "toPort": "claims"
    },
    {
      "id": "e15",
      "from": "retrieve",
      "fromPort": "evidence",
      "to": "verify",
      "toPort": "evidence"
    },
    {
      "id": "e16",
      "from": "verify",
      "fromPort": "verified",
      "to": "out",
      "toPort": "verified"
    },
    {
      "id": "e17",
      "from": "verify",
      "fromPort": "report",
      "to": "out",
      "toPort": "report"
    },
    {
      "id": "e18",
      "from": "search",
      "fromPort": "sources",
      "to": "out",
      "toPort": "sources"
    }
  ],
  "meta": {
    "title": "How should a team ship an LLM workflow to production without losing control? \u2026",
    "createdBy": "llm",
    "promptVersion": "compile.v2"
  }
};
const QUICK_PATCH = {
  "version": "2",
  "domainId": "quick-answer",
  "domainVersion": "2.0.0",
  "nodes": [
    {
      "id": "q",
      "type": "input.question",
      "params": {
        "question": "Example"
      }
    },
    {
      "id": "answer",
      "type": "llm.answer",
      "params": {
        "style": "concise"
      }
    },
    {
      "id": "out",
      "type": "output.answer",
      "params": {}
    }
  ],
  "edges": [
    {
      "id": "e1",
      "from": "q",
      "fromPort": "question",
      "to": "answer",
      "toPort": "question"
    },
    {
      "id": "e2",
      "from": "answer",
      "fromPort": "answer",
      "to": "out",
      "toPort": "answer"
    }
  ],
  "meta": {
    "title": "Quick answer",
    "createdBy": "llm"
  }
};
const PORT = Number(process.env.MOCK_OPENAI_PORT || 4010);

function parseJsonAfter(text, label, endLabel) {
  const start = text.indexOf(label);
  if (start === -1) return undefined;
  const slice = text.slice(start + label.length);
  const end = endLabel ? slice.indexOf(endLabel) : -1;
  const candidate = (end === -1 ? slice : slice.slice(0, end)).trim();
  try { return JSON.parse(candidate); } catch { return undefined; }
}

function questionFrom(user) {
  return user.match(/Research question:\s*"""([\s\S]*?)"""/)?.[1]
    || user.match(/^Question:\s*"""([\s\S]*?)"""/m)?.[1]
    || "Research question";
}

function claimsFromEvidence(evidence) {
  const claims = [];
  for (const item of evidence) {
    const sentences = String(item.text || "")
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 48 && sentence.length < 280)
      .filter((sentence) => !/^(this|that|these|those|it|they|we|you)\b/i.test(sentence));
    for (const sentence of sentences.slice(0, 2)) {
      claims.push({
        id: `c${claims.length + 1}`,
        text: sentence,
        sourceId: item.sourceId,
        quote: sentence,
        confidence: 0.84,
      });
      if (claims.length >= 10) return claims;
    }
  }
  return claims;
}

function response(res, content, model = "gpt-4.1-mini") {
  const body = {
    id: `chatcmpl-mock-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
    usage: {
      prompt_tokens: Math.max(20, Math.round(content.length / 5)),
      completion_tokens: Math.max(10, Math.round(content.length / 6)),
      total_tokens: Math.max(30, Math.round(content.length / 3)),
    },
  };
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST" || !req.url?.endsWith("/chat/completions")) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: "not found" } }));
    return;
  }
  let raw = "";
  for await (const chunk of req) raw += chunk;
  let body;
  try { body = JSON.parse(raw || "{}"); } catch { body = {}; }
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const user = messages.find((message) => message.role === "user")?.content || "";
  const system = messages.find((message) => message.role === "system")?.content || "";
  const all = `${system}\n${user}`;

  if (/invalid\. Fix it/i.test(user)) {
    response(res, JSON.stringify(/Quick answer/.test(all) ? QUICK_PATCH : RESEARCH_PATCH));
    return;
  }
  if (/Compile the intent into a patch/i.test(user)) {
    const base = JSON.parse(JSON.stringify(/Quick answer/.test(all) ? QUICK_PATCH : RESEARCH_PATCH));
    if (base.domainId === "research-brief") {
      const search = base.nodes.find((node) => node.id === "search");
      if (search) search.params.max_results = 6;
      base.edges = base.edges.filter((edge) => edge.id !== "e10");
    }
    response(res, JSON.stringify(base));
    return;
  }

  if (/retrieval queries/i.test(user) || /surface the evidence/i.test(user)) {
    const question = questionFrom(user);
    response(res, JSON.stringify({
      queries: [
        question,
        "How to evaluate an LLM workflow before production",
        "LLM observability traces cost and prompt versions",
        "human in the loop approval gates for AI agents",
      ].slice(0, 4),
    }));
    return;
  }

  if (/Extract at most/i.test(user)) {
    const evidence = parseJsonAfter(user, "Evidence:", "Extract at most") || [];
    response(res, JSON.stringify({ claims: claimsFromEvidence(evidence) }));
    return;
  }

  if (/Build an outline/i.test(user)) {
    const claims = parseJsonAfter(user, "Claims:", "Build an outline") || [];
    const ids = claims.map((claim) => claim.id).filter(Boolean);
    const sections = [
      { id: "s1", title: "What good looks like", claimIds: ids.slice(0, Math.ceil(ids.length / 2)) },
      { id: "s2", title: "Where teams get it wrong", claimIds: ids.slice(Math.ceil(ids.length / 2)) },
    ].filter((section) => section.claimIds.length > 0);
    response(res, JSON.stringify({ title: questionFrom(user), sections }));
    return;
  }

  if (/Write a Markdown research brief/i.test(user)) {
    const question = questionFrom(user);
    response(res, `# ${question}\n\n**Short answer:** measure the workflow, make every run observable, and keep autonomy bounded. [S1] [S2]\n\n## What good looks like\n\n- Treat prompts like code and version them. [S2]\n- Track first-pass and post-repair validity separately. [S1]\n\n## Where teams get it wrong\n\n- A trace without a prompt hash cannot answer what changed. [S2]\n- Autonomy without a gate is an incident waiting for a date. [S3]\n\n## Bottom line\n\nMeasurement first, observability second, autonomy third.`);
    return;
  }

  if (/Critique and revise/i.test(user)) {
    const draft = user.split("Draft:")[1]?.split("Return JSON:")[0]?.trim() || "No draft.";
    response(res, JSON.stringify({
      critique: "The draft is clear; add an explicit operating-model close.",
      draft: `${draft}\n\n## Operating model\n\n1. Freeze a golden set.\n2. Trace every run.\n3. Gate the first side effect.`,
    }));
    return;
  }

  if (/Answer in Markdown/i.test(user)) {
    response(res, "Measure first, make the run observable, and keep autonomy bounded by an approval gate. The source corpus supports this order.");
    return;
  }

  response(res, JSON.stringify({ ok: true, note: "mock fallback" }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`mock OpenAI-compatible provider listening on http://127.0.0.1:${PORT}/v1`);
});
