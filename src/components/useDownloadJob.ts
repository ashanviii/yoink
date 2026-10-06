"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, getJob, jobFileUrl, startJob } from "@/lib/api-client";
import type { JobParams, JobState } from "@/lib/media-types";

export type DownloadPhase = "idle" | "starting" | "working" | "ready" | "error";

export interface DownloadState {
  phase: DownloadPhase;
  job: JobState | null;
  error: string | null;
  fileUrl: string | null;
}

const POLL_MS = 800;

function triggerSave(url: string, fileName: string | null) {
  const anchor = document.createElement("a");
  anchor.href = url;
  if (fileName) anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

const IDLE: DownloadState = { phase: "idle", job: null, error: null, fileUrl: null };

export function useDownloadJob(token: string, params?: JobParams) {
  const [state, setState] = useState<DownloadState>(IDLE);
  // Which params the current result belongs to; a finished file for an old trim/frame is stale.
  const [stateKey, setStateKey] = useState("");
  const key = JSON.stringify(params ?? {});
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const start = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ phase: "starting", job: null, error: null, fileUrl: null });
    setStateKey(key);

    try {
      // Rebuilt from `key` so callers can pass a fresh params object every render.
      let job = await startJob(token, JSON.parse(key) as JobParams);
      setState((s) => ({ ...s, phase: "working", job }));

      while (job.status !== "ready" && job.status !== "error") {
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        if (controller.signal.aborted) return;
        job = await getJob(job.id, controller.signal);
        setState((s) => ({ ...s, job }));
      }

      if (job.status === "error") {
        setState({ phase: "error", job, error: job.error?.message ?? "Download failed.", fileUrl: null });
        return;
      }

      const fileUrl = jobFileUrl(job.id);
      setState({ phase: "ready", job, error: null, fileUrl });
      triggerSave(fileUrl, job.fileName);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const message = err instanceof ApiError ? err.message : "Download failed. Try again.";
      setState({ phase: "error", job: null, error: message, fileUrl: null });
    }
  }, [token, key]);

  const saveAgain = useCallback(() => {
    if (state.fileUrl) triggerSave(state.fileUrl, state.job?.fileName ?? null);
  }, [state.fileUrl, state.job?.fileName]);

  const stale = stateKey !== key && (state.phase === "ready" || state.phase === "error");
  return { state: stale ? IDLE : state, start, saveAgain };
}
