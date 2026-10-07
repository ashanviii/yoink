import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: `Terms of Use | ${site.name}`,
  description: `The rules for using ${site.name}: personal use, public content only, and respect for creators' rights, including for clips you edit.`,
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="October 8, 2026">
      <p>
        By using {site.name} you agree to these terms. If you don&apos;t agree, please don&apos;t use the service.
      </p>

      <h2>What Yoinkit does</h2>
      <p>
        {site.name} fetches publicly accessible media from a link you provide and lets you save it, either as it is or
        edited: trimmed, cropped, sped up or slowed down, with the volume changed, flipped, rotated, or converted to GIF,
        WebM, MP3 or still images. Editing happens in your browser. We don&apos;t host, index or curate any content, and we
        can&apos;t access private posts.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>Only download content you own, that is licensed for reuse, or that you have the creator&apos;s permission to save.</li>
        <li>
          Editing doesn&apos;t change who owns something. A trimmed clip, a cropped video or a GIF made from someone
          else&apos;s post is still their work, so the same permission rules apply.
        </li>
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
        To keep the service fast and free for everyone, we limit how many links you can fetch per minute and how much data
        you can download per hour, cap the total the service handles each day, and set maximum lengths and file sizes
        (for example, GIFs can be up to 15 seconds). We may block abusive traffic.
      </p>

      <h2>No warranty</h2>
      <p>
        {site.name} is provided &quot;as is&quot;. Platforms change frequently and some links may stop working at any time.
        Edits are processed by your own device, so long or high-quality videos may be slow or fail on older phones. To the
        extent permitted by law, we aren&apos;t liable for any damages arising from your use of the service.
      </p>

      <h2>Copyright complaints</h2>
      <p>
        See our <Link href="/copyright">Copyright &amp; DMCA policy</Link>, or email{" "}
        <a href={`mailto:${site.email}`}>{site.email}</a>.
      </p>
    </LegalPage>
  );
}
