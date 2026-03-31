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

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured on the server");
  return new OpenAI({ apiKey });
}

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

  let client: OpenAI;
  try {
    client = getClient();
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message } satisfies DomainBootstrapResponse,
      { status: 500 },
    );
  }

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
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
