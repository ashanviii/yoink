"use client";

import { useId, type ReactNode } from "react";

interface Props<T extends string | number> {
  title: string;
  /** Right-aligned readout next to the title, e.g. the new length. */
  note?: ReactNode;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Optional preview shown beside the choices. */
  children?: ReactNode;
}

/** A small titled row of mutually exclusive choices, used for speed and rotation. */
export function ChoicePanel<T extends string | number>({ title, note, options, value, onChange, children }: Props<T>) {
  const id = useId();
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <span id={`${id}-label`} className="text-sm font-semibold">
            {title}
          </span>
          {note && <span className="ml-auto font-mono text-xs text-muted">{note}</span>}
        </div>
        <div role="radiogroup" aria-labelledby={`${id}-label`} className="mt-2.5 flex flex-wrap gap-1.5">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={value === option.value}
              onClick={() => onChange(option.value)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium tabular-nums transition ${
                value === option.value ? "border-text bg-text text-bg" : "border-border text-muted hover:text-text"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
