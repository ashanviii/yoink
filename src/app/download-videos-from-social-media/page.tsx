import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { JsonLd } from "@/components/sections";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";
import { breadcrumbSchema, faqSchema } from "@/lib/structured-data";

const PATH = "/download-videos-from-social-media";
const TITLE = "How to Download and Trim Videos from Instagram, TikTok, Facebook, Snapchat & Pinterest";
const DESCRIPTION =
  "A practical guide to saving public videos from Instagram, TikTok, Facebook, Snapchat and Pinterest, or just the part you want: what works on each platform, how to trim, crop or make a GIF on your phone, and how to choose a safe downloader.";
const PUBLISHED = "2026-10-07";
const MODIFIED = "2026-10-08";

export const metadata: Metadata = pageMetadata({ title: `Download & Trim Videos from Instagram & TikTok | ${site.name}`, description: DESCRIPTION, path: PATH });

const FAQS = [
  { q: "What is the easiest way to download a video from Instagram, TikTok or Facebook?", a: "Copy the video's link, paste it into an online downloader that supports the platform, choose a quality and save the file. No app or account is needed with a browser-based tool like Yoinkit." },
  { q: "How do I save only part of a video?", a: "Use a downloader that can trim before saving. In Yoinkit, paste the link, tick Trim, drag the handles to the part you want and download. Only that part is saved, so there's no need for a separate editing app." },
  { q: "How do I turn a Reel or TikTok into a GIF?", a: "Paste the link into Yoinkit, trim it to 15 seconds or less, and choose GIF under Other formats. You can crop it or change its speed first too." },
  { q: "Can I download private videos?", a: "No. Legitimate downloaders can only fetch content that anyone can watch without logging in. Be wary of any tool that asks for your social media password to get around this." },
  { q: "Can I download TikTok videos without the watermark?", a: "Yes. TikTok serves a clean playback stream alongside its watermarked download copy. A downloader that offers the clean stream saves the video without the logo." },
  { q: "Where do downloaded videos end up on my phone?", a: "On Android they usually land in the Downloads folder. On iPhone, Safari saves to the Files app; open the file and tap Share, then Save Video, to move it to Photos." },
  { q: "Is it legal to download videos from social media?", a: "Saving a public video for personal viewing is generally treated differently from reposting it, but rules vary by country and each platform's terms may restrict downloading. Only reuse content you own or have permission to use." },
  { q: "Can I save just the audio?", a: "Yes. Most downloaders, including Yoinkit, can export the audio of a video as MP3 or M4A." },
];

