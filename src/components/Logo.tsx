import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="group inline-flex items-center gap-2" aria-label="yoink home">
      <span className="grid size-9 -rotate-6 place-items-center rounded-xl bg-accent text-accent-ink shadow-[3px_3px_0_0_var(--text)] transition-transform duration-300 group-hover:rotate-6 group-active:scale-90">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 3v11m0 0-4.5-4.5M12 14l4.5-4.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 17.5c1.8 2 4.2 3 7 3s5.2-1 7-3" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </span>
      <span className="font-display text-2xl font-extrabold">yoink</span>
    </Link>
  );
}
