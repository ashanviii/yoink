import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/instagram-reels-downloader", label: "Instagram" },
  { href: "/tiktok-downloader", label: "TikTok" },
  { href: "/facebook-video-downloader", label: "Facebook" },
  { href: "/snapchat-spotlight-downloader", label: "Snapchat" },
  { href: "/pinterest-video-downloader", label: "Pinterest" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Platforms" className="hidden items-center gap-0.5 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-[15px] font-semibold text-text/80 transition hover:bg-surface-2 hover:text-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
