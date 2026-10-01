import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl px-4 pt-12">
      <h1 className="font-display text-4xl font-extrabold">{title}</h1>
      <p className="mt-2 text-sm text-muted">Last updated {updated}</p>
      <div className="mt-8 space-y-5 text-[15px] leading-relaxed [&_a]:font-semibold [&_a]:underline [&_a]:decoration-pop [&_a]:underline-offset-4 [&_h2]:pt-4 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </article>
  );
}
