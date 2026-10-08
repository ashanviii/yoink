"use client";

import { useId, type ReactNode } from "react";

interface Props {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  /** Right-aligned readout shown while enabled, e.g. the clip length. */
  summary?: ReactNode;
  children: ReactNode;
}

/** One optional video edit: a checkbox that turns it on and reveals its controls. */
export function EditPanel({ label, enabled, onToggle, summary, children }: Props) {
  const id = useId();
  return (
    <div className="rounded-2xl bg-surface-2 px-4 py-3.5">
      <label htmlFor={id} className="flex cursor-pointer items-center gap-3 text-[15px] font-bold">
        <input id={id} type="checkbox" checked={enabled} onChange={onToggle} className="size-[18px] cursor-pointer accent-[var(--text)]" />
        {label}
        {enabled && summary && <span className="ml-auto font-mono text-xs font-normal text-muted">{summary}</span>}
      </label>
      {enabled && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}
