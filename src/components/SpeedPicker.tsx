"use client";

import { useId } from "react";
import { SPEEDS } from "@/lib/media-types";
import { clock } from "./filmstrip";

interface Props {
  speed: number;
  /** Length of the clip being saved, in seconds, for the "plays for" readout. */
  clipSec: number;
  onSpeedChange: (speed: number) => void;
}

export function SpeedPicker({ speed, clipSec, onSpeedChange }: Props) {
  const id = useId();
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3">
      <div className="flex items-center gap-2.5">
        <span id={`${id}-label`} className="text-sm font-semibold">
          Speed
        </span>
        {speed !== 1 && <span className="ml-auto font-mono text-xs text-muted">plays for {clock(clipSec / speed)}</span>}
      </div>
      <div role="radiogroup" aria-labelledby={`${id}-label`} className="mt-2.5 flex flex-wrap gap-1.5">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={speed === s}
            onClick={() => onSpeedChange(s)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium tabular-nums transition ${
              speed === s ? "border-text bg-text text-bg" : "border-border text-muted hover:text-text"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
