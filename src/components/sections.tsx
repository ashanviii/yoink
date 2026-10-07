import Link from "next/link";
import type { ReactNode } from "react";
import type { Faq } from "@/lib/landing-pages";
import type { PlatformId } from "@/lib/platforms";
import { ArrowIcon, PlatformIcon } from "./icons";

/** A page section: heading in a narrow left column, content on the right (stacked on mobile). */
export function Section({ title, id, children }: { title: string; id: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mx-auto max-w-5xl px-4 pt-16 sm:pt-20">
      <div className="grid gap-5 border-t border-border pt-6 md:grid-cols-[13rem_1fr] md:gap-10">
        <h2 id={id} className="font-display text-2xl font-bold leading-tight">
          {title}
        </h2>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

export function Steps({ steps }: { steps: readonly string[] }) {
  return (
    <Section title="How it works" id="how-heading">
      <ol className="grid gap-6 sm:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step}>
            <span className="font-display text-sm font-bold text-muted tabular-nums">Step {i + 1}</span>
            <p className="mt-1.5 text-[15px] leading-relaxed">{step}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function Features({ features }: { features: readonly { title: string; body: string }[] }) {
  return (
    <Section title="What you get" id="features-heading">
      <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
        {features.map((feature) => (
          <div key={feature.title}>
            <dt className="font-semibold">{feature.title}</dt>
            <dd className="mt-1 text-[15px] leading-relaxed text-muted">{feature.body}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

export function FaqSection({ faqs }: { faqs: readonly Faq[] }) {
  return (
    <Section title="Questions" id="faq-heading">
      <div className="divide-y divide-border border-b border-border">
        {faqs.map((faq, i) => (
          <details key={faq.q} className="group" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-4 font-semibold [&::-webkit-details-marker]:hidden">
              <h3 className="text-[15px] group-hover:underline group-hover:underline-offset-4">{faq.q}</h3>
              <span aria-hidden className="text-lg leading-none text-muted transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="max-w-2xl pb-5 text-[15px] leading-relaxed text-muted">{faq.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

export interface PlatformLink {
  href: string;
  platform: PlatformId;
  label: string;
  blurb: string;
}

export function PlatformGrid({ links, title = "Platforms" }: { links: PlatformLink[]; title?: string }) {
  return (
    <Section title={title} id="platforms-heading">
      <ul className="grid gap-x-10 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
        {links.map((link) => (
          <li key={link.href} className="border-b border-border">
            <Link href={link.href} className="group flex items-center gap-3 py-3.5">
              <PlatformIcon platform={link.platform} size={36} className="size-9 shrink-0 rounded-lg" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold group-hover:underline group-hover:underline-offset-4">{link.label}</span>
                <span className="block text-sm text-muted">{link.blurb}</span>
              </span>
              <ArrowIcon size={16} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-text" />
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export interface SupportRow {
  href: string;
  platform: string;
  supported: string;
  notSupported: string;
}

/** Plain-text, quotable summary of exactly what the tool does — easy for search engines and AI assistants to lift. */
export function SupportTable({ rows }: { rows: readonly SupportRow[] }) {
  return (
    <Section title="What it can download" id="support-heading">
      <p className="mb-6 max-w-2xl text-[15px] leading-relaxed text-muted">
        Yoinkit is a free online video downloader that works in any browser. Paste a public link from Instagram, TikTok,
        Facebook, Snapchat or Pinterest, choose a quality, and save the video as MP4 or the audio as MP3. It needs no
        account, no app and no login, and it only works with public content.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <caption className="sr-only">Supported platforms and content types</caption>
          <thead className="border-b border-border text-xs text-muted">
            <tr>
              <th scope="col" className="py-2.5 pr-4 font-medium">Platform</th>
              <th scope="col" className="py-2.5 pr-4 font-medium">Supported</th>
              <th scope="col" className="py-2.5 font-medium">Not supported</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border border-b border-border">
            {rows.map((row) => (
              <tr key={row.href} className="align-top">
                <th scope="row" className="py-3 pr-4 font-semibold">
                  <Link href={row.href} className="hover:underline hover:underline-offset-4">{row.platform}</Link>
                </th>
                <td className="py-3 pr-4">{row.supported}</td>
                <td className="py-3 text-muted">{row.notSupported}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
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
