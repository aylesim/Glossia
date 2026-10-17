import type { NextRequest } from "next/server";
import { loadRun } from "@/lib/runtime/store";
import { errorResponse } from "@/lib/api-error";
import { AppError } from "@/lib/llm/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const run = await loadRun(id);
    if (!run) {
      throw new AppError("RUN_NOT_FOUND", `Run "${id}" was not found.`, { status: 404 });
    }
    return Response.json({ run });
  } catch (error) {
    return errorResponse(error);
  }
}
