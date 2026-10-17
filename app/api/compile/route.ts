import type { NextRequest } from "next/server";
import { compileIntent } from "@/lib/compiler";
import { getDomain } from "@/lib/ir/domains";
import { parseDomain } from "@/lib/ir/schema";
import { createAdapter } from "@/lib/llm/adapter";
import { AppError } from "@/lib/llm/types";
import { errorResponse } from "@/lib/api-error";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { CompileRequest } from "@/lib/api-types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "compile", 30, 60_000);
    const body = (await request.json()) as Partial<CompileRequest>;
    const intent = typeof body.intent === "string" ? body.intent.trim() : "";
    if (intent.length < 3) {
      throw new AppError("INVALID_INTENT", "Describe the workflow in at least a few words.", {
        status: 400,
      });
    }
    if (intent.length > 2_000) {
      throw new AppError("INVALID_INTENT", "The intent is too long (max 2000 characters).", {
        status: 400,
      });
    }
    const mode = body.mode === "live" ? "live" : "demo";
    let domain = getDomain(String(body.domainId ?? "research-brief"));
    if (body.domainJson) {
      const parsed = parseDomain(body.domainJson);
      if (!parsed.success) {
        throw new AppError("INVALID_DOMAIN", "The imported domain JSON is invalid.", {
          status: 400,
          hint: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(" | "),
        });
      }
      domain = parsed.data;
    }
    if (!domain) {
      throw new AppError("UNKNOWN_DOMAIN", `Unknown domain "${String(body.domainId)}".`, {
        status: 404,
      });
    }

    const adapter = createAdapter({
      mode,
      provider: body.provider,
      model: body.model,
      apiKey: body.apiKey,
    });
    const result = await compileIntent({ domain, intent, adapter, mode });
    return Response.json({ result });
  } catch (error) {
    return errorResponse(error);
  }
}
