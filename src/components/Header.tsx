import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/instagram-reels-downloader", label: "Instagram" },
  { href: "/youtube-video-downloader", label: "YouTube" },
  { href: "/tiktok-downloader", label: "TikTok" },
  { href: "/pinterest-video-downloader", label: "Pinterest" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-bg/75 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/60">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav aria-label="Platforms" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-text"
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
