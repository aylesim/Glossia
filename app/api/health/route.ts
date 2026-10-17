import { activeRunCount } from "@/lib/runtime/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return Response.json({
    ok: true,
    service: "glossia",
    activeRuns: activeRunCount(),
    now: new Date().toISOString(),
  });
}
