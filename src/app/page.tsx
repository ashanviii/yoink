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
  "Paste the link. Copy it from Instagram, TikTok, Facebook, Snapchat or Pinterest and drop it in the box.",
  "Pick the part. Trim to the moment, crop to the shape you need, and change the speed or volume if you like. Or skip all of it.",
  "Save it your way: a video, a GIF, just the sound, or a single frame. It goes straight to your phone.",
];

const FEATURES = [
  {
    title: "Just the part you want",
    body: "Trim to the second on a filmstrip and crop to 9:16, 1:1, 4:5 or 16:9, so you only keep the bit worth keeping.",
  },
  {
    title: "Made for your phone",
    body: "Everything happens on one screen with taps and drags. Nothing to install, and it works just as well on a laptop.",
  },
  {
    title: "Every format in one place",
    body: "Save as MP4, GIF or WebM, pull the sound out as MP3, or grab a single frame as JPG or PNG. No second app to convert it.",
  },
  {
    title: "Clean and full quality",
    body: "TikTok's watermarked copy is skipped, and you get the highest quality each platform offers.",
  },
  {
    title: "Nothing to sign up for",
    body: "No account and no login. Edits happen in your browser and files go straight to your device. We never keep a copy.",
  },
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
          howToSchema("How to save just the part of a video you want with Yoinkit", STEPS),
          faqSchema(HOME_FAQS),
        ]}
      />
      <Hero
        title="Yoink exactly the part you want"
        subtitle="Paste a Reel, TikTok, Facebook video, Snap or Pin. Trim it, crop it, speed it up, then save it as a video, GIF, sound or still. All on one screen, made for your phone."
      />
      <Steps steps={STEPS} />
      <Features features={FEATURES} />
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
      <FaqSection faqs={HOME_FAQS} />
    </>
  );
}
