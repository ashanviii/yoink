import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: `Copyright & DMCA Policy | ${site.name}`,
  description: `How ${site.name} respects copyright and where rights holders can report infringing content.`,
  path: "/copyright",
});

export default function CopyrightPage() {
  return (
    <LegalPage title="Copyright & DMCA" updated="October 8, 2026">
      <p>
        {site.name} respects the rights of creators. We don&apos;t host or index content: media is fetched on demand from a
        link a user provides, and any trimming, cropping or conversion happens in that user&apos;s browser. Nothing is kept on
        our servers. We only support publicly accessible content and never bypass DRM, paywalls, or private-account
        restrictions.
      </p>
      <h2>Edited clips are still the creator&apos;s work</h2>
      <p>
        Trimming a video, cropping it, changing its speed or turning it into a GIF doesn&apos;t make it yours. Our{" "}
        <Link href="/terms">terms</Link> require users to only save or share content they own or have permission to use,
        edited or not.
      </p>
      <h2>For rights holders</h2>
      <p>
        Because the content itself lives on the original platform, please report infringing material to the platform where
        it&apos;s published. Once a platform removes a post or makes it private, {site.name} can no longer fetch it, and no
        one can make new clips or GIFs from it here.
      </p>
      <h2>Contact</h2>
      <p>
        For copyright notices or anything else about {site.name}, email{" "}
        <a href={`mailto:${site.email}`}>{site.email}</a>. Include the link to the content and how it infringes your rights.
      </p>
    </LegalPage>
  );
}
