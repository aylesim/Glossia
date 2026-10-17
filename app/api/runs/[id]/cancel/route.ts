import type { NextRequest } from "next/server";
import { cancelRun, loadRun } from "@/lib/runtime/store";
import { errorResponse } from "@/lib/api-error";
import { AppError } from "@/lib/llm/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const run = await loadRun(id);
    if (!run) {
      throw new AppError("RUN_NOT_FOUND", `Run "${id}" was not found.`, { status: 404 });
    }
    const cancelled = cancelRun(id);
    return Response.json({ ok: true, cancelled, status: run.status });
  } catch (error) {
    return errorResponse(error);
  }
}
