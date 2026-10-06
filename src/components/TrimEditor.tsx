"use client";

import { useId, useRef, useState } from "react";
import type { TrimParams } from "@/lib/media-types";
import { FilmstripFrames, STRIP_HEIGHT_PX, clock, frameIndex, frameStyle, useSprite, type Sprite } from "./filmstrip";

const MIN_CLIP_SEC = 0.5;

function FramePreview({ sprite, sec, duration, label }: { sprite: Sprite; sec: number; duration: number; label: string }) {
  const aspect = sprite.status === "ready" ? sprite.aspect : 9 / 16;
  return (
    <figure className="flex flex-col items-center gap-1.5">
      <div
        className="relative max-h-44 w-full overflow-hidden rounded-xl bg-surface"
        style={{ aspectRatio: aspect, maxWidth: `calc(11rem * ${aspect})` }}
      >
        {sprite.status === "ready" ? (
          <div className="size-full" style={frameStyle(sprite.url, frameIndex(sec, duration))} />
        ) : sprite.status === "loading" ? (
          <div className="size-full animate-pulse bg-surface-2" />
        ) : null}
      </div>
      <figcaption className="text-xs text-muted">
        {label} <span className="font-mono text-text">{clock(sec)}</span>
      </figcaption>
    </figure>
  );
}

type DragMode = "start" | "end" | "move";

interface StripProps {
  sprite: Sprite;
  start: number;
  end: number;
  duration: number;
  onChange: (start: number, end: number) => void;
}

/** Phone-editor style trimmer: drag either handle, or drag the selection to slide it. */
function TrimStrip({ sprite, start, end, duration, onChange }: StripProps) {
  const framesRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: DragMode; offset: number } | null>(null);
  const left = (start / duration) * 100;
  const right = 100 - (end / duration) * 100;

  const timeAt = (clientX: number) => {
    const rect = framesRef.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * duration;
  };

  const apply = (mode: DragMode, t: number, offset = 0) => {
    if (mode === "start") onChange(Math.min(t, end - MIN_CLIP_SEC), end);
    else if (mode === "end") onChange(start, Math.max(t, start + MIN_CLIP_SEC));
    else {
      const length = end - start;
      const s = Math.min(Math.max(t - offset, 0), duration - length);
      onChange(s, s + length);
    }
  };

  const begin = (e: React.PointerEvent, mode: DragMode | null) => {
    e.preventDefault();
    e.stopPropagation();
    const t = timeAt(e.clientX);
    // Tapping the bare strip jumps the nearest handle there, then keeps dragging it.
    const resolved = mode ?? (Math.abs(t - start) <= Math.abs(t - end) ? "start" : "end");
    if (!mode) apply(resolved, t);
    drag.current = { mode: resolved, offset: t - start };
    e.currentTarget.closest<HTMLElement>("[data-trim-strip]")?.setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    if (drag.current) apply(drag.current.mode, timeAt(e.clientX), drag.current.offset);
  };

  const onKey = (mode: "start" | "end") => (e: React.KeyboardEvent) => {
    const step = (e.shiftKey ? 5 : 1) * Math.max(0.1, duration / 100);
    const delta = e.key === "ArrowLeft" || e.key === "ArrowDown" ? -step : e.key === "ArrowRight" || e.key === "ArrowUp" ? step : 0;
    if (!delta) return;
    e.preventDefault();
    const value = mode === "start" ? start : end;
    apply(mode, Math.min(duration, Math.max(0, value + delta)));
  };

  const handle = (mode: "start" | "end") => ({
    role: "slider",
    tabIndex: 0,
    "aria-label": mode === "start" ? "Trim start" : "Trim end",
    "aria-valuemin": 0,
    "aria-valuemax": Math.round(duration * 10) / 10,
    "aria-valuenow": Math.round((mode === "start" ? start : end) * 10) / 10,
    "aria-valuetext": clock(mode === "start" ? start : end),
    onPointerDown: (e: React.PointerEvent) => begin(e, mode),
    onKeyDown: onKey(mode),
  });

  return (
    <div
      data-trim-strip
      className="relative cursor-pointer touch-none select-none px-4"
      style={{ height: STRIP_HEIGHT_PX }}
      onPointerDown={(e) => begin(e, null)}
      onPointerMove={onMove}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    >
      <div ref={framesRef} className="relative size-full">
        <div className="absolute inset-0 overflow-hidden rounded-md bg-surface">
          <FilmstripFrames sprite={sprite} />
          <div className="absolute inset-y-0 left-0 bg-bg/75" style={{ width: `${left}%` }} />
          <div className="absolute inset-y-0 right-0 bg-bg/75" style={{ width: `${right}%` }} />
        </div>

        <div
          className="absolute inset-y-0 cursor-grab border-y-[3px] border-accent active:cursor-grabbing"
          style={{ left: `${left}%`, right: `${right}%` }}
          onPointerDown={(e) => begin(e, "move")}
          aria-hidden
        />
        {(["start", "end"] as const).map((mode) => (
          <div
            key={mode}
            {...handle(mode)}
            className={`absolute inset-y-0 flex w-4 cursor-ew-resize items-center justify-center bg-accent outline-none focus-visible:ring-2 focus-visible:ring-text ${
              mode === "start" ? "-translate-x-full rounded-l-md" : "rounded-r-md"
            }`}
            style={{ left: `${mode === "start" ? left : 100 - right}%` }}
          >
            <span className="h-5 w-1 rounded-full bg-accent-ink/70" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  durationSec: number;
  previewId: string | null;
  onTrimChange: (trim: TrimParams | undefined) => void;
}

export function TrimEditor({ durationSec, previewId, onTrimChange }: Props) {
  const id = useId();
  const [enabled, setEnabled] = useState(false);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(durationSec);
  const sprite = useSprite(previewId, enabled);

  const emit = (on: boolean, s: number, e: number) => {
    const isFullClip = s <= 0 && e >= durationSec;
    onTrimChange(on && !isFullClip ? { start: s, end: e } : undefined);
  };

  const setRange = (s: number, e: number) => {
    setStart(s);
    setEnd(e);
    emit(enabled, s, e);
  };

  const toggle = () => {
    setEnabled(!enabled);
    emit(!enabled, start, end);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-3">
      <label htmlFor={`${id}-toggle`} className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
        <input
          id={`${id}-toggle`}
          type="checkbox"
          checked={enabled}
          onChange={toggle}
          className="size-4 cursor-pointer accent-[var(--accent)]"
        />
        Trim before downloading
        {enabled && (
          <span className="ml-auto font-mono text-xs text-muted">
            {clock(end - start)} of {clock(durationSec)}
          </span>
        )}
      </label>

      {enabled && (
        <div className="mt-3 space-y-3">
          {sprite.status !== "error" && (
            <div className="grid grid-cols-2 gap-3">
              <FramePreview sprite={sprite} sec={start} duration={durationSec} label="Starts at" />
              <FramePreview sprite={sprite} sec={end} duration={durationSec} label="Ends at" />
            </div>
          )}

          <TrimStrip sprite={sprite} start={start} end={end} duration={durationSec} onChange={setRange} />
          <p className="text-center text-xs text-muted">Drag the handles to trim, or drag the middle to slide the clip.</p>
        </div>
      )}
    </div>
  );
}
