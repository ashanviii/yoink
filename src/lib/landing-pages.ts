import type { PlatformId } from "./platforms";

export interface Faq {
  q: string;
  a: string;
}

export interface LandingPage {
  slug: string;
  platform: PlatformId;
  /** <title> — keep under ~60 chars. */
  title: string;
  /** Meta description — keep under ~160 chars. */
  description: string;
  keywords: string[];
  /** The H1 is `h1` followed by `highlight`. */
  h1: string;
  highlight: string;
  subtitle: string;
  placeholder: string;
  /** Short label for nav/footer links. */
  navLabel: string;
  steps: [string, string, string];
  features: { title: string; body: string }[];
  faqs: Faq[];
}

export const LANDING_PAGES: LandingPage[] = [
  {
    slug: "instagram-reels-downloader",
    platform: "instagram",
    title: "Instagram Reels Downloader — Trim, Crop, HD | Yoinkit",
    description:
      "Download Instagram Reels in HD, or just the part you want. Trim, crop or turn a reel into a GIF, then save it as MP4, GIF or MP3. Free, no app, no login.",
    keywords: [
      "instagram reels downloader",
      "download instagram reels",
      "trim instagram reel",
      "instagram reel to gif",
      "reels to mp4",
      "reels mp3",
    ],
    h1: "Download Instagram Reels,",
    highlight: "or just the best part",
    subtitle:
      "Paste a reel link, trim it to the moment you want, crop it for your story, and save it as MP4, GIF or MP3. All on your phone, with no app or login.",
    placeholder: "https://www.instagram.com/reel/…",
    navLabel: "IG Reels",
    steps: [
      "Copy the link. In Instagram, tap the share arrow or ••• on the reel, then Copy link.",
      "Pick the part. Paste it here and tap Yoink it, then trim, crop or change the speed if you want. Or keep the whole reel.",
      "Save it as an MP4 in up to full HD, a GIF, or just the sound as MP3.",
    ],
    features: [
      { title: "Just the moment you want", body: "Trim to the second on a filmstrip, then crop to 9:16, 1:1 or 4:5 for your own story or feed." },
      { title: "Reel to GIF", body: "Turn any stretch of up to 15 seconds into a GIF you can drop into a chat." },
      { title: "Original quality and sound", body: "You get the highest quality Instagram serves, with the original audio. Or save just the sound as MP3." },
      { title: "No app, no login", body: "Works in Safari or Chrome on your phone. We never ask for your Instagram login, and only public reels work." },
    ],
    faqs: [
      { q: "Can I save just part of a reel?", a: "Yes. Tick Trim, drag the handles to the part you want and download. You can crop it, change the speed or make it a GIF too." },
      { q: "Can I download Instagram Reels without logging in?", a: "Yes. Yoinkit only fetches public reels, so you never need to sign in or share your Instagram credentials." },
      { q: "What quality are downloaded reels?", a: "The best resolution Instagram stores for that reel, usually 720p or 1080p, with the original audio." },
      { q: "Does the downloaded reel have a watermark?", a: "No. Instagram doesn't burn a watermark into the video file, and Yoinkit doesn't add one either." },
      { q: "Can I download reels from private accounts?", a: "No. Private content stays private. Yoinkit only works with posts anyone can view without logging in." },
      { q: "Where do downloaded reels go on iPhone?", a: "Safari saves them to the Files app (Downloads folder). Open the file and tap Share, then Save Video, to move it to Photos." },
    ],
  },
  {
    slug: "instagram-story-downloader",
    platform: "instagram",
    title: "Instagram Story Downloader — Save Stories in HD | Yoinkit",
    description:
      "Save public Instagram Stories and Highlights in original quality. Keep the whole story or just the part you want, as MP4, GIF or MP3. Free and anonymous.",
    keywords: ["instagram story downloader", "download instagram stories", "instagram highlights downloader", "story saver"],
    h1: "Save Instagram Stories",
    highlight: "before they're gone",
    subtitle: "Paste a public story or Highlights link, keep the bit you want, and save it to your phone in its original quality.",
    placeholder: "https://www.instagram.com/stories/username/…",
    navLabel: "IG Stories",
    steps: [
      "Copy the link. Open the story, tap ••• and choose Copy link, or copy a Highlights link.",
      "Pick the part. Paste it here and tap Yoink it, then trim or crop if you want.",
      "Save it as MP4, GIF or MP3.",
    ],
    features: [
      { title: "Stories and Highlights", body: "Works with single story links and saved Highlights. Each clip in a Highlight gets its own download." },
      { title: "Keep just the moment", body: "Trim a story down to the second you care about, or crop it into a square for your feed." },
      { title: "Original resolution", body: "Stories are saved as Instagram stores them, unless you choose to edit them." },
      { title: "Honest about logins", body: "Instagram puts many stories behind a login. If one isn't public, we say so instead of handing you a broken file." },
    ],
    faqs: [
      { q: "Why does Yoinkit say a story needs a login?", a: "Instagram puts most stories behind a login wall. Yoinkit never uses your account, so stories that aren't publicly reachable can't be fetched." },
      { q: "Does the person know I saved their story?", a: "Yoinkit fetches stories from our server, not your account, so your username doesn't appear in their viewer list." },
      { q: "Can I download Instagram Highlights?", a: "Yes. Paste a Highlights link (instagram.com/stories/highlights/…) and every public clip shows up." },
      { q: "Are photo stories supported?", a: "Not yet. Yoinkit focuses on video, so photo-only stories aren't supported." },
      { q: "Is it okay to repost someone's story?", a: "Only with permission. Saving something to watch later is one thing; reposting someone else's content needs their consent." },
    ],
  },
  {
    slug: "instagram-video-downloader",
    platform: "instagram",
    title: "Instagram Video & Post Downloader (Carousels too) | Yoinkit",
    description:
      "Download videos from Instagram posts and carousels in HD. Trim, crop or make a GIF from any of them, then save as MP4, GIF or MP3. No login required.",
    keywords: ["instagram video downloader", "instagram post downloader", "instagram carousel downloader", "ig video download"],
    h1: "Download Instagram",
    highlight: "posts & carousels",
    subtitle: "Paste any public post link. Every video in a carousel gets its own download, and you can trim or crop each one first.",
    placeholder: "https://www.instagram.com/p/…",
    navLabel: "IG Posts",
    steps: [
      "Copy the link from the ••• menu or the share sheet.",
      "Paste it here and tap Yoink it. Carousels list every video, and you can trim or crop each one.",
      "Save each video as MP4, GIF or MP3.",
    ],
    features: [
      { title: "Carousel aware", body: "Up to 20 videos from a single carousel post, each with its own quality picker." },
      { title: "Edit before you save", body: "Trim, crop, change the speed, flip or rotate any video in the post before it reaches your phone." },
      { title: "IGTV and long videos", body: "Older /tv/ links work too, in their best available resolution." },
      { title: "Zero tracking", body: "No accounts, no ad cookies and no stored link history." },
    ],
    faqs: [
      { q: "Can Yoinkit download Instagram photos?", a: "Not yet. Yoinkit is built for video and audio, and photo-only posts get a clear message instead of a broken file." },
      { q: "How do I download every video in a carousel?", a: "Paste the post link once. Yoinkit lists each video in the carousel with its own download button." },
      { q: "Are old IGTV links supported?", a: "Yes. Links containing /tv/ are treated like regular video posts." },
      { q: "Is there a limit on how many videos I can download?", a: "There's a fair-use rate limit to keep the service fast for everyone, but no daily cap for normal use." },
      { q: "Do you store the videos I download?", a: "No. Videos are processed in your browser and saved straight to your device. They're never stored on our servers." },
    ],
  },
  {
    slug: "tiktok-downloader",
    platform: "tiktok",
    title: "TikTok Downloader Without Watermark — HD MP4 | Yoinkit",
    description:
      "Download TikTok videos without the watermark in HD. Trim, crop or turn a TikTok into a GIF, or save the sound as MP3. Free, no app, no login.",
    keywords: ["tiktok downloader", "tiktok no watermark", "download tiktok video", "tiktok to gif", "tiktok to mp4", "tiktok mp3"],
    h1: "TikTok downloads,",
    highlight: "no watermark",
    subtitle:
      "We skip TikTok's watermarked copy and grab the clean one. Keep the whole video, or trim it to the part you want and save it as MP4, GIF or MP3.",
    placeholder: "https://www.tiktok.com/@user/video/…",
    navLabel: "TikTok",
    steps: [
      "Copy the link. In TikTok, tap Share, then Copy link. Short vm.tiktok.com links work too.",
      "Pick the part. Paste it here and tap Yoink it, then trim, crop or change the speed if you want.",
      "Save the clean video as MP4, a GIF, or just the sound as MP3.",
    ],
    features: [
      { title: "Watermark-free", body: "TikTok's watermarked copy is skipped. You get the clean video in the best quality TikTok serves, up to 1080p." },
      { title: "Clip it first", body: "Trim to the bit that matters, crop it square, slow it down or turn it into a GIF, all before you save." },
      { title: "Sounds as MP3", body: "Save a trending sound straight to MP3 for your own edits." },
      { title: "Short links OK", body: "vm.tiktok.com, vt.tiktok.com and /t/ share links all work." },
    ],
    faqs: [
      { q: "How does Yoinkit remove the TikTok watermark?", a: "It doesn't edit the watermark out. TikTok serves both a watermarked download copy and a clean playback copy, and Yoinkit only offers the clean one." },
      { q: "Can I make a GIF from a TikTok?", a: "Yes. Trim it to 15 seconds or less, then choose GIF under Other formats." },
      { q: "Can I download TikTok photo slideshows?", a: "Not yet. Yoinkit currently supports TikTok videos only." },
      { q: "Do I need the TikTok app?", a: "No. Copy the link from the app or the website and paste it into Yoinkit in any browser." },
      { q: "Can I download private TikToks?", a: "No. Only public videos can be downloaded." },
      { q: "Can I repost downloaded TikToks?", a: "Credit and permission matter. Only repost content when the creator has allowed it." },
    ],
  },
  {
    slug: "facebook-video-downloader",
    platform: "facebook",
    title: "Facebook Video & Reels Downloader — HD MP4 | Yoinkit",
    description:
      "Download public Facebook videos and Reels in HD, or just the part you want. Trim, crop, make a GIF or save the audio as MP3. Free, no login.",
    keywords: ["facebook video downloader", "facebook reels downloader", "download facebook video", "fb video download", "fb.watch downloader"],
    h1: "Save Facebook videos,",
    highlight: "or just the clip you need",
    subtitle: "Reels, Watch videos and page posts. Paste the link, keep the part you want, and save it to your phone in HD.",
    placeholder: "https://www.facebook.com/reel/…",
    navLabel: "Facebook",
    steps: [
      "Copy the link. On the video, tap Share, then Copy link. fb.watch and share links work too.",
      "Pick the part. Paste it here and tap Yoink it, then trim, crop or change the speed if you want.",
      "Save it as MP4, GIF or MP3.",
    ],
    features: [
      { title: "Reels and Watch", body: "Facebook Reels, Watch videos and videos on public pages all work, including fb.watch and share links." },
      { title: "Keep just the clip", body: "Long video, one good moment? Trim to it, crop it, and save only that." },
      { title: "HD when available", body: "We list every resolution Facebook offers, with the best audio included." },
      { title: "No login", body: "We never ask for your Facebook account. Public videos only." },
    ],
    faqs: [
      { q: "Can I save just one part of a long Facebook video?", a: "Yes. Tick Trim, drag the handles to the part you want and download only that, as MP4, GIF or WebM." },
      { q: "Can I download private Facebook videos?", a: "No. Yoinkit only works with videos anyone can watch without logging in, not private profiles or closed groups." },
      { q: "Do Facebook Reels download without a watermark?", a: "Facebook doesn't burn a watermark into Reels files, and Yoinkit doesn't add one." },
      { q: "Why does a video say it needs a login?", a: "Some Facebook videos are only visible to signed-in users or friends. Yoinkit can't fetch those." },
      { q: "Can I save just the audio?", a: "Yes. Choose MP3 or M4A in the Audio tab." },
    ],
  },
  {
    slug: "snapchat-spotlight-downloader",
    platform: "snapchat",
    title: "Snapchat Spotlight Downloader — Save Snaps as MP4 | Yoinkit",
    description:
      "Download public Snapchat Spotlight videos in original quality. Trim, crop or turn a snap into a GIF, then save it as MP4, GIF or MP3. Free, no login.",
    keywords: ["snapchat spotlight downloader", "download snapchat video", "save snapchat spotlight", "snapchat to mp4"],
    h1: "Snapchat Spotlight,",
    highlight: "saved your way",
    subtitle: "Paste a public Spotlight link, keep the part you want, and save it in its original vertical quality.",
    placeholder: "https://www.snapchat.com/spotlight/…",
    navLabel: "Snapchat",
    steps: [
      "Copy the link. Open the Spotlight snap, tap Share, then Copy link.",
      "Pick the part. Paste it here and tap Yoink it, then trim or crop if you want.",
      "Save it as MP4, GIF, or just the sound as MP3.",
    ],
    features: [
      { title: "Without the Snapchat logo", body: "When Snapchat has a clean copy of the video, we save that instead of the one with the logo and username burned in." },
      { title: "Clip it first", body: "Trim to the moment, crop it square or make it a GIF before it reaches your phone." },
      { title: "Sound as MP3", body: "Save the audio from any Spotlight snap." },
      { title: "Anonymous", body: "We never use your Snapchat account, and nobody is notified." },
    ],
    faqs: [
      { q: "Which Snapchat links work?", a: "Public Spotlight links (snapchat.com/spotlight/… or snapchat.com/@user/spotlight/…)." },
      { q: "Can I download private snaps or friends' stories?", a: "No. Private snaps and friends-only stories can't be accessed, and Yoinkit never asks for your login." },
      { q: "Does the creator get notified?", a: "No. Yoinkit fetches public Spotlight videos from our server, not your account." },
      { q: "What quality are Spotlight downloads?", a: "The best quality Snapchat makes available, usually 720p or 1080p vertical." },
      { q: "Can I repost downloaded snaps?", a: "Only with the creator's permission. Download for personal use and credit creators." },
    ],
  },
  {
    slug: "pinterest-video-downloader",
    platform: "pinterest",
    title: "Pinterest Video Downloader — HD MP4 | Yoinkit",
    description:
      "Download Pinterest videos and Idea Pins in HD. Trim, crop or make a GIF from any video pin, then save it as MP4, GIF or MP3. Free and anonymous.",
    keywords: ["pinterest video downloader", "download pinterest video", "pinterest to mp4", "pinterest video to gif", "pin.it downloader"],
    h1: "Pinterest videos,",
    highlight: "saved in HD",
    subtitle: "Pin and pin.it links both work. Keep the whole video, or trim and crop it to just the part you want.",
    placeholder: "https://www.pinterest.com/pin/…",
    navLabel: "Pinterest",
    steps: [
      "Copy the link. Open the pin, tap Share and copy the link. pin.it links are fine.",
      "Pick the part. Paste it here and tap Yoink it, then trim or crop if you want.",
      "Save it as MP4, GIF or MP3.",
    ],
    features: [
      { title: "Highest resolution", body: "We compare every version Pinterest offers and list the best one first." },
      { title: "Idea Pins and short links", body: "Video Idea Pins, regular video pins and pin.it share links all work." },
      { title: "Clip it first", body: "Trim a recipe or tutorial down to the step you need, or turn it into a GIF." },
      { title: "Sound as MP3", body: "Need just the soundtrack? Save it as MP3." },
    ],
    faqs: [
      { q: "Can I download Pinterest images?", a: "Not yet. Yoinkit focuses on video, so image pins aren't supported." },
      { q: "Do pin.it short links work?", a: "Yes. Paste them as they are and Yoinkit finds the full pin." },
      { q: "What quality are Pinterest videos?", a: "Most video pins are available up to 720p or 1080p. Yoinkit always lists the best one first." },
      { q: "Do I need a Pinterest account?", a: "No. Public pins can be downloaded without logging in." },
      { q: "Can I download a whole board?", a: "Not currently. Yoinkit downloads one pin at a time." },
    ],
  },
];

