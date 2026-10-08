"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto max-w-xl px-4 pt-24 text-center">
      <h1 className="font-display text-3xl font-extrabold">Well, that wasn&apos;t supposed to happen.</h1>
      <p className="mt-3 text-muted">Something broke while loading this page.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex h-12 items-center rounded-full bg-text px-7 font-bold text-bg transition hover:opacity-90 active:scale-95"
      >
        Try again
      </button>
    </section>
  );
}
