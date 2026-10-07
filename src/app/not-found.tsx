import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl px-4 pt-24 text-center">
      <p className="font-display text-8xl font-bold text-muted">404</p>
      <h1 className="mt-4 font-display text-3xl font-extrabold">This page got yoinked.</h1>
      <p className="mt-3 text-muted">The page you&apos;re after doesn&apos;t exist (anymore).</p>
      <Link
        href="/"
        className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 font-display font-bold text-accent-ink transition hover:-translate-y-0.5 active:scale-95"
      >
        Back to the downloader
      </Link>
    </section>
  );
}
