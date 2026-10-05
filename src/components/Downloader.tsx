"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { ApiError, resolveMedia } from "@/lib/api-client";
import type { ResolveResponse } from "@/lib/media-types";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import { URL_ERROR_MESSAGES, parseMediaUrl } from "@/lib/url";
import { AlertIcon, ArrowIcon, ClipboardIcon, PLATFORM_ICONS, XIcon } from "./icons";
import { ResultCard } from "./ResultCard";

type Status = "idle" | "loading" | "done" | "error";

const noopSubscribe = () => () => {};

interface Props {
  placeholder?: string;
  /** Platform this page is about — used only for the empty-state hint. */
  platform?: PlatformId;
}

export function Downloader({ placeholder = "Paste a Reel, Short, TikTok or Pin link…", platform }: Props) {
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
  const DetectedIcon = detected ? PLATFORM_ICONS[detected.id] : null;

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
      fail("Couldn't read your clipboard. Long-press the box and tap Paste instead.");
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
          className={`group relative flex items-center gap-2 rounded-[1.75rem] border-2 bg-surface p-2 shadow-card transition-colors focus-within:border-text ${
            status === "error" ? "animate-shake border-danger" : "border-border"
          }`}
        >
          <div
            className="grid size-11 shrink-0 place-items-center rounded-2xl transition-colors"
            style={{ background: detected ? detected.accent : "var(--surface-2)", color: detected ? "#fff" : "var(--muted)" }}
            aria-hidden
          >
            {DetectedIcon ? <DetectedIcon size={20} /> : <span className="text-lg">🔗</span>}
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
            className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none placeholder:text-muted/70"
          />
          {input ? (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear link"
              className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-text active:scale-90"
            >
              <XIcon size={16} />
            </button>
          ) : (
            canPaste && (
              <button
                type="button"
                onClick={paste}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-2 text-sm font-semibold transition hover:border-text active:scale-95"
              >
                <ClipboardIcon size={15} /> Paste
              </button>
            )
          )}
          <button
            type="submit"
            disabled={loading}
            className="relative hidden shrink-0 items-center gap-2 overflow-hidden rounded-[1.25rem] bg-accent px-6 py-3 font-display text-base font-bold text-accent-ink transition hover:-translate-y-0.5 hover:shadow-[0_4px_0_0_var(--text)] active:translate-y-0 active:scale-95 active:shadow-none disabled:cursor-wait sm:flex"
          >
            {loading ? "Fetching…" : "Yoink it"}
            <ArrowIcon size={18} className={loading ? "animate-pulse" : ""} />
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-[1.25rem] bg-accent px-6 py-4 font-display text-lg font-bold text-accent-ink transition active:scale-[0.98] disabled:cursor-wait sm:hidden"
        >
          {loading ? "Fetching…" : "Yoink it"}
          <ArrowIcon size={18} className={loading ? "animate-pulse" : ""} />
        </button>

        <div id="media-url-status" aria-live="polite" className="min-h-6 px-3 pt-2 text-sm">
          {status === "error" && error ? (
            <p className="flex items-start gap-1.5 text-danger">
              <AlertIcon size={16} className="mt-0.5 shrink-0" /> {error}
            </p>
          ) : hint ? (
            <p className="text-muted">{hint}</p>
          ) : detected ? (
            <p className="text-muted">
              {detected.name} link detected{detected.id === "tiktok" ? " · we'll skip the watermark" : ""} ✓
            </p>
          ) : (
            <p className="text-muted">
              {platform
                ? `Works with any public ${PLATFORMS[platform].name} link.`
                : "Instagram · TikTok · Pinterest — public links only."}
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
              Only download content you own or have permission to use. Files are deleted from our servers within minutes.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="rounded-3xl border border-border bg-surface/80 p-4" role="status" aria-label="Fetching media">
      <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
        <div className="skeleton aspect-video rounded-2xl" />
        <div className="space-y-3">
          <div className="skeleton h-6 w-3/4 rounded-lg" />
          <div className="skeleton h-4 w-1/3 rounded-lg" />
          <div className="skeleton h-14 rounded-2xl" />
          <div className="skeleton h-14 rounded-2xl" />
        </div>
      </div>
      <p className="mt-3 text-center text-sm text-muted">Peeking at every quality option…</p>
    </div>
  );
}
