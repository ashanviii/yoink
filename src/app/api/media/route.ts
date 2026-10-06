import { errorResponse } from "@/lib/errors";
import { proxyMedia } from "@/lib/server/media-proxy";
import { clientKey, limiters } from "@/lib/server/rate-limit";
import { openMediaToken } from "@/lib/server/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Streams a resolved media file (or HLS playlist) for browsers that can't fetch the CDN directly. */
export async function GET(request: Request) {
  try {
    limiters.media.consume(clientKey(request));
    const payload = openMediaToken(new URL(request.url).searchParams.get("t"));
    return await proxyMedia(payload, request);
  } catch (err) {
    return errorResponse(err);
  }
}
