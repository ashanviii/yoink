import { AppError, errorResponse } from "@/lib/errors";
import { chargeTransfer, checkTransfer, clientKey, limiters } from "@/lib/server/rate-limit";
import { isAllowedThumbnailUrl } from "@/lib/server/thumbnails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = /^image\/(jpeg|png|webp|avif|gif|heic)$/i;

export async function GET(request: Request) {
  try {
    const key = clientKey(request);
    limiters.thumb.consume(key);
    checkTransfer(key);
    const raw = new URL(request.url).searchParams.get("u") ?? "";
    const target = isAllowedThumbnailUrl(raw);
    if (!target) throw new AppError("BAD_REQUEST", "Thumbnail host not allowed.");

    const upstream = await fetch(target, {
      redirect: "error", // a redirect could point outside the allowlist
      signal: AbortSignal.timeout(8_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; yoink-thumbnail/1.0)", Accept: "image/*" },
    });
    if (!upstream.ok || !upstream.body) throw new AppError("NOT_FOUND", "Thumbnail unavailable.");

    const type = (upstream.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!ALLOWED_TYPES.test(type)) throw new AppError("BAD_REQUEST", "Not an image.");
    const length = Number(upstream.headers.get("content-length") ?? 0);
    if (length > MAX_BYTES) throw new AppError("TOO_LARGE");

    const buffer = await upstream.arrayBuffer();
    chargeTransfer(key, buffer.byteLength);
    if (buffer.byteLength > MAX_BYTES) throw new AppError("TOO_LARGE");

    return new Response(buffer, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=3600, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (err) {
    if (err instanceof Error && (err.name === "TimeoutError" || err.name === "TypeError")) {
      return errorResponse(new AppError("UPSTREAM_TIMEOUT", "Thumbnail unavailable."));
    }
    return errorResponse(err);
  }
}
