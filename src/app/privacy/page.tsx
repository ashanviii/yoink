import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: `Privacy Policy | ${site.name}`,
  description: `${site.name} has no accounts, edits your videos in your browser, and never stores your downloads.`,
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="October 8, 2026">
      <p>
        Short version: there are no accounts, your edits happen on your own device, and we keep as little as we can for as
        short a time as we can.
      </p>

      <h2>What we process</h2>
      <ul>
        <li>
          <strong>Links you paste.</strong> They&apos;re sent to our server so it can find the video. A link is cached in
          memory for up to 5 minutes so repeat requests are fast, and isn&apos;t saved to a database or tied to you. If
          fetching a link fails, the error (which can include the link) goes into a small rolling server log that&apos;s
          overwritten as new entries come in.
        </li>
        <li>
          <strong>Your videos and edits.</strong> Downloading, trimming, cropping, changing speed or volume, flipping,
          rotating, and converting to GIF, WebM, MP3 or still images all happen in your browser. The finished file is saved
          straight to your device and never uploaded to us.
        </li>
        <li>
          <strong>Where the video comes from.</strong> Where a platform allows it, your browser fetches the video directly
          from that platform&apos;s servers, which see your IP address just as when you watch the post there. Otherwise the
          video and its thumbnail stream through our server on their way to you, without being saved.
        </li>
        <li>
          <strong>Your IP address.</strong> Held in memory to enforce rate limits (how many links you can fetch per minute
          and how much data you can pull per hour), then discarded. It isn&apos;t written to disk.
        </li>
      </ul>

      <h2>What we don&apos;t do</h2>
      <ul>
        <li>No accounts and no social media logins. We never ask for your Instagram, TikTok, Facebook, Snapchat or Pinterest credentials.</li>
        <li>No analytics, advertising or cross-site tracking cookies.</li>
        <li>No history of the links you&apos;ve used, and no copies of your files.</li>
        <li>No selling or sharing of your data.</li>
      </ul>

      <h2>Where the service runs</h2>
      <p>
        {site.name} runs on a server rented from DigitalOcean in Singapore. It only handles what&apos;s described above.
      </p>

      <h2>Local storage</h2>
      <p>We store your light/dark theme preference in your browser&apos;s local storage. That&apos;s it.</p>

      <h2>Contact</h2>
      <p>
        Questions about your privacy? Email <a href={`mailto:${site.email}`}>{site.email}</a>.
      </p>
    </LegalPage>
  );
}
