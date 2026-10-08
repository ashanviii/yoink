import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl px-4 pt-24 text-center">
      <p className="font-display text-8xl font-bold text-muted">404</p>
      <h1 className="mt-4 font-display text-3xl font-extrabold">This page got yoinked.</h1>
      <p className="mt-3 text-muted">The page you&apos;re after doesn&apos;t exist (anymore).</p>
      <Link
        href="/"
        className="mt-8 inline-flex h-12 items-center rounded-full bg-text px-7 font-bold text-bg transition hover:opacity-90 active:scale-95"
      >
        Back to the downloader
      </Link>
    </section>
  );
}
