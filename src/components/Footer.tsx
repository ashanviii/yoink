import Link from "next/link";
import { LANDING_PAGES } from "@/lib/landing-pages";
import { site } from "@/lib/site";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="relative z-10 mt-24 border-t border-border bg-surface/60">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:grid-cols-[1.3fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted">
            Get exactly the part of a video you want, right from your phone. Respect creators and only download what you
            have the right to use.
          </p>
        </div>
        <nav aria-label="Downloaders">
          <h2 className="mb-3 text-sm font-semibold">Downloaders</h2>
          <ul className="space-y-2 text-sm">
            {LANDING_PAGES.map((page) => (
              <li key={page.slug}>
                <Link href={`/${page.slug}`} className="transition hover:text-text hover:underline hover:underline-offset-4">
                  {page.navLabel}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/download-videos-from-social-media" className="transition hover:text-text hover:underline hover:underline-offset-4">
                Download guide
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Legal">
          <h2 className="mb-3 text-sm font-semibold">Legal</h2>
          <ul className="space-y-2 text-sm">
            <li><Link href="/terms" className="transition hover:text-text hover:underline hover:underline-offset-4">Terms of use</Link></li>
            <li><Link href="/privacy" className="transition hover:text-text hover:underline hover:underline-offset-4">Privacy</Link></li>
            <li><Link href="/copyright" className="transition hover:text-text hover:underline hover:underline-offset-4">Copyright & DMCA</Link></li>
            <li><a href={`mailto:${site.email}`} className="transition hover:text-text hover:underline hover:underline-offset-4">Contact</a></li>
          </ul>
        </nav>
      </div>
      <p className="mx-auto max-w-5xl px-4 pb-10 text-xs text-muted">
        Yoinkit is not affiliated with Instagram, Facebook, Meta, TikTok, ByteDance, Snapchat, Snap Inc. or Pinterest. All trademarks belong
        to their owners.
      </p>
    </footer>
  );
}
