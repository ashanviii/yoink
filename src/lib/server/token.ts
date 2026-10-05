import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { config } from "./config";

/**
 * Everything the download worker needs, signed so clients can only request
 * options we offered — never arbitrary URLs or yt-dlp format expressions.
 */
const payloadSchema = z.object({
  /** canonical source URL */
  u: z.string().url(),
  /** platform id */
  p: z.enum(["instagram", "tiktok", "pinterest"]),
  /** yt-dlp format selector */
  f: z.string().min(1).max(512),
  /** output mode */
  m: z.enum(["video", "audio-mp3", "audio-m4a"]),
  /** playlist item (1-based) for carousels, 0 = single */
  i: z.number().int().min(0).max(50),
  /** human label used in the filename, e.g. "1080p" */
  l: z.string().max(40),
  /** media id + title for the filename */
  n: z.string().max(120),
  /** expiry, unix seconds */
  e: z.number().int(),
});

export type DownloadTokenPayload = z.infer<typeof payloadSchema>;

function sign(data: string): string {
  return createHmac("sha256", config.secret).update(data).digest("base64url");
}

export function createDownloadToken(payload: Omit<DownloadTokenPayload, "e">): string {
  const full: DownloadTokenPayload = { ...payload, e: Math.floor(Date.now() / 1000) + config.tokenTtlSec };
  const data = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifyDownloadToken(token: unknown): DownloadTokenPayload {
  if (typeof token !== "string" || token.length > 4096) throw new AppError("BAD_REQUEST", "Invalid download token.");
  const [data, signature] = token.split(".");
  if (!data || !signature) throw new AppError("BAD_REQUEST", "Invalid download token.");

  const expected = Buffer.from(sign(data));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new AppError("BAD_REQUEST", "Invalid download token.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  } catch {
    throw new AppError("BAD_REQUEST", "Invalid download token.");
  }
  const result = payloadSchema.safeParse(parsed);
  if (!result.success) throw new AppError("BAD_REQUEST", "Invalid download token.");
  if (result.data.e < Date.now() / 1000) throw new AppError("EXPIRED");
  return result.data;
}
