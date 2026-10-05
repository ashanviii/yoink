import type { PlatformId } from "@/lib/platforms";
import { Downloader } from "./Downloader";

interface Props {
  eyebrow: string;
  title: string;
  highlight: string;
  subtitle: string;
  placeholder?: string;
  platform?: PlatformId;
}

const STICKERS = [
  { text: "no watermark ✦", className: "left-[4%] top-10 bg-hot text-white", r: "-8deg" },
  { text: "trim before you save", className: "right-[6%] top-4 bg-pop text-white", r: "7deg" },
  { text: "free & no login", className: "right-[2%] bottom-24 bg-accent text-accent-ink", r: "-5deg" },
];

export function Hero({ eyebrow, title, highlight, subtitle, placeholder, platform }: Props) {
  return (
    <section className="relative mx-auto max-w-3xl px-4 pb-4 pt-10 text-center sm:pt-16">
      <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
        {STICKERS.map((s) => (
          <span
            key={s.text}
            className={`absolute -mx-40 animate-float rounded-full px-3 py-1.5 font-display text-sm font-bold shadow-card ${s.className}`}
            style={{ "--r": s.r } as React.CSSProperties}
          >
            {s.text}
          </span>
        ))}
      </div>

      <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-muted">
        <span className="size-2 animate-pulse rounded-full bg-accent shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_35%,transparent)]" />
        {eyebrow}
      </p>
      <h1 className="font-display text-[2.6rem] font-extrabold leading-[0.95] sm:text-6xl">
        {title} <span className="marker">{highlight}</span>
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-base text-muted sm:text-lg">{subtitle}</p>
      <div className="mt-8 text-left">
        <Downloader placeholder={placeholder} platform={platform} />
      </div>
    </section>
  );
}
