"use client";

import { formatBytes } from "@/lib/format";
import type { DownloadRecipe, JobParams, MediaOption, TrimParams } from "@/lib/media-types";
import { AlertIcon, CheckIcon, DownloadIcon, RetryIcon } from "./icons";
import { useDownloadJob } from "./useDownloadJob";

const STAGE_LABEL: Record<string, string> = {
  queued: "In line…",
  downloading: "Yoinking…",
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
}

/** One downloadable thing: builds it in the browser on click and shows its progress inline. */
export function JobRow({ recipe, params, label, action, detail, badges = [], best, sizeBytes = null, sizeIsEstimate = false, processingLabel }: JobRowProps) {
  const { state, start, saveAgain } = useDownloadJob(recipe, params);
  const busy = state.phase === "starting" || state.phase === "working";
  const progress = state.job?.progress ?? 0;
  const size = formatBytes(state.job?.sizeBytes ?? sizeBytes, state.job?.sizeBytes ? false : sizeIsEstimate);
  const status = state.job?.status ?? "queued";
  const stage = (status === "processing" && processingLabel) || STAGE_LABEL[status] || "Working…";

  return (
    <li className="relative overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-text/40">
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
            <span className="font-display text-lg font-bold">{label}</span>
            {best && (
              <span className="rounded-full bg-pop px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Best
              </span>
            )}
            {badges.map((badge) => (
              <span key={badge} className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                {badge}
              </span>
            ))}
          </div>
          <p className="truncate text-xs text-muted" aria-live="polite">
            {busy
              ? `${stage}${state.job?.status === "downloading" ? ` ${Math.round(progress)}%` : ""}`
              : state.phase === "error"
                ? <span className="text-danger">{state.error}</span>
                : state.phase === "ready"
                  ? `Saved${size ? ` · ${size}` : ""} — check your downloads`
                  : [detail, size].filter(Boolean).join(" · ")}
          </p>
        </div>

        {state.phase === "ready" ? (
          <button
            type="button"
            onClick={saveAgain}
            className="flex shrink-0 animate-pop items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink active:scale-95"
          >
            <CheckIcon size={16} /> Save again
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={busy}
            aria-label={`Download ${label} ${action}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-text px-4 py-2.5 text-sm font-bold text-bg transition hover:-translate-y-0.5 hover:shadow-[0_4px_0_0_var(--pop)] active:translate-y-0 active:scale-95 active:shadow-none disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none"
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

export function OptionRow({ option, trim }: { option: MediaOption; trim?: TrimParams }) {
  return (
    <JobRow
      recipe={option.recipe}
      params={trim ? { trim } : undefined}
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