export function getLandingPage(slug: string): LandingPage | undefined {
  return LANDING_PAGES.find((page) => page.slug === slug);
}

export const HOME_FAQS: Faq[] = [
  { q: "Is Yoinkit free?", a: "Yes. Yoinkit is free to use with a fair-use rate limit to keep things fast for everyone." },
  { q: "Can I save just part of a video?", a: "Yes. Tick Trim, drag the handles to the moment you want and download. You can also crop it, change the speed or volume, flip or rotate it before saving. Each edit is optional." },
  { q: "Can I turn a Reel or TikTok into a GIF?", a: "Yes. Trim it to 15 seconds or less, then pick GIF under Other formats. Any crop, speed, flip or rotation you set is applied to the GIF too." },
  { q: "Which sites does Yoinkit support?", a: "Instagram (Reels, Stories, video posts & carousels), TikTok (without watermark), Facebook videos & Reels, Snapchat Spotlight and Pinterest videos." },
  { q: "Does it work on my phone?", a: "Yes, it's built for phones first. Everything runs in your browser on iPhone and Android, with no app to install and no social media login needed. It works on computers too." },
  { q: "What quality will I get?", a: "The highest quality the platform makes available, and you can always pick a smaller file instead." },
  { q: "Do you keep copies of my downloads?", a: "No. Downloads are processed in your browser and saved straight to your device, so they're never stored on our servers. We don't keep a history of links." },
  { q: "Can I download private content?", a: "No. Yoinkit only works with publicly accessible posts. Please respect creators and only download content you have the right to use." },
];
