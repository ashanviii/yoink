export type ErrorCode =
  | "BAD_REQUEST"
  | "INVALID_URL"
  | "RATE_LIMITED"
  | "BUSY"
  | "NOT_FOUND"
  | "PRIVATE"
  | "LOGIN_REQUIRED"
  | "AGE_RESTRICTED"
  | "GEO_BLOCKED"
  | "LIVE"
  | "DRM"
  | "NO_MEDIA"
  | "TOO_LARGE"
  | "TOO_LONG"
  | "UPSTREAM_BLOCKED"
  | "UPSTREAM_TIMEOUT"
  | "EXPIRED"
  | "JOB_NOT_FOUND"
  | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  INVALID_URL: 422,
  RATE_LIMITED: 429,
  BUSY: 503,
  NOT_FOUND: 404,
  PRIVATE: 403,
  LOGIN_REQUIRED: 403,
  AGE_RESTRICTED: 403,
  GEO_BLOCKED: 451,
  LIVE: 422,
  DRM: 422,
  NO_MEDIA: 422,
  TOO_LARGE: 413,
  TOO_LONG: 413,
  UPSTREAM_BLOCKED: 502,
  UPSTREAM_TIMEOUT: 504,
  EXPIRED: 410,
  JOB_NOT_FOUND: 404,
  INTERNAL: 500,
};

const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  BAD_REQUEST: "That request didn't make sense to us.",
  INVALID_URL: "That link isn't supported.",
  RATE_LIMITED: "Whoa, slow down! Too many requests — try again in a moment.",
  BUSY: "We're at capacity right now. Give it a few seconds and retry.",
  NOT_FOUND: "Couldn't find that post. It may have been deleted or the link is wrong.",
  PRIVATE: "This content is private. We only download public posts.",
  LOGIN_REQUIRED:
    "The platform requires a login to view this. We only fetch publicly accessible content.",
  AGE_RESTRICTED: "This video is age-restricted, so we can't fetch it without a signed-in account.",
  GEO_BLOCKED: "This content isn't available in our server's region.",
  LIVE: "Live streams can't be downloaded while they're live. Try again once it has ended.",
  DRM: "This content is DRM-protected, so it can't be downloaded.",
  NO_MEDIA: "We couldn't find any downloadable video or audio in that link.",
  TOO_LARGE: "That file is bigger than our size limit.",
  TOO_LONG: "That video is longer than our length limit.",
  UPSTREAM_BLOCKED:
    "The platform is temporarily blocking our requests. Please try again in a little while.",
  UPSTREAM_TIMEOUT: "The platform took too long to respond. Try again.",
  EXPIRED: "This download link expired. Fetch the media again to get a fresh one.",
  JOB_NOT_FOUND: "That download wasn't found — it may have expired. Start it again.",
  INTERNAL: "Something broke on our side. Try again in a bit.",
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly retryAfter?: number;

  constructor(code: ErrorCode, message?: string, options?: { retryAfter?: number; cause?: unknown }) {
    super(message ?? DEFAULT_MESSAGES[code], { cause: options?.cause });
    this.name = "AppError";
    this.code = code;
    this.status = STATUS[code];
    this.retryAfter = options?.retryAfter;
  }
}

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string };
}

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  return new AppError("INTERNAL", undefined, { cause: err });
}

export function errorResponse(err: unknown): Response {
  const appErr = toAppError(err);
  if (appErr.code === "INTERNAL") console.error("[yoink] internal error", err);
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (appErr.retryAfter) headers["Retry-After"] = String(appErr.retryAfter);
  const body: ApiErrorBody = { error: { code: appErr.code, message: appErr.message } };
  return Response.json(body, { status: appErr.status, headers });
}
