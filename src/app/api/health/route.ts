import { noStore } from "@/lib/server/http";
import { resolveSlots } from "@/lib/server/resolve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness + load snapshot for uptime checks and load testing. */
export function GET() {
  return Response.json(
    { ok: true, resolves: resolveSlots.stats, memoryMb: Math.round(process.memoryUsage().rss / 1048576) },
    { headers: noStore },
  );
}
