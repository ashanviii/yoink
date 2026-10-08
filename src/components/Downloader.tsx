"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { ApiError, resolveMedia } from "@/lib/api-client";
import { preloadTurnstile } from "@/lib/client/turnstile";
import type { ResolveResponse } from "@/lib/media-types";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import { URL_ERROR_MESSAGES, parseMediaUrl } from "@/lib/url";
import { AlertIcon, ArrowIcon, ClipboardIcon, LinkIcon, PlatformIcon, XIcon } from "./icons";
import { ResultCard } from "./ResultCard";

type Status = "idle" | "loading" | "done" | "error";

const noopSubscribe = () => () => {};

interface Props {
  placeholder?: string;
  /** Platform this page is about — used only for the empty-state hint. */
  platform?: PlatformId;
}

export function Downloader({ placeholder = "Paste a Reel, TikTok, Facebook, Snap or Pin link…", platform }: Props) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ResolveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const canPaste = useSyncExternalStore(
    noopSubscribe,
    () => !!navigator.clipboard?.readText,
    () => false,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => (input.trim() ? parseMediaUrl(input) : null), [input]);
  const detected = parsed?.ok ? PLATFORMS[parsed.value.platform] : null;

  const fail = useCallback((message: string) => {
    setStatus("error");
    setError(message);
    setShake((n) => n + 1);
  }, []);

  const submit = useCallback(
    async (raw: string) => {
      setInput(raw);
      const check = parseMediaUrl(raw);
      if (!check.ok) {
        fail(URL_ERROR_MESSAGES[check.reason]);
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus("loading");
      setError(null);
      setResult(null);
      try {
        const data = await resolveMedia(check.value.url, controller.signal);
        setResult(data);
        setStatus("done");
        requestAnimationFrame(() =>
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        fail(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      }
    },
    [fail],
  );

  useEffect(() => {
    preloadTurnstile();
    // Support the PWA share target and deep links: /?url=… or /?text=…
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("url") ?? params.get("text");
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (shared) {
      window.history.replaceState(null, "", window.location.pathname);
      timer = setTimeout(() => void submit(shared), 0);
    }
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [submit]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit(input);
  };

  const paste = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        fail("Your clipboard is empty — copy a link first.");
        return;
      }
      if (parseMediaUrl(text).ok) void submit(text);
      else setInput(text);
    } catch {
      inputRef.current?.focus();
      fail("Couldn't read your clipboard. Paste the link into the box instead.");
    }
  };

  const clear = () => {
    abortRef.current?.abort();
    setInput("");
    setStatus("idle");
    setError(null);
    setResult(null);
    inputRef.current?.focus();
  };

  const loading = status === "loading";
  const hint =
    parsed && !parsed.ok && parsed.reason !== "empty" && status !== "error" ? URL_ERROR_MESSAGES[parsed.reason] : null;

  return (
    <div className="w-full">
      <form onSubmit={onSubmit} noValidate className="relative" aria-label="Download media">
        <div
          key={shake}
          className={`group relative flex items-center gap-2 rounded-full border-2 bg-surface p-2 pl-4 shadow-card transition-colors focus-within:border-text ${
            status === "error" ? "animate-shake border-danger" : "border-border"
          }`}
        >
          <div className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-xl text-muted" aria-hidden>
            {detected ? (
              <PlatformIcon platform={detected.id} size={32} className="size-full" />
            ) : (
              <LinkIcon size={18} />
            )}
          </div>
          <label htmlFor="media-url" className="sr-only">
            Media link
          </label>
          <input
            ref={inputRef}
            id="media-url"
            name="url"
            type="url"
            inputMode="url"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="go"
            placeholder={placeholder}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            aria-invalid={status === "error"}
            aria-describedby="media-url-status"
            className="min-w-0 flex-1 scroll-mt-32 bg-transparent py-3 text-base font-medium outline-none placeholder:font-normal placeholder:text-muted/80"
          />
          {input ? (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear link"
              className="grid size-10 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-text"
            >
              <XIcon size={16} />
            </button>
          ) : (
            canPaste && (
              <button
                type="button"
                onClick={paste}
                className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2.5 text-sm font-semibold text-muted transition hover:bg-surface-2 hover:text-text"
              >
                <ClipboardIcon size={15} /> Paste
              </button>
            )
          )}
          <button
            type="submit"
            disabled={loading}
            className="hidden h-12 shrink-0 items-center gap-2 rounded-full bg-text px-6 text-[15px] font-bold text-bg transition hover:opacity-90 disabled:cursor-wait sm:flex"
          >
            {loading ? "Fetching…" : "Yoink it"}
            <ArrowIcon size={17} className={loading ? "animate-pulse" : ""} />
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-text px-6 text-base font-bold text-bg transition active:opacity-90 disabled:cursor-wait sm:hidden"
        >
          {loading ? "Fetching…" : "Yoink it"}
          <ArrowIcon size={18} className={loading ? "animate-pulse" : ""} />
        </button>

        <div id="media-url-status" aria-live="polite" className="min-h-6 px-1 pt-2 text-center text-sm">
          {status === "error" && error ? (
            <p className="flex items-start justify-center gap-1.5 text-danger">
              <AlertIcon size={16} className="mt-0.5 shrink-0" /> {error}
            </p>
          ) : hint ? (
            <p className="text-muted">{hint}</p>
          ) : detected ? (
            <p className="text-muted">
              {detected.name} link{detected.id === "tiktok" ? ", we'll get the version without the watermark" : ""}
            </p>
          ) : (
            <p className="text-muted">
              {platform ? `Free, no sign-up. Works with any public ${PLATFORMS[platform].name} link.` : "Free, no sign-up. Public links only."}
            </p>
          )}
        </div>
      </form>

      <div ref={resultsRef} className="mt-4 scroll-mt-24 space-y-4">
        {loading && <ResultSkeleton />}
        {status === "done" && result && (
          <>
            {result.items.length > 1 && (
              <p className="px-1 text-sm font-semibold text-muted">
                {result.items.length} videos found in this post
              </p>
            )}
            {result.items.map((item, index) => (
              <ResultCard key={`${item.id}-${index}`} item={item} uploader={result.uploader} index={index} total={result.items.length} />
            ))}
            <p className="px-1 text-xs text-muted">
              Only download content you own or have permission to use. Files are processed in your browser and never stored on our servers.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="rounded-[2rem] border border-border bg-surface p-4 sm:p-5" role="status" aria-label="Fetching media">
      <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
        <div className="skeleton aspect-video rounded-2xl" />
        <div className="space-y-3">
          <div className="skeleton h-6 w-3/4 rounded-md" />
          <div className="skeleton h-4 w-1/3 rounded-md" />
          <div className="skeleton h-16 rounded-2xl" />
          <div className="skeleton h-16 rounded-2xl" />
        </div>
      </div>
      <p className="mt-3 text-sm text-muted">Getting the available qualities…</p>
    </div>
  );
}