export default function GuidePage() {
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: TITLE,
            description: DESCRIPTION,
            datePublished: PUBLISHED,
            dateModified: MODIFIED,
            mainEntityOfPage: absoluteUrl(PATH),
            author: { "@type": "Organization", name: site.name, url: site.url },
            publisher: { "@type": "Organization", name: site.name, url: site.url },
          },
          faqSchema(FAQS),
          breadcrumbSchema([
            { name: "Yoinkit", path: "/" },
            { name: "Download guide", path: PATH },
          ]),
        ]}
      />
      <LegalPage title={TITLE} updated="October 8, 2026">
        <p>
          <strong>Short answer:</strong> copy the link to a public video, paste it into a browser-based downloader that
          supports that platform, and save the file. If you only want part of it, pick a downloader that lets you trim and
          crop before saving, so you don&apos;t need a second editing app. This guide covers how that works on Instagram,
          TikTok, Facebook, Snapchat and Pinterest, what each platform does and doesn&apos;t allow, and how to choose a
          downloader you can trust.
        </p>

        <h2>Saving just the part you want</h2>
        <p>
          Most of the time you don&apos;t want a whole 90-second Reel, just the five seconds that made you laugh. The usual
          routine is to download the full video, open an editing app, trim it, export it, then delete the original. With{" "}
          {site.name} it all happens on one screen, right after you paste the link:
        </p>
        <ul>
          <li><strong>Trim</strong> to the second by dragging the handles on a filmstrip of the video.</li>
          <li><strong>Crop</strong> to 9:16, 1:1, 4:5, 16:9 or any shape you draw, for stories, feeds or chats.</li>
          <li><strong>Change the speed or volume</strong>, or <strong>flip and rotate</strong> it, if you need to.</li>
          <li>
            <strong>Save it your way:</strong> MP4, a GIF (up to 15 seconds), WebM, just the sound as MP3, or a single frame
            as JPG or PNG.
          </li>
        </ul>
        <p>Every edit is optional. Skip them all and you get the original video in the best quality available.</p>

        <h2>What to look for in a video downloader</h2>
        <ul>
          <li><strong>No login or password.</strong> A downloader for public videos never needs your social media credentials. If one asks for them, leave.</li>
          <li><strong>Works in the browser.</strong> No app or browser extension to install means less to go wrong on your phone or PC.</li>
          <li><strong>Made for your phone.</strong> Most links get shared on phones, so the whole thing should work with taps and drags on a small screen.</li>
          <li><strong>Editing in the same place.</strong> Trimming and cropping before you save beats juggling a second app.</li>
          <li><strong>Quality choice.</strong> It should list the resolutions the platform actually has and merge the best audio with the video.</li>
          <li><strong>Clean files.</strong> No added watermark, and for TikTok, the option to skip the platform&apos;s own watermarked copy.</li>
          <li><strong>Audio export.</strong> MP3 or M4A for when you only want the sound.</li>
          <li><strong>Clear limits.</strong> A trustworthy tool says plainly what it can&apos;t do, such as private posts, instead of failing silently.</li>
          <li><strong>Privacy.</strong> Look for no accounts and no stored download history. {site.name} processes downloads in your browser and doesn&apos;t keep copies.</li>
        </ul>

        <h2>Instagram</h2>
        <p>
          Reels, public video posts, carousels with several videos and public Stories or Highlights can be saved when the
          content is publicly viewable. Photo-only posts and private accounts can&apos;t. In Instagram, tap the share arrow
          or ••• and choose Copy link, then paste it into the{" "}
          <Link href="/instagram-reels-downloader">Instagram Reels downloader</Link>. For other formats see the{" "}
          <Link href="/instagram-story-downloader">Story downloader</Link> and the{" "}
          <Link href="/instagram-video-downloader">video &amp; carousel downloader</Link>. Many Stories sit behind a login
          wall, so a downloader that doesn&apos;t use your account may not be able to fetch them. Reels are the most common
          thing to trim: cut to the moment, crop it to 9:16 for your own story, or turn it into a GIF.
        </p>

        <h2>TikTok</h2>
        <p>
          TikTok videos that are public can be downloaded in HD. In the app tap Share, then Copy link (short vm.tiktok.com
          links work). Use the <Link href="/tiktok-downloader">TikTok downloader</Link> to get the clean stream without the
          watermark, trim it or make a GIF, or save only the sound as MP3. Private videos and photo slideshows aren&apos;t
          supported.
        </p>

        <h2>Facebook</h2>
        <p>
          Public Facebook videos, Reels and Watch videos work, including fb.watch short links. Videos limited to friends,
          private profiles or closed groups can&apos;t be fetched. Copy the link from Share and paste it into the{" "}
          <Link href="/facebook-video-downloader">Facebook video downloader</Link>, then choose HD or SD. Facebook videos
          tend to be long, so trimming to the one clip you need saves a lot of space.
        </p>

        <h2>Snapchat</h2>
        <p>
          Public Spotlight videos can be saved at the quality Snapchat serves, usually vertical 720p or 1080p. Private snaps
          and friends-only Stories can&apos;t be accessed. Copy the Spotlight link and use the{" "}
          <Link href="/snapchat-spotlight-downloader">Snapchat Spotlight downloader</Link>. When Snapchat has a copy without
          the logo and username burned in, {site.name} saves that one.
        </p>

        <h2>Pinterest</h2>
        <p>
          Video pins and Idea Pins can be downloaded, and pin.it short links are followed to the full pin. Image pins and
          whole boards aren&apos;t supported. Copy the pin&apos;s link and use the{" "}
          <Link href="/pinterest-video-downloader">Pinterest video downloader</Link>. For recipes and tutorials, trimming
          to the one step you need is handy.
        </p>

        <h2>Saving videos on iPhone and Android</h2>
        <ul>
          <li><strong>iPhone:</strong> use Safari. The file is saved to the Files app (Downloads). Open it, tap Share, then Save Video to add it to Photos.</li>
          <li><strong>Android:</strong> the file goes to your Downloads folder and appears in your gallery or Files app, depending on the phone.</li>
          <li><strong>Computer:</strong> the video downloads to your browser&apos;s default Downloads folder.</li>
        </ul>

        <h2>Staying safe and respectful</h2>
        <ul>
          <li>Avoid tools that ask you to log in with Instagram, TikTok, Facebook, Snapchat or Pinterest, or to install unknown software.</li>
          <li>Skip sites covered in pop-ups or that push you to download an &quot;installer&quot; instead of a video.</li>
          <li>Only reuse content you own or have permission to use, and credit creators. See our <Link href="/terms">terms</Link> and <Link href="/copyright">copyright policy</Link>.</li>
        </ul>

        <h2>Frequently asked questions</h2>
        {FAQS.map((faq) => (
          <div key={faq.q}>
            <h3 className="font-display text-lg font-bold">{faq.q}</h3>
            <p className="mt-1">{faq.a}</p>
          </div>
        ))}

        <p>
          Ready to try it? Paste a link into <Link href="/">{site.name}</Link> and keep exactly the part you want, or pick
          your platform above.
        </p>
      </LegalPage>
    </>
  );
}
