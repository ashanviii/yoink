import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Terms of Use | ${site.name}`,
  description: `The rules for using ${site.name}: personal use, public content only, and respect for creators' rights.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="October 1, 2026">
      <p>
        By using {site.name} you agree to these terms. If you don&apos;t agree, please don&apos;t use the service.
      </p>
      <h2>What yoink does</h2>
      <p>
        {site.name} is a tool that fetches publicly accessible media from a link you provide and converts it into a file
        you can save. We don&apos;t host, index, or curate any content, and we can&apos;t access private posts.
      </p>
      <h2>Your responsibilities</h2>
      <ul>
        <li>Only download content you own, that is licensed for reuse, or that you have the creator&apos;s permission to save.</li>
        <li>Comply with copyright law in your country and with the terms of the platform the content comes from.</li>
        <li>Don&apos;t use {site.name} to infringe copyright, harass people, or redistribute content without permission.</li>
        <li>Don&apos;t automate requests, scrape the service, or try to bypass rate limits or security measures.</li>
      </ul>
      <h2>Platform terms</h2>
      <p>
        Instagram, TikTok, Facebook, Snapchat and Pinterest each have their own terms of service, some of which restrict
        downloading. You are responsible for making sure your use complies with them. {site.name} is not affiliated with or
        endorsed by any of these platforms.
      </p>
      <h2>Fair use limits</h2>
      <p>
        To keep the service fast and available we apply rate limits and maximum file size/duration limits, and we may
        block abusive traffic.
      </p>
      <h2>No warranty</h2>
      <p>
        {site.name} is provided &quot;as is&quot;. Platforms change frequently and some links may stop working at any time. To
        the extent permitted by law, we aren&apos;t liable for any damages arising from your use of the service.
      </p>
      <h2>Copyright complaints</h2>
      <p>
        See our <Link href="/copyright">Copyright &amp; DMCA policy</Link>.
      </p>
    </LegalPage>
  );
}
