"use client";

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Spoken value for screen readers. */
  valueText: string;
  /** Labels under the track, placed at their value. */
  marks: { value: number; label: string }[];
  onChange: (value: number) => void;
}

/** A range slider with labelled marks under the track. */
export function Slider({ label, value, min, max, step, valueText, marks, onChange }: Props) {
  // Work in whole steps so float steps like 0.05 don't drift (1.1500000000000001).
  const scale = 1 / step;
  const position = (v: number) => ((v - min) / (max - min)) * 100;

  return (
    <div>
      <input
        type="range"
        aria-label={label}
        min={Math.round(min * scale)}
        max={Math.round(max * scale)}
        step={1}
        value={Math.round(value * scale)}
        onChange={(e) => onChange(Number(e.target.value) / scale)}
        aria-valuetext={valueText}
        className="block w-full cursor-pointer accent-[var(--accent)]"
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
