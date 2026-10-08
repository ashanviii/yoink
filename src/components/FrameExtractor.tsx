"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MAX_EXTRACT_FRAMES, type FrameFormat, type MediaOption, type StreamRef } from "@/lib/media-types";
import { FilmstripFrames, STRIP_HEIGHT_PX, clock, frameIndex, frameStyle, useSprite, useStill, type Sprite } from "./filmstrip";
import { JobRow } from "./OptionRow";

const STEP_SEC = 0.1;
const SETTLE_MS = 250;
const INTERVALS = [0.5, 1, 2, 5, 10, 30, 60];
const TARGET_FRAMES = 24;

const snap = (sec: number) => Math.round(sec / STEP_SEC) * STEP_SEC;
const frameCount = (duration: number, every: number) => Math.min(MAX_EXTRACT_FRAMES, Math.max(1, Math.round(duration / every)));

/** Intervals that give a useful set (2–MAX frames), always at least one. */
function intervalChoices(duration: number): number[] {
  const fits = INTERVALS.filter((every) => duration / every >= 2 && duration / every <= MAX_EXTRACT_FRAMES);
  return fits.length ? fits : [Math.max(STEP_SEC, Math.ceil(duration / MAX_EXTRACT_FRAMES))];
}

function closestTo(choices: number[], duration: number): number {
  return choices.reduce((best, every) =>
    Math.abs(frameCount(duration, every) - TARGET_FRAMES) < Math.abs(frameCount(duration, best) - TARGET_FRAMES) ? every : best,
  );
}

interface ScrubberProps {
  sprite: Sprite;
  at: number;
  duration: number;
  onChange: (sec: number) => void;
}

/** Filmstrip with a single draggable playhead. */
function Scrubber({ sprite, at, duration, onChange }: ScrubberProps) {
  const framesRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const pct = (at / duration) * 100;

  const seek = (clientX: number) => {
    const rect = framesRef.current!.getBoundingClientRect();
    onChange(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * duration);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 1 : STEP_SEC;
    const next =
      e.key === "ArrowLeft" || e.key === "ArrowDown" ? at - step
      : e.key === "ArrowRight" || e.key === "ArrowUp" ? at + step
      : e.key === "Home" ? 0
      : e.key === "End" ? duration
      : null;
    if (next === null) return;
    e.preventDefault();
    onChange(next);
  };

  return (
    <div
      className="relative cursor-pointer touch-none select-none px-2"
      style={{ height: STRIP_HEIGHT_PX }}
      onPointerDown={(e) => {
        e.preventDefault();
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.querySelector<HTMLElement>("[role=slider]")?.focus();
        seek(e.clientX);
      }}
      onPointerMove={(e) => dragging.current && seek(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <div ref={framesRef} className="relative size-full">
        <div className="absolute inset-0 overflow-hidden rounded-md bg-surface">
          <FilmstripFrames sprite={sprite} />
        </div>
        <div
          role="slider"
          tabIndex={0}
          aria-label="Frame time"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration * 10) / 10}
          aria-valuenow={Math.round(at * 10) / 10}
          aria-valuetext={clock(at)}
          onKeyDown={onKey}
          className="group absolute -inset-y-1.5 w-0 outline-none"
          style={{ left: `${pct}%` }}
        >
          <span className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-accent shadow-[0_0_0_1px_var(--text)]" />
          <span className="absolute -top-1 left-1/2 size-3.5 -translate-x-1/2 rounded-full border-2 border-text bg-accent group-focus-visible:ring-2 group-focus-visible:ring-text group-focus-visible:ring-offset-2" />
        </div>
      </div>
    </div>
  );
}

interface PreviewProps {
  sprite: Sprite;
  preview: StreamRef;
  at: number;
  duration: number;
  aspect: number;
  active: boolean;
}

/**
 * Shows the sprite tile while scrubbing, then swaps in the exact frame once the
 * playhead rests, so what you see is what you save.
 */
