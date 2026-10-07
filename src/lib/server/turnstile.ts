import "server-only";
import { AppError } from "@/lib/errors";
import { config } from "./config";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Header the browser sends the token in (see lib/client/turnstile.ts). */
const TURNSTILE_HEADER = "x-turnstile-token";

/**
 * Checks the request's Cloudflare Turnstile token, so scripts can't call the
 * resolver no matter how many IPs they rotate through. Tokens are single-use.
 * Disabled until YOINK_TURNSTILE_SECRET is set; fails closed once it is.
 */
export async function assertHuman(request: Request, ip: string): Promise<void> {
  if (!config.turnstileSecret) return;
  const token = request.headers.get(TURNSTILE_HEADER);
  if (!token || token.length > 2048) throw new AppError("BOT_CHECK");

  let outcome: { success?: boolean };
  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      body: new URLSearchParams({ secret: config.turnstileSecret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(10_000),
    });
    outcome = (await response.json()) as { success?: boolean };
  } catch (err) {
    throw new AppError("BOT_CHECK", undefined, { cause: err });
  }
  if (outcome.success !== true) throw new AppError("BOT_CHECK");
}
