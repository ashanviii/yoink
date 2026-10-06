"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { previewSpriteUrl } from "@/lib/api-client";
import { PREVIEW_FRAMES } from "@/lib/media-types";

/** Shared pieces of the filmstrip used by the trim editor and the frame picker. */

export const STRIP_HEIGHT_PX = 56;

export function clock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

export type Sprite = { status: "loading" } | { status: "error" } | { status: "ready"; url: string; aspect: number };

/** Loads the filmstrip sprite once `active` first turns true; `aspect` is a single frame's width / height. */
export function useSprite(previewId: string | null, active: boolean): Sprite {
  const [sprite, setSprite] = useState<Sprite>({ status: "loading" });
  const [requested, setRequested] = useState(false);
  if (active && previewId && !requested) setRequested(true);

  useEffect(() => {
    if (!requested || !previewId) return;
    const url = previewSpriteUrl(previewId);
    const img = new Image();
    img.onload = () => setSprite({ status: "ready", url, aspect: img.naturalWidth / PREVIEW_FRAMES / img.naturalHeight });
    img.onerror = () => setSprite({ status: "error" });
    img.src = url;
    return () => {
      img.onload = img.onerror = null;
    };
  }, [requested, previewId]);

  return previewId ? sprite : { status: "error" };
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

/** The row of sprite tiles behind a strip's handles. */
export function FilmstripFrames({ sprite }: { sprite: Sprite }) {
  const frameWidth = sprite.status === "ready" ? STRIP_HEIGHT_PX * sprite.aspect : 0;
  if (sprite.status === "loading") {
    return <div className="grid size-full animate-pulse place-items-center bg-surface-2 text-xs text-muted">Loading frames…</div>;
  }
  if (sprite.status === "error") return null;
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
