import type { ApiErrorBody } from "./errors";
import type { JobParams, JobState, ResolveResponse } from "./media-types";

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

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError("NETWORK", "Can't reach yoink right now — check your connection and try again.");
  }

  const body = (await response.json().catch(() => null)) as T | ApiErrorBody | null;
  if (!response.ok) {
    const error = (body as ApiErrorBody | null)?.error;
    const retryAfter = Number(response.headers.get("Retry-After")) || undefined;
    throw new ApiError(error?.code ?? "INTERNAL", error?.message ?? "Something went wrong. Try again.", retryAfter);
  }
  if (body === null) throw new ApiError("INTERNAL", "Unexpected response from the server.");
  return body as T;
}

export function resolveMedia(url: string, signal?: AbortSignal): Promise<ResolveResponse> {
  return request("/api/resolve", { method: "POST", body: JSON.stringify({ url }), signal });
}

export function startJob(token: string, params?: JobParams): Promise<JobState> {
  return request("/api/jobs", { method: "POST", body: JSON.stringify({ token, ...params }) });
}

export function getJob(id: string, signal?: AbortSignal): Promise<JobState> {
  return request(`/api/jobs/${encodeURIComponent(id)}`, { signal, cache: "no-store" });
}

export function previewSpriteUrl(previewId: string): string {
  return `/api/preview/${encodeURIComponent(previewId)}`;
}

export function previewFrameUrl(previewId: string, sec: number): string {
  return `${previewSpriteUrl(previewId)}/frame?t=${sec.toFixed(1)}`;
}

export function jobFileUrl(id: string): string {
  return `/api/jobs/${encodeURIComponent(id)}/file`;
}
