import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  buildDomainBootstrapSystemPrompt,
  buildDomainBootstrapPrompt,
} from "@/lib/context";
import { extractJsonFromModelOutput } from "@/lib/schema";
import { validateDomain } from "@/lib/domain";
import type {
  DomainBootstrapRequest,
  DomainBootstrapResponse,
} from "@/lib/api-types";
import { createOpenAiClient, resolveLlmModel } from "@/lib/openai-server";
import { resolveLlmProvider } from "@/lib/llm-provider";

export async function POST(req: NextRequest) {
  let body: DomainBootstrapRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies DomainBootstrapResponse,
      { status: 400 },
    );
  }

  if (!body.description?.trim()) {
    return NextResponse.json(
      { error: "description is required" } satisfies DomainBootstrapResponse,
      { status: 400 },
    );
  }

  const provider = resolveLlmProvider(body.llmProvider);
  const model = resolveLlmModel(provider, body.llmModel);

  let client: OpenAI;
  try {
    client = createOpenAiClient({ apiKey: body.openAiApiKey, provider });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message } satisfies DomainBootstrapResponse,
      { status: 500 },
    );
  }

  try {
    const response = await client.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: buildDomainBootstrapSystemPrompt() },
        { role: "user", content: buildDomainBootstrapPrompt(body.description) },
      ],
    });

    const rawOutput = response.choices[0]?.message?.content ?? "";
    const rawJson = extractJsonFromModelOutput(rawOutput);
    const result: DomainBootstrapResponse = { rawJson };

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      result.validation = {
        ok: false,
        errors: ["Model output is not valid JSON"],
      };
      return NextResponse.json(result);
    }

    const validation = validateDomain(parsed);
    result.validation = validation;
    if (validation.ok) {
      result.domain = validation.domain;
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message } satisfies DomainBootstrapResponse,
      { status: 500 },
    );
  }
}
