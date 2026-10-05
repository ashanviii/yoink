import { errorResponse } from "@/lib/errors";
import { getPreviewSprite } from "@/lib/server/preview";
import { clientKey, limiters } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Filmstrip sprite (PREVIEW_FRAMES frames in one row) for the trim editor. */
export async function GET(request: Request, ctx: RouteContext<"/api/preview/[id]">) {
  try {
    limiters.thumb.consume(clientKey(request));
    const { id } = await ctx.params;
    const sprite = await getPreviewSprite(id);
    return new Response(new Uint8Array(sprite), {
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
