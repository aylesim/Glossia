import type { NextRequest } from "next/server";
import { createAdapter } from "@/lib/llm/adapter";
import { runEvalSuite } from "@/lib/eval/runner";
import { loadLatestEval } from "@/lib/runtime/store";
import { errorResponse } from "@/lib/api-error";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { EvalRequest } from "@/lib/api-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "eval", 5, 60_000);
    const body = (await request.json().catch(() => ({}))) as Partial<EvalRequest>;
    const mode = body.mode === "live" ? "live" : "demo";
    const adapter = createAdapter({
      mode,
      provider: body.provider,
      model: body.model,
      apiKey: body.apiKey,
    });
    const report = await runEvalSuite({
      mode,
      adapter,
      limit: body.limit,
      domainId: body.domainId,
    });
    return Response.json({ report });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET() {
  try {
    const report = await loadLatestEval();
    return Response.json({ report: report ?? null });
  } catch (error) {
    return errorResponse(error);
  }
}
