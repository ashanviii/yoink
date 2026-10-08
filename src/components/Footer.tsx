import Link from "next/link";
import { LANDING_PAGES } from "@/lib/landing-pages";
import { site } from "@/lib/site";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="relative z-10 mt-24 bg-surface-2 sm:mt-28">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-[1.4fr_1fr_1fr] sm:px-6">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-[15px] leading-relaxed text-muted">
            Get exactly the part of a video you want, right from your phone. Respect creators and only download what you
            have the right to use.
          </p>
        </div>
        <nav aria-label="Downloaders">
          <h2 className="mb-4 text-[15px] font-extrabold">Downloaders</h2>
          <ul className="space-y-2.5 text-[15px] text-muted">
            {LANDING_PAGES.map((page) => (
              <li key={page.slug}>
                <Link href={`/${page.slug}`} className="transition hover:text-text">
                  {page.navLabel}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/download-videos-from-social-media" className="transition hover:text-text">
                Download guide
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Legal">
          <h2 className="mb-4 text-[15px] font-extrabold">Legal</h2>
          <ul className="space-y-2.5 text-[15px] text-muted">
            <li><Link href="/terms" className="transition hover:text-text">Terms of use</Link></li>
            <li><Link href="/privacy" className="transition hover:text-text">Privacy</Link></li>
            <li><Link href="/copyright" className="transition hover:text-text">Copyright & DMCA</Link></li>
            <li><a href={`mailto:${site.email}`} className="transition hover:text-text">Contact</a></li>
          </ul>
        </nav>
      </div>
      <p className="mx-auto max-w-6xl border-t border-border px-4 py-8 text-xs text-muted sm:px-6">
        Yoinkit is not affiliated with Instagram, Facebook, Meta, TikTok, ByteDance, Snapchat, Snap Inc. or Pinterest. All trademarks belong
        to their owners.
      </p>
    </footer>
  );
}
