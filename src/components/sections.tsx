import Link from "next/link";
import type { ReactNode } from "react";
import type { Faq } from "@/lib/landing-pages";
import type { PlatformId } from "@/lib/platforms";
import { ArrowIcon, PlatformIcon } from "./icons";

/** A page section: a big heading (and optional intro) above its content. */
export function Section({ title, id, intro, children }: { title: string; id: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 sm:pt-28">
      <h2 id={id} className="max-w-2xl text-balance font-display text-[2rem] font-extrabold leading-[1.08] sm:text-[2.75rem]">
        {title}
      </h2>
      {intro && <div className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{intro}</div>}
      <div className="mt-8 min-w-0 sm:mt-10">{children}</div>
    </section>
  );
}

/** "Paste the link. Copy it from…" → a short title and the rest as its explanation. */
function splitStep(step: string): { title: string; body: string } {
  const at = step.indexOf(". ");
  if (at === -1) return { title: step.replace(/\.$/, ""), body: "" };
  return { title: step.slice(0, at), body: step.slice(at + 2) };
}

export function Steps({ steps }: { steps: readonly string[] }) {
  return (
    <Section title="How it works" id="how-heading">
      <ol className="grid gap-4 md:grid-cols-3">
        {steps.map((step, i) => {
          const { title, body } = splitStep(step);
          return (
            <li key={step} className="rounded-[2rem] bg-surface-2 p-7">
              <span className="grid size-11 place-items-center rounded-full bg-accent font-display text-lg font-extrabold text-accent-ink">
                {i + 1}
              </span>
              <h3 className="mt-6 font-display text-xl font-extrabold leading-snug">{title}</h3>
              {body && <p className="mt-2 text-[15px] leading-relaxed text-muted">{body}</p>}
            </li>
          );
        })}
      </ol>
    </Section>
  );
}

export function Features({ features }: { features: readonly { title: string; body: string }[] }) {
  return (
    <Section title="What you get" id="features-heading">
      <dl className="grid gap-4 sm:grid-cols-2">
        {features.map((feature, i) => (
          <div
            key={feature.title}
            className={`rounded-[2rem] p-7 sm:p-8 ${i % 3 === 0 ? "bg-accent-soft" : "bg-surface-2"} sm:[&:last-child:nth-child(odd)]:col-span-2`}
          >
            <dt className="font-display text-2xl font-extrabold leading-tight">{feature.title}</dt>
            <dd className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">{feature.body}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

export function FaqSection({ faqs }: { faqs: readonly Faq[] }) {
  return (
    <Section title="Questions" id="faq-heading">
      <div className="max-w-3xl space-y-3">
        {faqs.map((faq, i) => (
          <details key={faq.q} className="group rounded-3xl bg-surface-2 px-6" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 [&::-webkit-details-marker]:hidden">
              <h3 className="font-display text-[17px] font-bold">{faq.q}</h3>
              <span
                aria-hidden
                className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-lg leading-none transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="max-w-2xl pb-6 text-[15px] leading-relaxed text-muted">{faq.a}</p>
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

export function PlatformGrid({ links, title = "Pick your app" }: { links: PlatformLink[]; title?: string }) {
  return (
    <Section title={title} id="platforms-heading">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="group flex h-full flex-col gap-5 rounded-[2rem] border border-border p-6 transition hover:border-transparent hover:bg-surface-2"
            >
              <div className="flex items-center justify-between">
                <PlatformIcon platform={link.platform} size={52} className="size-13 rounded-2xl" />
                <span className="grid size-10 place-items-center rounded-full bg-surface-2 transition group-hover:bg-text group-hover:text-bg">
                  <ArrowIcon size={17} />
                </span>
              </div>
              <span>
                <span className="block font-display text-xl font-extrabold">{link.label}</span>
                <span className="mt-1 block text-[15px] leading-relaxed text-muted">{link.blurb}</span>
              </span>
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
    <Section
      title="What it can download"
      id="support-heading"
      intro={
        <p>
          Yoinkit is a free video downloader and editor that works in any browser, built for phones first. Paste a public
          link from Instagram, TikTok, Facebook, Snapchat or Pinterest, trim or crop it if you like, and save it as MP4, GIF
          or WebM, the sound as MP3, or a frame as JPG or PNG. It needs no account, no app and no login, and it only works
          with public content.
        </p>
      }
    >
      <div className="overflow-x-auto rounded-[2rem] border border-border">
        <table className="w-full min-w-[34rem] text-left text-[15px]">
          <caption className="sr-only">Supported platforms and content types</caption>
          <thead className="bg-surface-2 text-sm text-muted">
            <tr>
              <th scope="col" className="px-6 py-4 font-semibold">Platform</th>
              <th scope="col" className="px-6 py-4 font-semibold">Supported</th>
              <th scope="col" className="px-6 py-4 font-semibold">Not supported</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.href} className="align-top">
                <th scope="row" className="px-6 py-4 font-bold">
                  <Link href={row.href} className="hover:underline hover:underline-offset-4">{row.platform}</Link>
                </th>
                <td className="px-6 py-4">{row.supported}</td>
                <td className="px-6 py-4 text-muted">{row.notSupported}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/** Closing band that sends people back up to the link box. */
export function GetStarted() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-20 sm:px-6 sm:pt-28">
      <div className="flex flex-col items-start gap-6 rounded-[2.5rem] bg-cream px-7 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-12 sm:py-14">
        <div>
          <h2 className="font-display text-[2rem] font-extrabold leading-[1.08] sm:text-[2.5rem]">Got a link? Let&apos;s get your clip.</h2>
          <p className="mt-3 text-lg text-muted">Free, no sign-up, and it works right in your phone&apos;s browser.</p>
        </div>
        <a
          href="#media-url"
          className="inline-flex h-14 shrink-0 items-center gap-2 rounded-full bg-text px-7 text-base font-bold text-bg transition hover:opacity-90"
        >
          Paste a link <ArrowIcon size={18} />
        </a>
      </div>
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
