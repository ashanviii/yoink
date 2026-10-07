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
    title: "Instagram Reels Downloader — HD, No Watermark | Yoinkit",
    description:
      "Download Instagram Reels in full HD with original audio. Paste the reel link, pick MP4 or MP3, and save it to your phone or PC. Free, no login, no app.",
    keywords: ["instagram reels downloader", "download instagram reels", "reels to mp4", "reels mp3", "save instagram reel"],
    h1: "Download Instagram Reels in",
    highlight: "full HD",
    subtitle: "Paste a reel link and save the original-quality MP4 — or rip just the audio as MP3. No login, no app, no watermark.",
    placeholder: "https://www.instagram.com/reel/…",
    navLabel: "IG Reels",
    steps: [
      "Open the reel in Instagram, tap ••• or the share arrow, then “Copy link”.",
      "Paste it into Yoinkit and hit Fetch — we read every quality Instagram has for that reel.",
      "Pick a resolution (or MP3) and the file saves straight to your device.",
    ],
    features: [
      { title: "Original quality", body: "We grab the highest-bitrate stream Instagram serves and merge it with the original audio track." },
      { title: "Audio as MP3", body: "Found a sound you love? Export just the audio as MP3 or lossless-copy M4A." },
      { title: "Works on iPhone & Android", body: "Everything runs in the browser — no app installs, no sketchy extensions." },
      { title: "No account needed", body: "We never ask for your Instagram login. Public reels only, always." },
    ],
    faqs: [
      { q: "Can I download Instagram Reels without logging in?", a: "Yes. Yoinkit only fetches public reels, so you never need to sign in or share your Instagram credentials." },
      { q: "What quality are downloaded reels?", a: "You get the best resolution Instagram stores for that reel — usually 720p or 1080p — with the original audio merged in." },
      { q: "Does the downloaded reel have a watermark?", a: "No. Instagram doesn't burn a watermark into the video file, and Yoinkit doesn't add one either." },
      { q: "Can I download reels from private accounts?", a: "No. Private content stays private — we only support posts anyone can view without logging in." },
      { q: "Where do downloaded reels go on iPhone?", a: "Safari saves them to the Files app (Downloads folder). Open the file and tap Share → Save Video to move it to Photos." },
    ],
  },
  {
    slug: "instagram-story-downloader",
    platform: "instagram",
    title: "Instagram Story Downloader — Save Stories in HD | Yoinkit",
    description:
      "Save public Instagram Stories and Highlights as MP4 in their original quality. Paste the story link, choose a format, download. Free and anonymous.",
    keywords: ["instagram story downloader", "download instagram stories", "instagram highlights downloader", "story saver"],
    h1: "Save Instagram Stories",
    highlight: "before they vanish",
    subtitle: "Paste a story or highlight link to save it in its original quality. Works with public stories only.",
    placeholder: "https://www.instagram.com/stories/username/…",
    navLabel: "IG Stories",
    steps: [
      "Open the story, tap the ••• menu and choose “Copy link” (or copy the profile’s story URL).",
      "Paste it into Yoinkit and tap Fetch.",
      "Choose the clip and quality you want, then download.",
    ],
    features: [
      { title: "Stories & Highlights", body: "Supports single story links and saved Highlights reels." },
      { title: "Original resolution", body: "Stories are saved exactly as Instagram stores them — no re-compression." },
      { title: "Multi-clip support", body: "When a link contains several clips, each one gets its own download button." },
      { title: "Respectful by design", body: "Instagram requires a login for many stories. If one isn't publicly accessible, we tell you instead of pretending." },
    ],
    faqs: [
      { q: "Why does Yoinkit say a story needs a login?", a: "Instagram puts most stories behind a login wall. Yoinkit never uses your account, so stories that aren't publicly reachable can't be fetched." },
      { q: "Does the person know I saved their story?", a: "Yoinkit fetches stories from our server, not your account, so your username doesn't appear in their viewer list." },
      { q: "Can I download Instagram Highlights?", a: "Yes — paste a Highlights link (instagram.com/stories/highlights/…) and every public clip shows up." },
      { q: "Are photo stories supported?", a: "Yoinkit currently focuses on video. Photo-only stories aren't supported yet." },
      { q: "Is it okay to repost someone's story?", a: "Only with permission. Downloading for personal viewing is one thing; reposting someone else's content needs their consent." },
    ],
  },
  {
    slug: "instagram-video-downloader",
    platform: "instagram",
    title: "Instagram Video & Post Downloader (Carousels too) | Yoinkit",
    description:
      "Download videos from Instagram posts and carousels in HD. Paste any public post link and save each video as MP4 or MP3 — no login required.",
    keywords: ["instagram video downloader", "instagram post downloader", "instagram carousel downloader", "ig video download"],
    h1: "Download Instagram",
    highlight: "posts & carousels",
    subtitle: "Paste any public post link. Carousels with multiple videos? Each one gets its own download.",
    placeholder: "https://www.instagram.com/p/…",
    navLabel: "IG Posts",
    steps: [
      "Copy the post link from the ••• menu or the share sheet.",
      "Paste it into Yoinkit — we detect single videos and multi-video carousels.",
      "Download each video in the quality you want.",
    ],
    features: [
      { title: "Carousel aware", body: "Up to 20 videos from a single carousel post, each with its own quality picker." },
      { title: "IGTV & long videos", body: "Older /tv/ links work too, in their best available resolution." },
      { title: "MP4 or MP3", body: "Save the full video or just its audio track." },
      { title: "Zero tracking", body: "No accounts, no cookies for ads, no link history stored." },
    ],
    faqs: [
      { q: "Can Yoinkit download Instagram photos?", a: "Not yet — Yoinkit is built for video and audio. Photo-only posts return a clear message instead of a broken file." },
      { q: "How do I download every video in a carousel?", a: "Paste the post link once; Yoinkit lists each video in the carousel with its own download button." },
      { q: "Are old IGTV links supported?", a: "Yes. Links containing /tv/ are treated like regular video posts." },
      { q: "Is there a limit on how many videos I can download?", a: "There's a fair-use rate limit to keep the service fast for everyone, but no daily cap for normal use." },
      { q: "Do you store the videos I download?", a: "No. Videos are processed right in your browser and saved straight to your device — they're never stored on our servers." },
    ],
  },
  {
    slug: "tiktok-downloader",
    platform: "tiktok",
    title: "TikTok Downloader Without Watermark — HD MP4 | Yoinkit",
    description:
      "Download TikTok videos without the watermark in HD. Paste the TikTok link and save a clean MP4 or the sound as MP3. Free, no app, no login.",
    keywords: ["tiktok downloader", "tiktok no watermark", "download tiktok video", "tiktok to mp4", "tiktok mp3", "save tiktok"],
    h1: "TikTok downloads,",
    highlight: "no watermark",
    subtitle: "We skip TikTok's watermarked copy and grab the clean original stream. HD MP4 or the sound as MP3.",
    placeholder: "https://www.tiktok.com/@user/video/…",
    navLabel: "TikTok",
    steps: [
      "In TikTok tap Share → Copy link (short vm.tiktok.com links work too).",
      "Paste it into Yoinkit and hit Fetch.",
      "Download the clean HD MP4, or just the sound as MP3.",
    ],
    features: [
      { title: "Watermark-free", body: "TikTok's watermarked download rendition is filtered out — you only see clean streams." },
      { title: "HD when available", body: "We list every resolution TikTok serves, up to 1080p." },
      { title: "Sounds as MP3", body: "Save trending audio straight to MP3 for edits and remixes." },
      { title: "Short links OK", body: "vm.tiktok.com, vt.tiktok.com and /t/ share links are all resolved automatically." },
    ],
    faqs: [
      { q: "How does Yoinkit remove the TikTok watermark?", a: "It doesn't edit the video. TikTok serves both a watermarked download copy and a clean playback stream — Yoinkit only offers the clean one." },
      { q: "Can I download TikTok photo slideshows?", a: "Not yet. Yoinkit currently supports TikTok videos only." },
      { q: "Do I need the TikTok app?", a: "No. Copy the link from the app or the website and paste it into Yoinkit in any browser." },
      { q: "Can I download private TikToks?", a: "No — only public videos can be downloaded." },
      { q: "Can I repost downloaded TikToks?", a: "Credit and permission matter. Only repost content when the creator has allowed it." },
    ],
  },
  {
    slug: "facebook-video-downloader",
    platform: "facebook",
    title: "Facebook Video & Reels Downloader — HD MP4 | Yoinkit",
    description:
      "Download public Facebook videos and Reels in HD MP4, or save the audio as MP3. Paste the link, pick a quality, download. Free, no login.",
    keywords: ["facebook video downloader", "facebook reels downloader", "download facebook video", "fb video download", "fb.watch downloader"],
    h1: "Save Facebook videos",
    highlight: "in HD",
    subtitle: "Reels, Watch videos and page posts — paste the link and grab the best quality Facebook serves.",
    placeholder: "https://www.facebook.com/reel/…",
    navLabel: "Facebook",
    steps: [
      "On the video, tap Share → Copy link (fb.watch and share links work too).",
      "Paste it into Yoinkit and hit Fetch.",
      "Pick HD or SD — or just the audio as MP3 — and download.",
    ],
    features: [
      { title: "Reels & Watch", body: "Facebook Reels, Watch videos and videos on public pages are all supported." },
      { title: "HD when available", body: "We list every resolution Facebook offers and merge the best audio in." },
      { title: "Share links OK", body: "fb.watch and facebook.com/share links are followed to the original video." },
      { title: "No login", body: "We never ask for your Facebook account. Public videos only." },
    ],
    faqs: [
      { q: "Can I download private Facebook videos?", a: "No. Yoinkit only works with videos anyone can watch without logging in — not private profiles or closed groups." },
      { q: "Do Facebook Reels download without a watermark?", a: "Facebook doesn't burn a watermark into Reels files, and Yoinkit doesn't add one." },
      { q: "Why does a video say it needs a login?", a: "Some Facebook videos are only visible to signed-in users or friends. Yoinkit can't fetch those." },
      { q: "Do fb.watch links work?", a: "Yes — paste them as-is and Yoinkit follows them to the full video." },
      { q: "Can I save just the audio?", a: "Yes, choose MP3 or M4A in the Audio tab." },
    ],
  },
  {
    slug: "snapchat-spotlight-downloader",
    platform: "snapchat",
    title: "Snapchat Spotlight Downloader — Save Snaps as MP4 | Yoinkit",
    description:
      "Download public Snapchat Spotlight videos as MP4 in their original quality. Paste the Spotlight link and save it — free, no app, no login.",
    keywords: ["snapchat spotlight downloader", "download snapchat video", "save snapchat spotlight", "snapchat to mp4"],
    h1: "Snapchat Spotlight,",
    highlight: "saved",
    subtitle: "Paste a public Spotlight link and keep the video in its original vertical quality.",
    placeholder: "https://www.snapchat.com/spotlight/…",
    navLabel: "Snapchat",
    steps: [
      "Open the Spotlight snap, tap Share → Copy link.",
      "Paste it into Yoinkit and tap Fetch.",
      "Download the MP4, or just the sound as MP3.",
    ],
    features: [
      { title: "Original quality", body: "Spotlight videos are saved exactly as Snapchat serves them." },
      { title: "Vertical & ready", body: "Native 9:16 video that plays anywhere — no app needed." },
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
      "Download Pinterest videos and Idea Pins in HD MP4. Paste a pin or pin.it link and save the video in its best quality. Free and anonymous.",
    keywords: ["pinterest video downloader", "download pinterest video", "pinterest to mp4", "pin.it downloader", "idea pin downloader"],
    h1: "Pinterest videos,",
    highlight: "saved in HD",
    subtitle: "Pin links and pin.it short links both work. We pick the highest-resolution stream Pinterest has.",
    placeholder: "https://www.pinterest.com/pin/…",
    navLabel: "Pinterest",
    steps: [
      "Open the pin, tap Share and copy the link (pin.it links are fine).",
      "Paste it into Yoinkit and tap Fetch.",
      "Pick a resolution and download the MP4.",
    ],
    features: [
      { title: "Highest resolution", body: "We compare every stream Pinterest offers and surface the best one first." },
      { title: "Idea Pins", body: "Video Idea Pins and regular video pins are both supported." },
      { title: "Short links", body: "pin.it share links are resolved for you automatically." },
      { title: "Audio extraction", body: "Need just the soundtrack? Export it as MP3." },
    ],
    faqs: [
      { q: "Can I download Pinterest images?", a: "Yoinkit focuses on video. Image pins aren't supported yet." },
      { q: "Do pin.it short links work?", a: "Yes — paste them as-is and Yoinkit resolves them to the full pin." },
      { q: "What quality are Pinterest videos?", a: "Most video pins are available up to 720p or 1080p. Yoinkit always lists the best one first." },
      { q: "Do I need a Pinterest account?", a: "No. Public pins can be downloaded without logging in." },
      { q: "Can I download a whole board?", a: "Not currently — Yoinkit downloads one pin at a time." },
    ],
  },
];

export function getLandingPage(slug: string): LandingPage | undefined {
  return LANDING_PAGES.find((page) => page.slug === slug);
}

export const HOME_FAQS: Faq[] = [
  { q: "Is Yoinkit free?", a: "Yes. Yoinkit is free to use with a fair-use rate limit to keep things fast for everyone." },
  { q: "Which sites does Yoinkit support?", a: "Instagram (Reels, Stories, video posts & carousels), TikTok (without watermark), Facebook videos & Reels, Snapchat Spotlight and Pinterest videos." },
  { q: "Do I need to install an app or sign in?", a: "No. Yoinkit runs in your browser on any phone, tablet or computer, and never asks for your social media logins." },
  { q: "What quality will I get?", a: "The highest quality the platform makes available, and you can always pick a smaller file instead." },
  { q: "Do you keep copies of my downloads?", a: "No. Downloads are processed in your browser and saved straight to your device, so they're never stored on our servers. We don't keep a history of links." },
  { q: "Can I download private content?", a: "No. Yoinkit only works with publicly accessible posts. Please respect creators and only download content you have the right to use." },
];
