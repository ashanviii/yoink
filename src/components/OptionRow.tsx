"use client";

import { formatBytes } from "@/lib/format";
import { GIF_SIZE, MAX_GIF_SEC, type DownloadRecipe, type JobParams, type MediaOption } from "@/lib/media-types";
import { AlertIcon, CheckIcon, DownloadIcon, RetryIcon } from "./icons";
import { useDownloadJob } from "./useDownloadJob";

const STAGE_LABEL: Record<string, string> = {
  queued: "In line…",
  downloading: "Yoinking…",
  preparing: "Getting the editor ready…",
  processing: "Stitching it together…",
};

interface JobRowProps {
  recipe: DownloadRecipe;
  params?: JobParams;
  label: string;
  /** Text on the download button, e.g. "MP4". */
  action: string;
  detail: string;
  badges?: string[];
  best?: boolean;
  sizeBytes?: number | null;
  sizeIsEstimate?: boolean;
  processingLabel?: string;
  /** Why this can't be made right now (e.g. the clip is too long); disables the button. */
  unavailable?: string;
}

/** One downloadable thing: builds it in the browser on click and shows its progress inline. */
export function JobRow({
  recipe,
  params,
  label,
  action,
  detail,
  badges = [],
  best,
  sizeBytes = null,
  sizeIsEstimate = false,
  processingLabel,
  unavailable,
}: JobRowProps) {
  const { state, start, saveAgain } = useDownloadJob(recipe, params);
  const busy = state.phase === "starting" || state.phase === "working";
  const progress = state.job?.progress ?? 0;
  const size = formatBytes(state.job?.sizeBytes ?? sizeBytes, state.job?.sizeBytes ? false : sizeIsEstimate);
  const status = state.job?.status ?? "queued";
  const stage = (status === "processing" && processingLabel) || STAGE_LABEL[status] || "Working…";

  return (
    <li className="relative overflow-hidden rounded-lg border border-border bg-surface transition hover:border-text/40">
      {busy && (
        <div
          className="progress-stripes absolute inset-y-0 left-0 bg-accent/70 transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(progress, state.job?.status === "queued" || state.phase === "starting" ? 4 : 6)}%` }}
          aria-hidden
        />
      )}
      <div className="relative flex items-center gap-3 p-3 pl-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-base font-semibold">{label}</span>
            {best && (
              <span className="rounded bg-text px-1.5 py-0.5 text-[11px] font-semibold text-bg">
                Best
              </span>
            )}
            {badges.map((badge) => (
              <span key={badge} className="rounded border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted">
                {badge}
              </span>
            ))}
          </div>
          <p className="truncate text-xs text-muted" aria-live="polite">
            {busy
              ? `${stage}${status === "downloading" || progress > 0 ? ` ${Math.round(progress)}%` : ""}`
              : state.phase === "error"
                ? <span className="text-danger">{state.error}</span>
                : state.phase === "ready"
                  ? `Saved${size ? ` · ${size}` : ""}. Check your downloads.`
                  : unavailable ?? [detail, size].filter(Boolean).join(" · ")}
          </p>
        </div>

        {state.phase === "ready" ? (
          <button
            type="button"
            onClick={saveAgain}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink"
          >
            <CheckIcon size={16} /> Save again
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={busy || !!unavailable}
            aria-label={`Download ${label} ${action}`}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg bg-text px-4 py-2.5 text-sm font-semibold text-bg transition hover:opacity-85 disabled:opacity-70 ${
              unavailable ? "disabled:cursor-not-allowed disabled:opacity-40" : "disabled:cursor-wait"
            }`}
          >
            {busy ? (
              <span className="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" aria-hidden />
            ) : state.phase === "error" ? (
              <RetryIcon size={16} />
            ) : state.phase === "idle" ? (
              <DownloadIcon size={16} />
            ) : (
              <AlertIcon size={16} />
            )}
            <span>{busy ? "Wait" : state.phase === "error" ? "Retry" : action}</span>
          </button>
        )}
      </div>
    </li>
  );
}

/** The video's edits other than output format, frames or anything set elsewhere. */
export type VideoEdits = Omit<JobParams, "frames" | "format">;

/** The edited video as a GIF and as WebM, built from one source quality. */
export function FormatRows({ option, edits, clipSec }: { option: MediaOption; edits: VideoEdits; clipSec: number }) {
  // A GIF's length after any speed change; long ones make enormous files.
  const gifSec = clipSec / (edits.speed ?? 1);
  return (
    <>
      <li className="px-1 pt-2 text-xs font-medium text-muted">Other formats</li>
      <JobRow
        recipe={option.recipe}
        params={{ ...edits, format: "gif" }}
        label="GIF"
        action="GIF"
        detail={`Animated · up to ${GIF_SIZE}px · no sound`}
        processingLabel="Making the GIF…"
        unavailable={gifSec > MAX_GIF_SEC ? `GIFs can be up to ${MAX_GIF_SEC} s. Turn on Trim to pick a shorter part.` : undefined}
      />
      <JobRow
        recipe={option.recipe}
        params={{ ...edits, format: "webm" }}
        label="WebM"
        action="WEBM"
        detail={`${option.label} · VP8 + Opus · slow for long videos`}
        processingLabel="Converting to WebM…"
      />
    </>
  );
}

/** `edits` holds the video's trim, crop, speed, rotation and flip, if any. */
export function OptionRow({ option, edits }: { option: MediaOption; edits?: VideoEdits }) {
  // `!== undefined`, not truthiness: a volume of 0 (mute) is an edit.
  const params = edits && Object.values(edits).some((value) => value !== undefined) ? edits : undefined;
  return (
    <JobRow
      recipe={option.recipe}
      params={params}
      label={option.label}
      action={option.ext.toUpperCase()}
      detail={option.detail}
      badges={option.badges}
      best={option.best}
      sizeBytes={option.sizeBytes}
      sizeIsEstimate={option.sizeIsEstimate}
    />
  );
}
