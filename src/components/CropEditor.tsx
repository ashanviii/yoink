"use client";

import { useRef, useState } from "react";
import type { CropParams, StreamRef } from "@/lib/media-types";
import { EditPanel } from "./EditPanel";
import { useStill } from "./filmstrip";

/** Smallest crop, as a fraction of the frame's width or height. */
const MIN_SIZE = 0.1;
const FULL: CropParams = { x: 0, y: 0, w: 1, h: 1 };

const SHAPES = [
  { label: "Free", ratio: null },
  { label: "9:16", ratio: 9 / 16 },
  { label: "1:1", ratio: 1 },
  { label: "4:5", ratio: 4 / 5 },
  { label: "16:9", ratio: 16 / 9 },
] as const;

type Corner = "nw" | "ne" | "sw" | "se";
const CORNERS: Corner[] = ["nw", "ne", "sw", "se"];

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Crop boxes are kept in fractions of the frame, so a picture-space ratio
 * (width / height in pixels) becomes `ratio / frameAspect` in fraction space.
 */
function largestCentered(k: number): CropParams {
  const w = Math.min(1, k);
  const h = w / k;
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

/** Resizes from `corner` toward the pointer, keeping the opposite corner fixed. */
function resize(box: CropParams, corner: Corner, px: number, py: number, k: number | null): CropParams {
  const east = corner.includes("e");
  const south = corner.includes("s");
  const ax = east ? box.x : box.x + box.w;
  const ay = south ? box.y : box.y + box.h;
  const maxW = east ? 1 - ax : ax;
  const maxH = south ? 1 - ay : ay;

  let w = Math.max(east ? px - ax : ax - px, MIN_SIZE);
  let h = Math.max(south ? py - ay : ay - py, MIN_SIZE);
  if (k) {
    // Follow whichever side the pointer pulls further, then fit inside the frame.
    if (w / h > k) h = w / k;
    else w = h * k;
    const scale = Math.min(1, maxW / w, maxH / h);
    w *= scale;
    h *= scale;
  } else {
    w = Math.min(w, maxW);
    h = Math.min(h, maxH);
  }
  return { x: east ? ax : ax - w, y: south ? ay : ay - h, w, h };
}

interface Props {
  durationSec: number;
  preview: StreamRef | null;
  /** Source size in pixels, when known, for the output size readout. */
  width: number | null;
  height: number | null;
  onCropChange: (crop: CropParams | undefined) => void;
}

export function CropEditor({ durationSec, preview, width, height, onCropChange }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [box, setBox] = useState<CropParams>(FULL);
  const [shape, setShape] = useState<(typeof SHAPES)[number]["label"]>("Free");
  const [frameAspect, setFrameAspect] = useState<number | null>(width && height ? width / height : null);
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ corner: Corner | null; dx: number; dy: number } | null>(null);
  const still = useStill(preview, durationSec / 2, durationSec, enabled);

  const ratio = SHAPES.find((s) => s.label === shape)?.ratio ?? null;
  const k = ratio && frameAspect ? ratio / frameAspect : null;

  const emit = (on: boolean, next: CropParams, shapeRatio = ratio) => {
    const isFull = next.w > 0.999 && next.h > 0.999;
    onCropChange(on && !isFull ? { ...next, ...(shapeRatio ? { ratio: shapeRatio } : {}) } : undefined);
  };

  const update = (next: CropParams) => {
    setBox(next);
    emit(enabled, next);
  };

  const toggle = () => {
    setEnabled(!enabled);
    emit(!enabled, box);
  };

  const pickShape = (label: (typeof SHAPES)[number]["label"]) => {
    setShape(label);
    const r = SHAPES.find((s) => s.label === label)?.ratio ?? null;
    const next = r && frameAspect ? largestCentered(r / frameAspect) : FULL;
    setBox(next);
    emit(enabled, next, r);
  };

  const pointer = (e: React.PointerEvent) => {
    const rect = frameRef.current!.getBoundingClientRect();
    return { px: clamp((e.clientX - rect.left) / rect.width, 0, 1), py: clamp((e.clientY - rect.top) / rect.height, 0, 1) };
  };

  const begin = (e: React.PointerEvent, corner: Corner | null) => {
    e.preventDefault();
    e.stopPropagation();
    const { px, py } = pointer(e);
    drag.current = { corner, dx: px - box.x, dy: py - box.y };
    frameRef.current?.setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const { px, py } = pointer(e);
    const { corner, dx, dy } = drag.current;
    if (corner) update(resize(box, corner, px, py, k));
    else update({ ...box, x: clamp(px - dx, 0, 1 - box.w), y: clamp(py - dy, 0, 1 - box.h) });
  };

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.05 : 0.01;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    update({ ...box, x: clamp(box.x + move[0], 0, 1 - box.w), y: clamp(box.y + move[1], 0, 1 - box.h) });
  };

  const outSize = width && height ? `${Math.floor((width * box.w) / 2) * 2} × ${Math.floor((height * box.h) / 2) * 2}` : null;
  const stillUrl = still && "url" in still ? still.url : null;

  return (
    <EditPanel label="Crop before downloading" enabled={enabled} onToggle={toggle} summary={outSize}>
      <div role="radiogroup" aria-label="Crop shape" className="flex flex-wrap gap-1.5">
        {SHAPES.map((s) => (
          <button
            key={s.label}
            type="button"
            role="radio"
            aria-checked={shape === s.label}
            disabled={!!s.ratio && !frameAspect}
            onClick={() => pickShape(s.label)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition disabled:opacity-40 ${
              shape === s.label ? "border-text bg-text text-bg" : "border-border text-muted hover:text-text"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {still && "failed" in still ? (
        <p className="text-sm text-muted">Couldn&apos;t load a preview frame, so the crop can&apos;t be shown.</p>
      ) : (
        <div
          ref={frameRef}
          className="relative mx-auto w-fit touch-none select-none overflow-hidden rounded-md bg-surface"
          onPointerMove={onMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          {stillUrl ? (
            // A blob: URL drawn from the preview stream; next/image can't optimise it.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={stillUrl}
              alt=""
              draggable={false}
              className="block max-h-80 max-w-full"
              // The source size is exact; the preview frame's can be off by a rounded pixel.
              onLoad={(e) => !(width && height) && setFrameAspect(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
            />
          ) : (
            <div className="aspect-video h-48 animate-pulse bg-surface" />
          )}

          {stillUrl && (
            <div
              role="group"
              tabIndex={0}
              aria-label="Crop area. Drag to move, drag the corners to resize, or use the arrow keys."
              onKeyDown={onKey}
              onPointerDown={(e) => begin(e, null)}
              className="absolute cursor-move outline-none ring-white focus-visible:ring-2"
              style={{
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.w * 100}%`,
                height: `${box.h * 100}%`,
                // Dims everything outside the box.
                boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.65)",
              }}
            >
              <div className="pointer-events-none absolute inset-0 border border-white/90">
                <div className="absolute inset-x-0 top-1/3 border-t border-white/30" />
                <div className="absolute inset-x-0 top-2/3 border-t border-white/30" />
                <div className="absolute inset-y-0 left-1/3 border-l border-white/30" />
                <div className="absolute inset-y-0 left-2/3 border-l border-white/30" />
              </div>
              {CORNERS.map((corner) => (
                <span
                  key={corner}
                  aria-hidden
                  onPointerDown={(e) => begin(e, corner)}
                  className={`absolute size-5 border-white ${
                    {
                      nw: "-left-1 -top-1 cursor-nwse-resize border-l-[3px] border-t-[3px]",
                      ne: "-right-1 -top-1 cursor-nesw-resize border-r-[3px] border-t-[3px]",
                      sw: "-bottom-1 -left-1 cursor-nesw-resize border-b-[3px] border-l-[3px]",
                      se: "-bottom-1 -right-1 cursor-nwse-resize border-b-[3px] border-r-[3px]",
                    }[corner]
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
      <p className="text-center text-xs text-muted">Drag the box to move it, or drag a corner to resize.</p>
    </EditPanel>
  );
}