function FramePreview({ sprite, preview, at, duration, aspect, active }: PreviewProps) {
  const [settled, setSettled] = useState(at);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(at), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [at]);

  const still = useStill(preview, settled, duration, active);
  const current = still?.sec === settled ? still : null;
  const url = current && "url" in current ? current.url : null;
  const exact = settled === at && !!url && loaded === url;
  const pending = active && !exact && !(current && "failed" in current) && !(url && failed === url);

  return (
    <div
      className="relative mx-auto max-h-64 w-full overflow-hidden rounded-xl bg-surface"
      style={{ aspectRatio: aspect, maxWidth: `calc(16rem * ${aspect})` }}
    >
      {sprite.status === "ready" ? (
        <div className="size-full" style={frameStyle(sprite.url, frameIndex(at, duration))} />
      ) : sprite.status === "loading" ? (
        <div className="size-full animate-pulse bg-surface-2" />
      ) : null}
      {active && url && (
        // Frames drawn in the browser (blob: URLs); next/image adds nothing here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={url}
          alt={`Frame at ${clock(settled)}`}
          decoding="async"
          onLoad={() => setLoaded(url)}
          onError={() => setFailed(url)}
          className={`absolute inset-0 size-full object-cover transition-opacity duration-150 ${exact ? "opacity-100" : "opacity-0"}`}
        />
      )}
      <span className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-md bg-black/75 px-1.5 py-0.5 font-mono text-xs font-semibold text-white">
        {pending && <span className="size-2.5 animate-spin rounded-full border border-white/40 border-t-white" aria-hidden />}
        {clock(at)}
      </span>
    </div>
  );
}

interface Props {
  durationSec: number;
  preview: StreamRef | null;
  /** Video rendition the frames are cut from (the best one). */
  source: MediaOption;
  width: number | null;
  height: number | null;
  /** Whether the Frames tab is showing; nothing loads until it first is. */
  active: boolean;
}

export function FrameExtractor({ durationSec, preview, source, width, height, active }: Props) {
  const id = useId();
  const sprite = useSprite(preview, durationSec, active);
  const [at, setAt] = useState(0);
  const [format, setFormat] = useState<FrameFormat>("jpg");
  const choices = intervalChoices(durationSec);
  const [every, setEvery] = useState(() => closestTo(choices, durationSec));
  const aspect = sprite.status === "ready" ? sprite.aspect : width && height ? width / height : 9 / 16;
  const ext = format.toUpperCase();

  const move = (sec: number) => setAt(snap(Math.min(durationSec, Math.max(0, sec))));

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-3 rounded-2xl bg-surface-2 p-4">
        {preview && sprite.status !== "error" && (
          <FramePreview sprite={sprite} preview={preview} at={at} duration={durationSec} aspect={aspect} active={active} />
        )}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => move(at - STEP_SEC)}
            aria-label="Back a tenth of a second"
            className="grid size-9 shrink-0 place-items-center rounded-full font-bold text-muted transition hover:bg-surface hover:text-text active:scale-90"
          >
            ‹
          </button>
          <div className="min-w-0 flex-1">
            <Scrubber sprite={sprite} at={at} duration={durationSec} onChange={move} />
          </div>
          <button
            type="button"
            onClick={() => move(at + STEP_SEC)}
            aria-label="Forward a tenth of a second"
            className="grid size-9 shrink-0 place-items-center rounded-full font-bold text-muted transition hover:bg-surface hover:text-text active:scale-90"
          >
            ›
          </button>
        </div>
        <p className="text-center text-xs text-muted">Drag to pick a moment — the arrows nudge a tenth of a second.</p>
      </div>

      <div className="flex items-center justify-between gap-3 px-1">
        <span id={`${id}-format`} className="text-sm font-semibold">
          Image format
        </span>
        <div role="radiogroup" aria-labelledby={`${id}-format`} className="inline-flex rounded-full bg-surface-2 p-1">
          {(["jpg", "png"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={format === value}
              onClick={() => setFormat(value)}
              className={`rounded-full px-3.5 py-1 text-xs font-bold transition ${
                format === value ? "bg-text text-bg" : "text-muted hover:text-text"
              }`}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        <JobRow
          recipe={source.recipe}
          params={{ frames: { mode: "single", at, format } }}
          label="This frame"
          badges={[clock(at)]}
          detail={`${ext} · ${source.label}${format === "png" ? " · lossless" : ""}`}
          action={ext}
          processingLabel="Grabbing the frame…"
        />
      </ul>

      <div className="space-y-2 pt-1">
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <span id={`${id}-every`} className="mr-1 text-sm font-semibold">
            Frame set, one every
          </span>
          <div role="radiogroup" aria-labelledby={`${id}-every`} className="flex flex-wrap gap-1.5">
            {choices.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={every === value}
                onClick={() => setEvery(value)}
                className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                  every === value ? "border-text bg-text text-bg" : "border-border text-muted hover:border-text hover:text-text"
                }`}
              >
                {value}s
              </button>
            ))}
          </div>
        </div>
        <ul className="flex flex-col gap-2">
          <JobRow
            recipe={source.recipe}
            params={{ frames: { mode: "interval", every, format } }}
            label={`Every ${every}s`}
            badges={[`${frameCount(durationSec, every)} frames`]}
            detail={`ZIP of ${ext}s · ${source.label}`}
            action="ZIP"
            processingLabel="Grabbing frames…"
          />
        </ul>
      </div>
    </div>
  );
}
