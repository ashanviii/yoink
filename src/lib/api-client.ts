import type { ApiErrorBody } from "./errors";
import { TURNSTILE_HEADER, turnstileToken } from "./client/turnstile";
import type { ResolveResponse } from "./media-types";

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const NETWORK_ERROR = "Can't reach Yoinkit right now — check your connection and try again.";

/** Turns one of our API's error responses into an ApiError. */
export async function errorFromResponse(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
  const retryAfter = Number(response.headers.get("Retry-After")) || undefined;
  return new ApiError(body?.error?.code ?? "INTERNAL", body?.error?.message ?? "Something went wrong. Try again.", retryAfter);
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("NETWORK", NETWORK_ERROR);
  }

  if (!response.ok) throw await errorFromResponse(response);
  const body = (await response.json().catch(() => null)) as T | null;
  if (body === null) throw new ApiError("INTERNAL", "Unexpected response from the server.");
  return body;
}

export async function resolveMedia(url: string, signal?: AbortSignal): Promise<ResolveResponse> {
  let token: string | null;
  try {
    token = await turnstileToken();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("BOT_CHECK", "We couldn't verify you're human. Refresh the page and try again.");
  }
  signal?.throwIfAborted();
  return request("/api/resolve", {
    method: "POST",
    body: JSON.stringify({ url }),
    signal,
    headers: token ? { [TURNSTILE_HEADER]: token } : undefined,
  });
}
