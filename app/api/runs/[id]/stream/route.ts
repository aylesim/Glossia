import type { NextRequest } from "next/server";
import type { RunEvent } from "@/lib/ir/types";
import { getActiveRun, loadRun, subscribeToRun } from "@/lib/runtime/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sseFrame(event: RunEvent): string {
  return `id: ${event.seq}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const run = await loadRun(id);
  if (!run) {
    return Response.json({ error: { code: "RUN_NOT_FOUND", message: "Run not found." } }, { status: 404 });
  }

  const url = new URL(request.url);
  const lastEventId = Number(request.headers.get("last-event-id") ?? url.searchParams.get("after") ?? 0);
  const after = Number.isFinite(lastEventId) ? Math.max(0, lastEventId) : 0;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let unsubscribe: () => void = () => {};
      const timers: {
        heartbeat?: ReturnType<typeof setInterval>;
        watch?: ReturnType<typeof setInterval>;
      } = {};
      const send = (event: RunEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(sseFrame(event)));
        } catch {
          closed = true;
        }
      };
      const close = () => {
        if (closed) return;
        closed = true;
        if (timers.heartbeat) clearInterval(timers.heartbeat);
        if (timers.watch) clearInterval(timers.watch);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      controller.enqueue(encoder.encode("retry: 1200\n\n"));
      unsubscribe = subscribeToRun(id, after, send);
      const active = getActiveRun(id);

      if (!active) {
        // Persisted run: replay a single terminal snapshot so a late client
        // still reaches a final state.
        if (run.status === "completed") {
          send({
            seq: after + 1,
            type: "run.completed",
            runId: id,
            at: run.endedAt ?? run.startedAt,
            costUsd: run.costUsd,
            usage: run.usage,
            artifact: run.artifact,
            durationMs: run.durationMs ?? 0,
          });
        } else {
          send({
            seq: after + 1,
            type: "run.failed",
            runId: id,
            at: run.endedAt ?? run.startedAt,
            error: run.error?.message ?? "This run is not active and has no terminal result.",
            code: run.error?.code ?? "RUN_LOST",
          });
        }
        setTimeout(close, 30);
        return;
      }

      timers.heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          close();
        }
      }, 10_000);

      timers.watch = setInterval(() => {
        const current = getActiveRun(id);
        if (!current) {
          close();
          return;
        }
        if (["completed", "failed", "cancelled", "budget_exceeded"].includes(current.run.status)) {
          setTimeout(close, 250);
        }
      }, 400);

      request.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
