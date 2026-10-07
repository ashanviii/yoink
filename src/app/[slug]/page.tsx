import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Hero } from "@/components/Hero";
import { FaqSection, Features, JsonLd, PlatformGrid, Steps } from "@/components/sections";
import { LANDING_PAGES, getLandingPage } from "@/lib/landing-pages";
import { PLATFORMS } from "@/lib/platforms";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbSchema, faqSchema, howToSchema, webAppSchema } from "@/lib/structured-data";

export const dynamicParams = false;

export function generateStaticParams() {
  return LANDING_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata(props: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const page = getLandingPage(slug);
  if (!page) return {};
  return pageMetadata({ title: page.title, description: page.description, path: `/${page.slug}`, keywords: page.keywords });
}

export default async function LandingPage(props: PageProps<"/[slug]">) {
  const { slug } = await props.params;
  const page = getLandingPage(slug);
  if (!page) notFound();

  const platform = PLATFORMS[page.platform];
  const path = `/${page.slug}`;
  const siblings = LANDING_PAGES.filter((p) => p.slug !== page.slug)
    .sort((a, b) => Number(b.platform === page.platform) - Number(a.platform === page.platform))
    .slice(0, 4)
    .map((p) => ({ href: `/${p.slug}`, platform: p.platform, label: p.navLabel, blurb: p.description.split(". ")[0] + "." }));

  return (
    <>
      <JsonLd
        data={[
          webAppSchema({ name: page.title.split(" | ")[0], description: page.description, path }),
          howToSchema(`How to use the ${page.navLabel} downloader`, page.steps),
          faqSchema(page.faqs),
          breadcrumbSchema([
            { name: "Yoinkit", path: "/" },
            { name: page.navLabel, path },
          ]),
        ]}
      />
      <nav aria-label="Breadcrumb" className="mx-auto max-w-3xl px-4 pt-6 text-xs text-muted">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-text">Yoinkit</Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="font-semibold text-text">
            {page.navLabel}
          </li>
        </ol>
      </nav>
      <Hero
        eyebrow={`${platform.name} downloader`}
        title={page.h1}
        highlight={page.highlight}
        subtitle={page.subtitle}
        placeholder={page.placeholder}
        platform={page.platform}
      />
      <Steps steps={page.steps} />
      <Features features={page.features} />
      <FaqSection faqs={page.faqs} />
      <PlatformGrid links={siblings} title="More downloaders" />
    </>
  );
}
