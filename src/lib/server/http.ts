import "server-only";
import { AppError } from "@/lib/errors";

const MAX_JSON_BYTES = 8 * 1024;

/** Reads a small JSON body, rejecting oversized or non-JSON payloads. */
export async function readJson(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new AppError("BAD_REQUEST", "Expected a JSON body.");
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_JSON_BYTES) throw new AppError("BAD_REQUEST", "Request body too large.");

  const text = await request.text();
  if (text.length > MAX_JSON_BYTES) throw new AppError("BAD_REQUEST", "Request body too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("BAD_REQUEST", "Malformed JSON.");
  }
}

/** Blocks cross-site POSTs (cheap CSRF / hotlink protection for the API). */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return; // same-origin fetches from older browsers / curl
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    if (new URL(origin).host !== host) throw new AppError("BAD_REQUEST", "Cross-origin requests are not allowed.");
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("BAD_REQUEST", "Bad origin.");
  }
}

export const noStore = { "Cache-Control": "no-store" } as const;
