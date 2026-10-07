import Link from "next/link";
import { Hero } from "@/components/Hero";
import { ArrowIcon } from "@/components/icons";
import {
  FaqSection,
  Features,
  JsonLd,
  PlatformGrid,
  Steps,
  SupportTable,
  type PlatformLink,
  type SupportRow,
} from "@/components/sections";
import { HOME_FAQS } from "@/lib/landing-pages";
import { site } from "@/lib/site";
import { faqSchema, howToSchema, organizationSchema, webAppSchema, websiteSchema } from "@/lib/structured-data";

const STEPS = [
  "Copy the link to any public reel, story, TikTok, Facebook video, Spotlight snap or pin.",
  "Paste it into Yoinkit. We detect the platform and list every quality it has.",
  "Pick a resolution or MP3 and the file lands straight on your device.",
];

const FEATURES = [
  { title: "Max quality, always", body: "We list every resolution the platform has and merge video with the best audio track." },
  { title: "No watermarks", body: "TikTok's watermarked copy is filtered out. You get the clean stream, as uploaded." },
  { title: "MP3 in one tap", body: "Rip just the audio from any video as MP3, or grab the untouched original as M4A." },
  { title: "Private by default", body: "No accounts, no logins, no link history. Downloads are processed in your browser, never stored on our servers." },
];

const PLATFORM_LINKS: PlatformLink[] = [
  { href: "/instagram-reels-downloader", platform: "instagram", label: "Instagram", blurb: "Reels, Stories, video posts & carousels." },
  { href: "/tiktok-downloader", platform: "tiktok", label: "TikTok", blurb: "Clean HD videos without the watermark." },
  { href: "/facebook-video-downloader", platform: "facebook", label: "Facebook", blurb: "Public videos & Reels in HD." },
  { href: "/snapchat-spotlight-downloader", platform: "snapchat", label: "Snapchat", blurb: "Spotlight snaps in original quality." },
  { href: "/pinterest-video-downloader", platform: "pinterest", label: "Pinterest", blurb: "Video pins & Idea Pins in HD." },
];

const SUPPORT_ROWS: SupportRow[] = [
  { href: "/instagram-reels-downloader", platform: "Instagram", supported: "Reels, Stories & Highlights, video posts, carousels, IGTV", notSupported: "Private accounts, photo-only posts" },
  { href: "/tiktok-downloader", platform: "TikTok", supported: "Public videos without watermark, sound as MP3, short links", notSupported: "Private videos, photo slideshows" },
  { href: "/facebook-video-downloader", platform: "Facebook", supported: "Public videos, Reels, Watch, fb.watch links", notSupported: "Private profiles, closed groups" },
  { href: "/snapchat-spotlight-downloader", platform: "Snapchat", supported: "Public Spotlight videos", notSupported: "Private snaps, friends-only stories" },
  { href: "/pinterest-video-downloader", platform: "Pinterest", supported: "Video pins, Idea Pins, pin.it links", notSupported: "Image pins, whole boards" },
];

export default function Home() {
  return (
    <>
      <JsonLd
        data={[
          websiteSchema(),
          organizationSchema(),
          webAppSchema({ name: site.name, description: site.description, path: "/" }),
          howToSchema("How to download videos with Yoinkit", STEPS),
          faqSchema(HOME_FAQS),
        ]}
      />
      <Hero
        title="Yoink any video in max quality"
        subtitle="Paste a public link from Instagram, TikTok, Facebook, Snapchat or Pinterest. Pick a quality, trim it if you want, and save it. No watermark, and nothing to install."
      />
      <PlatformGrid links={PLATFORM_LINKS} />
      <SupportTable rows={SUPPORT_ROWS} />
      <div className="mx-auto max-w-5xl px-4 pt-6 md:pl-[calc(13rem+2.5rem+1rem)]">
        <Link
          href="/download-videos-from-social-media"
          className="group inline-flex items-center gap-1.5 text-sm font-semibold underline decoration-border underline-offset-4 hover:decoration-text"
        >
          Read the full guide to downloading from each platform, on iPhone, Android and desktop
          <ArrowIcon size={15} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <Steps steps={STEPS} />
      <Features features={FEATURES} />
      <FaqSection faqs={HOME_FAQS} />
    </>
  );
}
