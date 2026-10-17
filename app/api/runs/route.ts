import type { NextRequest } from "next/server";
import { getDomain } from "@/lib/ir/domains";
import { parseDomain } from "@/lib/ir/schema";
import { startRun } from "@/lib/runtime/runner";
import { listRuns } from "@/lib/runtime/store";
import { AppError } from "@/lib/llm/types";
import { errorResponse } from "@/lib/api-error";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { RunRequest, RunsListResponse } from "@/lib/api-types";
import type { Patch } from "@/lib/ir/types";

export const dynamic = "force-dynamic";

function clamp(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, value));
}

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "runs", 20, 60_000);
    const body = (await request.json()) as Partial<RunRequest>;
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
    if (!body.patch || typeof body.patch !== "object") {
      throw new AppError("MISSING_PATCH", "A compiled patch is required to start a run.", {
        status: 400,
      });
    }
    const mode = body.mode === "live" ? "live" : "demo";
    const run = await startRun({
      patch: body.patch as Patch,
      domain,
      mode,
      provider: body.provider,
      model: body.model,
      apiKey: body.apiKey,
      budget: {
        maxUsd: clamp(body.budget?.maxUsd, 0.01, 5),
        maxTokens: clamp(body.budget?.maxTokens, 1_000, 200_000),
        maxWallMs: clamp(body.budget?.maxWallMs, 5_000, 300_000),
        maxSteps: clamp(body.budget?.maxSteps, 1, 80),
      },
    });
    return Response.json({ runId: run.id, run });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET() {
  try {
    const runs = await listRuns(24);
    const response: RunsListResponse = {
      runs: runs.map((run) => ({
        id: run.id,
        status: run.status,
        mode: run.mode,
        model: run.model,
        startedAt: run.startedAt,
        costUsd: run.costUsd,
        domainId: run.domainId,
        title: run.artifact?.title,
        verification: run.artifact?.verification.supportRate,
      })),
    };
    return Response.json(response);
  } catch (error) {
    return errorResponse(error);
  }
}
