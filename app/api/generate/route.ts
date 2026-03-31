import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  buildComposeSystemPrompt,
  buildPseudocodePrompt,
  buildJsonPrompt,
} from "@/lib/context";
import { validatePatch, extractJsonFromModelOutput } from "@/lib/schema";
import { validateDomain } from "@/lib/domain";
import type { GenerateRequest, GenerateResponse } from "@/lib/api-types";

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured on the server");
  return new OpenAI({ apiKey });
}

async function callModel(
  client: OpenAI,
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.2,
  });
  return response.choices[0]?.message?.content ?? "";
}

export async function POST(req: NextRequest) {
  let body: GenerateRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" } satisfies GenerateResponse,
      { status: 400 },
    );
  }

  const { prompt, mode, pseudocode: existingPseudocode } = body;
  const domainValidation = validateDomain(body.domain);

  if (!prompt?.trim()) {
    return NextResponse.json(
      { error: "prompt is required" } satisfies GenerateResponse,
      { status: 400 },
    );
  }
  if (!domainValidation.ok) {
    return NextResponse.json(
      { error: `Invalid domain: ${domainValidation.errors.join(" | ")}` } satisfies GenerateResponse,
      { status: 400 },
    );
  }

  let client: OpenAI;
  try {
    client = getClient();
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message } satisfies GenerateResponse,
      { status: 500 },
    );
  }

  const systemPrompt = buildComposeSystemPrompt(domainValidation.domain);
  const result: GenerateResponse = {};

  try {
    if (mode === "pseudocode" || mode === "full") {
      const userMsg = buildPseudocodePrompt(prompt);
      result.pseudocode = await callModel(client, systemPrompt, userMsg);
    }

    if (mode === "json" || mode === "full") {
      const pseudocode =
        mode === "full"
          ? result.pseudocode!
          : existingPseudocode ?? "";

      const userMsg = buildJsonPrompt(prompt, pseudocode);
      const rawOutput = await callModel(client, systemPrompt, userMsg);
      result.rawJson = extractJsonFromModelOutput(rawOutput);

      let parsed: unknown;
      try {
        parsed = JSON.parse(result.rawJson);
      } catch {
        result.validation = {
          ok: false,
          errors: ["Model output is not valid JSON"],
        };
        return NextResponse.json(result);
      }

      const validation = validatePatch(parsed, domainValidation.domain);
      result.validation = validation;
      if (validation.ok) {
        result.patch = validation.patch;
      }
    }
  } catch (e) {
    result.error = (e as Error).message;
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}
