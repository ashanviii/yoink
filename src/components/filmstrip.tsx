"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { getSprite, getStill } from "@/lib/client/preview";
import { PREVIEW_FRAMES, type StreamRef } from "@/lib/media-types";

/** Shared pieces of the filmstrip used by the trim editor and the frame picker. */

export const STRIP_HEIGHT_PX = 56;

export function clock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

export type Sprite = { status: "loading" } | { status: "error" } | { status: "ready"; url: string; aspect: number };

/** Draws the filmstrip sprite once `active` first turns true; `aspect` is a single frame's width / height. */
export function useSprite(preview: StreamRef | null, durationSec: number, active: boolean): Sprite {
  const [sprite, setSprite] = useState<Sprite>({ status: "loading" });
  const [requested, setRequested] = useState(false);
  if (active && preview && !requested) setRequested(true);

  useEffect(() => {
    if (!requested || !preview) return;
    let cancelled = false;
    getSprite(preview, durationSec).then(
      ({ url, aspect }) => !cancelled && setSprite({ status: "ready", url, aspect }),
      () => !cancelled && setSprite({ status: "error" }),
    );
    return () => {
      cancelled = true;
    };
  }, [requested, preview, durationSec]);

  return preview ? sprite : { status: "error" };
}

export type Still = { sec: number; url: string } | { sec: number; failed: true };

/** The exact frame at `sec`, drawn once `active`; null until the first one is ready. */
export function useStill(preview: StreamRef | null, sec: number, durationSec: number, active: boolean): Still | null {
  const [still, setStill] = useState<Still | null>(null);

  useEffect(() => {
    if (!active || !preview) return;
    let cancelled = false;
    getStill(preview, sec, durationSec).then(
      (url) => !cancelled && setStill({ sec, url }),
      () => !cancelled && setStill({ sec, failed: true }),
    );
    return () => {
      cancelled = true;
    };
  }, [preview, sec, durationSec, active]);

  return still;
}

export function frameIndex(sec: number, duration: number): number {
  return Math.min(PREVIEW_FRAMES - 1, Math.max(0, Math.floor((sec / duration) * PREVIEW_FRAMES)));
}

export function frameStyle(url: string, index: number): CSSProperties {
  return {
    backgroundImage: `url(${url})`,
    backgroundSize: `${PREVIEW_FRAMES * 100}% 100%`,
    backgroundPosition: `${(index / (PREVIEW_FRAMES - 1)) * 100}% 0`,
  };
}

const SLOW_AFTER_MS = 6_000;

/** True once the sprite has been loading for a while, so the UI can explain the wait. */
function useSlow(loading: boolean): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [loading]);
  return slow;
}

/** The row of sprite tiles behind a strip's handles. */
export function FilmstripFrames({ sprite }: { sprite: Sprite }) {
  const slow = useSlow(sprite.status === "loading");
  const frameWidth = sprite.status === "ready" ? STRIP_HEIGHT_PX * sprite.aspect : 0;
  if (sprite.status === "loading") {
    return (
      <div className="grid size-full animate-pulse place-items-center bg-surface-2 px-2 text-center text-xs text-muted">
        {slow ? "Long videos take a while — you can already drag the handles" : "Loading frames…"}
      </div>
    );
  }
  if (sprite.status === "error") {
    return (
      <div className="grid size-full place-items-center bg-surface-2 px-2 text-center text-xs text-muted">
        Preview unavailable — you can still drag the handles
      </div>
    );
  }
  return (
    <div className="flex size-full">
      {Array.from({ length: PREVIEW_FRAMES }, (_, i) => (
        <div key={i} className="relative h-full flex-1 overflow-hidden">
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2" style={{ width: frameWidth, ...frameStyle(sprite.url, i) }} />
        </div>
      ))}
    </div>
  );
}
