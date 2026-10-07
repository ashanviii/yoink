import "server-only";
import { AppError } from "@/lib/errors";
import { config } from "./config";

interface Bucket {
  tokens: number;
  updatedAt: number;
}

/**
 * In-memory token bucket. yoink runs as a single long-lived Node process (it
 * needs a local yt-dlp), so process memory is the right scope. Swap this
 * for Redis if you ever scale horizontally.
 */
export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly refillPerMs: number;

  constructor(
    private readonly capacity: number,
    windowMs: number,
  ) {
    this.refillPerMs = capacity / windowMs;
  }

  /**
   * Throws a RATE_LIMITED AppError when `key` has less than one token left, else
   * deducts `cost`. A cost of 0 only checks that the budget isn't exhausted.
   */
  consume(key: string, cost = 1, message?: string): void {
    const bucket = this.refill(key);
    if (bucket.tokens < 1) {
      const retryAfter = Math.ceil((1 - bucket.tokens) / this.refillPerMs / 1000);
      throw new AppError("RATE_LIMITED", message, { retryAfter });
    }
    bucket.tokens -= cost;
  }

  /** Deducts usage measured after the fact (e.g. bytes streamed). The balance may go negative. */
  charge(key: string, amount: number): void {
    this.refill(key).tokens -= amount;
  }

  private refill(key: string): Bucket {
    const now = Date.now();
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, updatedAt: now };
    bucket.tokens = Math.min(this.capacity, bucket.tokens + (now - bucket.updatedAt) * this.refillPerMs);
    bucket.updatedAt = now;
    this.buckets.set(key, bucket);
    if (this.buckets.size > 50_000) this.sweep(now);
    return bucket;
  }

  private sweep(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.tokens + (now - bucket.updatedAt) * this.refillPerMs >= this.capacity) this.buckets.delete(key);
    }
  }
}

type Limiters = { resolve: RateLimiter; media: RateLimiter; thumb: RateLimiter; bytes: RateLimiter };

// Survive dev hot reloads without resetting counters.
const globalForLimits = globalThis as unknown as { __yoinkLimiters?: Limiters };
export const limiters: Limiters = (globalForLimits.__yoinkLimiters ??= {
  // Each resolve is one video lookup: 3 per minute per IP, refilling one every 20 s.
  resolve: new RateLimiter(3, 60_000),
  // Proxied media: a video element seeks with many range requests and an HLS stream is one request per segment.
  media: new RateLimiter(600, 60_000),
  thumb: new RateLimiter(60, 60_000),
  // Bytes relayed through /api/media and /api/thumb: 1 GB per IP per hour, so a script
  // replaying a media token can't burn through the server's monthly transfer.
  bytes: new RateLimiter(1024 ** 3, 60 * 60_000),
});

export const BYTE_LIMIT_MESSAGE = "You've hit the hourly download limit. Try again a bit later.";

let warnedUnsafeIp = false;

/**
 * Client identifier for per-IP limits. Next.js only sets X-Forwarded-For when
 * the client didn't send one, so the header is trustworthy only when a proxy
 * you control overwrites or appends to it — see config.clientIpHeader/trustedProxyHops.
 */
export function clientKey(request: Request): string {
  if (config.clientIpHeader) {
    return request.headers.get(config.clientIpHeader)?.split(",")[0]?.trim() || "unknown";
  }

  const hops = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);

  if (config.trustedProxyHops > 0) {
    // Each trusted proxy appends the address it saw; anything further left is client-supplied.
    return hops[hops.length - config.trustedProxyHops] ?? hops[0] ?? "unknown";
  }

  if (process.env.NODE_ENV === "production" && !warnedUnsafeIp) {
    warnedUnsafeIp = true;
    console.warn(
      "[yoink] Neither YOINK_CLIENT_IP_HEADER nor YOINK_TRUSTED_PROXY_HOPS is set — per-IP rate limits can be bypassed. Global caps still apply.",
    );
  }
  return hops[0] ?? "unknown";
}
