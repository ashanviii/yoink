import { errorResponse } from "@/lib/errors";
import { getPreviewStill } from "@/lib/server/preview";
import { clientKey, limiters } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A single low-res frame at ?t=<seconds> for the frame picker. */
export async function GET(request: Request, ctx: RouteContext<"/api/preview/[id]/frame">) {
  try {
    limiters.thumb.consume(clientKey(request));
    const { id } = await ctx.params;
    const sec = Number(new URL(request.url).searchParams.get("t"));
    const still = await getPreviewStill(id, sec);
    return new Response(new Uint8Array(still), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=1800",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
