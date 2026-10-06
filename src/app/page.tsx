import { Hero } from "@/components/Hero";
import { FaqSection, Features, JsonLd, PlatformGrid, Steps, type PlatformLink } from "@/components/sections";
import { HOME_FAQS } from "@/lib/landing-pages";
import { site } from "@/lib/site";
import { faqSchema, howToSchema, webAppSchema, websiteSchema } from "@/lib/structured-data";

const STEPS = [
  "Copy the link to any public reel, story, TikTok, Facebook video, Spotlight snap or pin.",
  "Paste it into yoink — we auto-detect the platform and fetch every quality option.",
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

export default function Home() {
  return (
    <>
      <JsonLd
        data={[
          websiteSchema(),
          webAppSchema({ name: site.name, description: site.description, path: "/" }),
          howToSchema("How to download videos with yoink", STEPS),
          faqSchema(HOME_FAQS),
        ]}
      />
      <Hero
        eyebrow="Instagram · TikTok · Facebook · Snapchat · Pinterest"
        title="Yoink any video in"
        highlight="max quality"
        subtitle="Paste a link. Pick a quality. Trim if you like. Reels, TikToks, Facebook videos, Spotlight snaps and Pins — no watermark, no app, no login."
      />
      <PlatformGrid links={PLATFORM_LINKS} />
      <Steps steps={STEPS} />
      <Features features={FEATURES} />
      <FaqSection faqs={HOME_FAQS} />
    </>
  );
}
