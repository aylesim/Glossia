import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  buildSystemPrompt,
  buildPseudocodePrompt,
  buildJsonPrompt,
} from "@/lib/context";
import { validatePatch, extractJsonFromModelOutput } from "@/lib/schema";

export type GenerateMode = "full" | "pseudocode" | "json";

export type GenerateRequest = {
  prompt: string;
  mode: GenerateMode;
  pseudocode?: string;
};

export type GenerateResponse = {
  pseudocode?: string;
  rawJson?: string;
  validation?: { ok: true } | { ok: false; errors: string[] };
  patch?: unknown;
  error?: string;
};

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY non configurata nel server");
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
      { error: "Body JSON non valido" } satisfies GenerateResponse,
      { status: 400 },
    );
  }

  const { prompt, mode, pseudocode: existingPseudocode } = body;

  if (!prompt?.trim()) {
    return NextResponse.json(
      { error: "Il campo prompt è obbligatorio" } satisfies GenerateResponse,
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

  const systemPrompt = buildSystemPrompt();
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
          errors: ["L'output del modello non è JSON valido"],
        };
        return NextResponse.json(result);
      }

      const validation = validatePatch(parsed);
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
