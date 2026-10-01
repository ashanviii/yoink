import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Copyright & DMCA Policy | ${site.name}`,
  description: `How ${site.name} respects copyright and how rights holders can contact us.`,
  alternates: { canonical: "/copyright" },
};

export default function CopyrightPage() {
  return (
    <LegalPage title="Copyright & DMCA" updated="October 1, 2026">
      <p>
        {site.name} respects the rights of creators. We don&apos;t host or index content: every file is fetched on demand from
        a link a user provides, served once, and deleted within minutes. We only support publicly accessible content and
        never bypass DRM, paywalls, or private-account restrictions.
      </p>
      <h2>For rights holders</h2>
      <p>
        If you believe {site.name} is being used to infringe your copyright, or you&apos;d like a specific URL blocked from
        being processed, email <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> with:
      </p>
      <ul>
        <li>Identification of the copyrighted work.</li>
        <li>The specific URL(s) of the content on the source platform.</li>
        <li>Your contact information.</li>
        <li>
          A statement that you have a good-faith belief the use is not authorized, and that the information in your notice
          is accurate, under penalty of perjury.
        </li>
        <li>Your physical or electronic signature.</li>
      </ul>
      <p>
        Because the content itself lives on the original platform, you may also want to file a report with that platform
        directly.
      </p>
    </LegalPage>
  );
}
