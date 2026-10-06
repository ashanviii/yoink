import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Privacy Policy | ${site.name}`,
  description: `${site.name} doesn't require an account, doesn't store your links, and never stores your downloads.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="October 6, 2026">
      <p>Short version: we collect as little as possible and delete what we can as fast as we can.</p>
      <h2>What we process</h2>
      <ul>
        <li>
          <strong>Links you paste</strong> — sent to our server so we can fetch the media. They&apos;re cached in memory for
          up to 5 minutes to make repeat requests fast, and are not written to a database or log of your activity.
        </li>
        <li>
          <strong>Your downloads</strong> — downloaded, trimmed and converted in your browser and saved straight to your
          device, never stored on our server. Where a platform allows it, your browser fetches the video directly from that
          platform&apos;s servers, which see your IP address just as when you watch the post there. Otherwise it streams
          through our server on its way to you without being saved.
        </li>
        <li>
          <strong>Your IP address</strong> — held briefly in memory to enforce rate limits, then discarded.
        </li>
      </ul>
      <h2>What we don&apos;t do</h2>
      <ul>
        <li>No accounts and no social media logins — we never ask for your Instagram, TikTok, Facebook, Snapchat or Pinterest credentials.</li>
        <li>No advertising or cross-site tracking cookies.</li>
        <li>No selling or sharing of your data.</li>
      </ul>
      <h2>Local storage</h2>
      <p>We store your light/dark theme preference in your browser&apos;s local storage. That&apos;s it.</p>
    </LegalPage>
  );
}
