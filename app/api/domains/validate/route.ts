import type { NextRequest } from "next/server";
import { parseDomain } from "@/lib/ir/schema";
import { AppError } from "@/lib/llm/types";
import { errorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { domain?: unknown };
    const parsed = parseDomain(body.domain);
    if (!parsed.success) {
      throw new AppError("INVALID_DOMAIN", "The domain JSON is not valid.", {
        status: 400,
        hint: parsed.error.issues
          .slice(0, 8)
          .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
          .join(" | "),
      });
    }
    return Response.json({ domain: parsed.data });
  } catch (error) {
    return errorResponse(error);
  }
}
