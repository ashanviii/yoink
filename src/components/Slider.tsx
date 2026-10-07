"use client";

import { useId, type ReactNode } from "react";

interface Props {
  title: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** The value Reset returns to; Reset shows whenever the value differs. */
  defaultValue: number;
  /** Readout for a value, also used as the slider's spoken value. */
  format: (value: number) => string;
  /** Extra readout after the value, e.g. the new length. */
  note?: ReactNode;
  /** Labels under the track, placed at their value. */
  marks: { value: number; label: string }[];
  onChange: (value: number) => void;
}

/** A titled range slider with a live readout, labelled marks and a reset button. */
export function Slider({ title, value, min, max, step, defaultValue, format, note, marks, onChange }: Props) {
  const id = useId();
  // Work in whole steps so float steps like 0.05 don't drift (1.1500000000000001).
  const scale = 1 / step;
  const position = (v: number) => ((v - min) / (max - min)) * 100;

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3">
      <div className="flex items-center gap-2.5">
        <label htmlFor={id} className="text-sm font-semibold">
          {title}
        </label>
        <span className="ml-auto font-mono text-xs text-muted tabular-nums">
          {format(value)}
          {note && <> · {note}</>}
        </span>
        {value !== defaultValue && (
          <button
            type="button"
            onClick={() => onChange(defaultValue)}
            className="rounded-md px-1.5 py-0.5 text-xs font-medium text-muted underline-offset-2 hover:text-text hover:underline"
          >
            Reset
          </button>
        )}
      </div>
      <input
        id={id}
        type="range"
        min={Math.round(min * scale)}
        max={Math.round(max * scale)}
        step={1}
        value={Math.round(value * scale)}
        onChange={(e) => onChange(Number(e.target.value) / scale)}
        aria-valuetext={format(value)}
        className="mt-3 block w-full cursor-pointer accent-[var(--accent)]"
      />
      <div className="relative mt-1 h-4 text-[11px] text-muted" aria-hidden>
        {marks.map((mark) => {
          const at = position(mark.value);
          // End marks hug the edges; inner marks are centred on their value.
          const shift = at <= 0 ? "0%" : at >= 100 ? "-100%" : "-50%";
          return (
            <span key={mark.value} className="absolute top-0 whitespace-nowrap" style={{ left: `${at}%`, transform: `translateX(${shift})` }}>
              {mark.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
