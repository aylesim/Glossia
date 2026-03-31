import OpenAI from "openai";

export function createOpenAiClient(apiKeyFromRequest?: string | null): OpenAI {
  const key =
    (typeof apiKeyFromRequest === "string" && apiKeyFromRequest.trim()) ||
    process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "OpenAI API key missing. Paste your key in the app, or set OPENAI_API_KEY when running locally.",
    );
  }
  return new OpenAI({ apiKey: key });
}

export function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
}
