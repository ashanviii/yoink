"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api-client";
import { buildDownload } from "@/lib/client/build-download";
import type { DownloadRecipe, JobParams, JobState } from "@/lib/media-types";

export type DownloadPhase = "idle" | "starting" | "working" | "ready" | "error";

export interface DownloadState {
  phase: DownloadPhase;
  job: JobState | null;
  error: string | null;
  fileUrl: string | null;
}

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

export function useDownloadJob(recipe: DownloadRecipe, params?: JobParams) {
  const [state, setState] = useState<DownloadState>(IDLE);
  // Which params the current result belongs to; a finished file for an old trim/frame is stale.
  const [stateKey, setStateKey] = useState("");
  const key = JSON.stringify(params ?? {});
  const abortRef = useRef<AbortController | null>(null);
  const fileUrlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    },
    [],
  );

  const start = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
    fileUrlRef.current = null;
    setState({ phase: "starting", job: null, error: null, fileUrl: null });
    setStateKey(key);

    try {
      // Rebuilt from `key` so callers can pass a fresh params object every render.
      const file = await buildDownload(recipe, JSON.parse(key) as JobParams, {
        signal: controller.signal,
        onUpdate: ({ status, progress }) => {
          if (controller.signal.aborted) return;
          setState((s) => ({ ...s, phase: "working", job: { status, progress, fileName: null, sizeBytes: null } }));
        },
      });
      if (controller.signal.aborted) return;

      const fileUrl = URL.createObjectURL(file.blob);
      fileUrlRef.current = fileUrl;
      const job: JobState = { status: "ready", progress: 100, fileName: file.fileName, sizeBytes: file.blob.size };
      setState({ phase: "ready", job, error: null, fileUrl });
      triggerSave(fileUrl, file.fileName);
    } catch (err) {
      if (controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
      const message = err instanceof ApiError ? err.message : "Download failed. Try again.";
      setState({ phase: "error", job: null, error: message, fileUrl: null });
    }
  }, [recipe, key]);

  const saveAgain = useCallback(() => {
    if (state.fileUrl) triggerSave(state.fileUrl, state.job?.fileName ?? null);
  }, [state.fileUrl, state.job?.fileName]);

  const stale = stateKey !== key && (state.phase === "ready" || state.phase === "error");
  return { state: stale ? IDLE : state, start, saveAgain };
}
