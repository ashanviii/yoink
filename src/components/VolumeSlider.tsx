"use client";

import { useId } from "react";

/** Highest volume offered, as a multiplier (2 = 200%). */
const MAX = 2;

interface Props {
  /** Multiplier: 0 mutes, 1 is unchanged. */
  volume: number;
  onVolumeChange: (volume: number) => void;
}

export function VolumeSlider({ volume, onVolumeChange }: Props) {
  const id = useId();
  const percent = Math.round(volume * 100);
  const label = percent === 0 ? "Muted" : `${percent}%`;

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3">
      <div className="flex items-center gap-2.5">
        <label htmlFor={id} className="text-sm font-semibold">
          Volume
        </label>
        <span className="ml-auto font-mono text-xs text-muted tabular-nums">{label}</span>
        {volume !== 1 && (
          <button
            type="button"
            onClick={() => onVolumeChange(1)}
            className="rounded-md px-1.5 py-0.5 text-xs font-medium text-muted underline-offset-2 hover:text-text hover:underline"
          >
            Reset
          </button>
        )}
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={MAX * 100}
        step={5}
        value={percent}
        onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
        aria-valuetext={label}
        className="mt-3 block w-full cursor-pointer accent-[var(--accent)]"
      />
      <div className="mt-1 flex justify-between text-[11px] text-muted" aria-hidden>
        <span>Mute</span>
        <span>100%</span>
        <span>{MAX * 100}%</span>
      </div>
    </div>
  );
}
