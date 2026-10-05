import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Privacy Policy | ${site.name}`,
  description: `${site.name} doesn't require an account, doesn't store your links, and deletes prepared files within minutes.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="October 1, 2026">
      <p>Short version: we collect as little as possible and delete what we can as fast as we can.</p>
      <h2>What we process</h2>
      <ul>
        <li>
          <strong>Links you paste</strong> — sent to our server so we can fetch the media. They&apos;re cached in memory for
          up to 5 minutes to make repeat requests fast, and are not written to a database or log of your activity.
        </li>
        <li>
          <strong>Prepared files</strong> — stored temporarily on our server while you download them and deleted
          automatically within about 10 minutes.
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
      <h2>Contact</h2>
      <p>
        Questions? Email <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
      </p>
    </LegalPage>
  );
}
