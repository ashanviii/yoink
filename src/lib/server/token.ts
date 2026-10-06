import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { config } from "./config";

/**
 * A media stream the /api/media proxy may fetch, sealed (AES-256-GCM) so clients
 * can neither forge targets — the proxy is never an open relay — nor read the
 * upstream headers, which can carry cookies.
 */
const payloadSchema = z.object({
  /** upstream https URL */
  u: z.string().url(),
  /** request headers the CDN expects (User-Agent, Referer, Cookie, …) */
  h: z.record(z.string(), z.string()),
  /** HLS playlist: the proxy rewrites its URIs to sealed proxy URLs */
  x: z.boolean(),
  /** expiry, unix seconds */
  e: z.number().int(),
});

export type MediaTokenPayload = z.infer<typeof payloadSchema>;

let keyCache: Buffer | undefined;
function key(): Buffer {
  keyCache ??= createHash("sha256").update(`yoink-media-token:${config.secret}`).digest();
  return keyCache;
}

export function sealMediaToken(payload: Omit<MediaTokenPayload, "e">, expiresAt?: number): string {
  const full: MediaTokenPayload = { ...payload, e: expiresAt ?? Math.floor(Date.now() / 1000) + config.tokenTtlSec };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(full), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

export function openMediaToken(token: unknown): MediaTokenPayload {
  if (typeof token !== "string" || token.length < 40 || token.length > 8192) {
    throw new AppError("BAD_REQUEST", "Invalid media token.");
  }
  let parsed: unknown;
  try {
    const raw = Buffer.from(token, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    parsed = JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8"));
  } catch {
    throw new AppError("BAD_REQUEST", "Invalid media token.");
  }
  const result = payloadSchema.safeParse(parsed);
  if (!result.success) throw new AppError("BAD_REQUEST", "Invalid media token.");
  if (result.data.e < Date.now() / 1000) throw new AppError("EXPIRED");
  return result.data;
}

export function mediaProxyUrl(token: string): string {
  return `/api/media?t=${token}`;
}
