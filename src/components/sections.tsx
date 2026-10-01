import Link from "next/link";
import type { Faq } from "@/lib/landing-pages";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import { ArrowIcon, PLATFORM_ICONS } from "./icons";

export function SectionHeading({ eyebrow, title, id }: { eyebrow: string; title: string; id?: string }) {
  return (
    <div className="mb-8 space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-pop">{eyebrow}</p>
      <h2 id={id} className="font-display text-3xl font-extrabold sm:text-4xl">
        {title}
      </h2>
    </div>
  );
}

export function Steps({ steps }: { steps: readonly string[] }) {
  return (
    <section aria-labelledby="how-heading" className="mx-auto max-w-5xl px-4 pt-20">
      <SectionHeading eyebrow="How it works" title="Three taps. That's it." id="how-heading" />
      <ol className="grid gap-4 sm:grid-cols-3">
        {steps.map((step, i) => (
          <li
            key={step}
            className="group relative rounded-3xl border border-border bg-surface p-6 transition hover:-translate-y-1 hover:shadow-card"
          >
            <span className="mb-4 grid size-11 place-items-center rounded-2xl bg-accent font-display text-xl font-extrabold text-accent-ink transition-transform group-hover:-rotate-6">
              {i + 1}
            </span>
            <p className="text-[15px] leading-relaxed">{step}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Features({ features }: { features: readonly { title: string; body: string }[] }) {
  return (
    <section aria-labelledby="features-heading" className="mx-auto max-w-5xl px-4 pt-20">
      <SectionHeading eyebrow="Why yoink" title="Built different (fr)." id="features-heading" />
      <div className="grid gap-4 sm:grid-cols-2">
        {features.map((feature) => (
          <div key={feature.title} className="rounded-3xl border border-border bg-surface p-6">
            <h3 className="font-display text-xl font-bold">{feature.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{feature.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FaqSection({ faqs }: { faqs: readonly Faq[] }) {
  return (
    <section aria-labelledby="faq-heading" className="mx-auto max-w-3xl px-4 pt-20">
      <SectionHeading eyebrow="FAQ" title="Questions? Answered." id="faq-heading" />
      <div className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-surface">
        {faqs.map((faq) => (
          <details key={faq.q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold transition hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
              <h3 className="text-[15px]">{faq.q}</h3>
              <span
                aria-hidden
                className="grid size-7 shrink-0 place-items-center rounded-full border border-border text-lg transition-transform duration-300 group-open:rotate-45 group-open:bg-accent group-open:text-accent-ink"
              >
                +
              </span>
            </summary>
            <p className="px-5 pb-5 text-[15px] leading-relaxed text-muted">{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export interface PlatformLink {
  href: string;
  platform: PlatformId;
  label: string;
  blurb: string;
}

export function PlatformGrid({ links, title = "Pick your platform" }: { links: PlatformLink[]; title?: string }) {
  return (
    <section aria-labelledby="platforms-heading" className="mx-auto max-w-5xl px-4 pt-20">
      <SectionHeading eyebrow="Supported" title={title} id="platforms-heading" />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {links.map((link) => {
          const Icon = PLATFORM_ICONS[link.platform];
          const accent = PLATFORMS[link.platform].accent;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className="group flex h-full flex-col gap-3 rounded-3xl border border-border bg-surface p-5 transition hover:-translate-y-1 hover:border-text hover:shadow-card"
              >
                <span className="grid size-11 place-items-center rounded-2xl text-white transition-transform group-hover:rotate-6" style={{ background: accent }}>
                  <Icon size={22} />
                </span>
                <span className="font-display text-lg font-bold">{link.label}</span>
                <span className="flex-1 text-sm text-muted">{link.blurb}</span>
                <span className="flex items-center gap-1 text-sm font-semibold">
                  Open <ArrowIcon size={15} className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe once "<" is escaped (prevents </script> breakouts).
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
