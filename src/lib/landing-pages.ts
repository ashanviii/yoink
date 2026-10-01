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
  /** H1, with `highlight` rendered in the accent style. */
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
    title: "Instagram Reels Downloader — HD, No Watermark | yoink",
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
      "Paste it into yoink and hit Fetch — we read every quality Instagram has for that reel.",
      "Pick a resolution (or MP3) and the file saves straight to your device.",
    ],
    features: [
      { title: "Original quality", body: "We grab the highest-bitrate stream Instagram serves and merge it with the original audio track." },
      { title: "Audio as MP3", body: "Found a sound you love? Export just the audio as MP3 or lossless-copy M4A." },
      { title: "Works on iPhone & Android", body: "Everything runs in the browser — no app installs, no sketchy extensions." },
      { title: "No account needed", body: "We never ask for your Instagram login. Public reels only, always." },
    ],
    faqs: [
      { q: "Can I download Instagram Reels without logging in?", a: "Yes. yoink only fetches public reels, so you never need to sign in or share your Instagram credentials." },
      { q: "What quality are downloaded reels?", a: "You get the best resolution Instagram stores for that reel — usually 720p or 1080p — with the original audio merged in." },
      { q: "Does the downloaded reel have a watermark?", a: "No. Instagram doesn't burn a watermark into the video file, and yoink doesn't add one either." },
      { q: "Can I download reels from private accounts?", a: "No. Private content stays private — we only support posts anyone can view without logging in." },
      { q: "Where do downloaded reels go on iPhone?", a: "Safari saves them to the Files app (Downloads folder). Open the file and tap Share → Save Video to move it to Photos." },
    ],
  },
  {
    slug: "instagram-story-downloader",
    platform: "instagram",
    title: "Instagram Story Downloader — Save Stories in HD | yoink",
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
      "Paste it into yoink and tap Fetch.",
      "Choose the clip and quality you want, then download.",
    ],
    features: [
      { title: "Stories & Highlights", body: "Supports single story links and saved Highlights reels." },
      { title: "Original resolution", body: "Stories are saved exactly as Instagram stores them — no re-compression." },
      { title: "Multi-clip support", body: "When a link contains several clips, each one gets its own download button." },
      { title: "Respectful by design", body: "Instagram requires a login for many stories. If one isn't publicly accessible, we tell you instead of pretending." },
    ],
    faqs: [
      { q: "Why does yoink say a story needs a login?", a: "Instagram puts most stories behind a login wall. yoink never uses your account, so stories that aren't publicly reachable can't be fetched." },
      { q: "Does the person know I saved their story?", a: "yoink fetches stories from our server, not your account, so your username doesn't appear in their viewer list." },
      { q: "Can I download Instagram Highlights?", a: "Yes — paste a Highlights link (instagram.com/stories/highlights/…) and every public clip shows up." },
      { q: "Are photo stories supported?", a: "yoink currently focuses on video. Photo-only stories aren't supported yet." },
      { q: "Is it okay to repost someone's story?", a: "Only with permission. Downloading for personal viewing is one thing; reposting someone else's content needs their consent." },
    ],
  },
  {
    slug: "instagram-video-downloader",
    platform: "instagram",
    title: "Instagram Video & Post Downloader (Carousels too) | yoink",
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
      "Paste it into yoink — we detect single videos and multi-video carousels.",
      "Download each video in the quality you want.",
    ],
    features: [
      { title: "Carousel aware", body: "Up to 20 videos from a single carousel post, each with its own quality picker." },
      { title: "IGTV & long videos", body: "Older /tv/ links work too, in their best available resolution." },
      { title: "MP4 or MP3", body: "Save the full video or just its audio track." },
      { title: "Zero tracking", body: "No accounts, no cookies for ads, no link history stored." },
    ],
    faqs: [
      { q: "Can yoink download Instagram photos?", a: "Not yet — yoink is built for video and audio. Photo-only posts return a clear message instead of a broken file." },
      { q: "How do I download every video in a carousel?", a: "Paste the post link once; yoink lists each video in the carousel with its own download button." },
      { q: "Are old IGTV links supported?", a: "Yes. Links containing /tv/ are treated like regular video posts." },
      { q: "Is there a limit on how many videos I can download?", a: "There's a fair-use rate limit to keep the service fast for everyone, but no daily cap for normal use." },
      { q: "Do you store the videos I download?", a: "No. Files are prepared temporarily for your download and deleted automatically within minutes." },
    ],
  },
  {
    slug: "youtube-video-downloader",
    platform: "youtube",
    title: "YouTube Video Downloader — 1080p, 4K, MP4 | yoink",
    description:
      "Download YouTube videos in up to 4K as MP4, with audio merged in. Pick your resolution, see the file size, and save. Fast, free, no sign-up.",
    keywords: ["youtube video downloader", "download youtube video", "youtube 4k downloader", "youtube to mp4", "yt downloader"],
    h1: "Download YouTube videos up to",
    highlight: "4K",
    subtitle: "Every resolution YouTube offers — 144p to 2160p — merged with the best audio into a single MP4.",
    placeholder: "https://www.youtube.com/watch?v=…",
    navLabel: "YouTube",
    steps: [
      "Copy the video URL from your browser or the Share button in the YouTube app.",
      "Paste it into yoink and tap Fetch to see every available resolution with file sizes.",
      "Choose a quality — we merge video + audio into one MP4 and hand it over.",
    ],
    features: [
      { title: "Up to 4K / 60fps", body: "High-res streams are merged with the best audio track using ffmpeg — no silent videos." },
      { title: "Real file sizes", body: "See how big each option is before you download, so you don't blow your data plan." },
      { title: "Max compatibility", body: "We prefer H.264 when available so files play everywhere, from iPhones to old laptops." },
      { title: "Shorts supported", body: "Shorts links work too — or use the dedicated Shorts downloader." },
    ],
    faqs: [
      { q: "Can I download YouTube videos in 4K?", a: "Yes, when the uploader published in 4K. yoink lists every resolution YouTube has, including 1440p and 2160p." },
      { q: "Why do high-resolution downloads take a little longer?", a: "YouTube stores 1080p+ video and audio separately. yoink downloads both and merges them into one MP4, which takes a few extra seconds." },
      { q: "Can I download private, members-only or age-restricted videos?", a: "No. yoink only works with videos that are publicly viewable without signing in." },
      { q: "Can I download live streams?", a: "Not while they're live. Once the stream ends and is processed, the replay can be downloaded." },
      { q: "Is downloading YouTube videos legal?", a: "It depends on your country and the content. Download only videos you own, that are licensed for reuse, or where the creator permits it." },
    ],
  },
  {
    slug: "youtube-shorts-downloader",
    platform: "youtube",
    title: "YouTube Shorts Downloader — HD MP4 | yoink",
    description:
      "Download YouTube Shorts in full HD vertical MP4 with sound. Paste the Shorts link and save it in seconds — free, no watermark, no app.",
    keywords: ["youtube shorts downloader", "download youtube shorts", "shorts to mp4", "save youtube shorts"],
    h1: "Grab YouTube Shorts in",
    highlight: "crisp HD",
    subtitle: "Vertical, full-res, with audio. Paste a Shorts link and it's yours in seconds.",
    placeholder: "https://youtube.com/shorts/…",
    navLabel: "YT Shorts",
    steps: [
      "In the YouTube app tap Share → Copy link on the Short.",
      "Paste it into yoink and hit Fetch.",
      "Pick a resolution and save the vertical MP4.",
    ],
    features: [
      { title: "Native vertical", body: "Shorts are saved in their original 9:16 resolution — no letterboxing." },
      { title: "With sound", body: "Audio is merged in automatically. Or export just the audio as MP3." },
      { title: "No watermark", body: "YouTube doesn't watermark Shorts files and neither do we." },
      { title: "Lightning quick", body: "Shorts are tiny, so most are ready in a couple of seconds." },
    ],
    faqs: [
      { q: "How do I copy a YouTube Shorts link?", a: "Tap the Share arrow on the Short and choose Copy link. On desktop, copy the URL from the address bar." },
      { q: "What resolution are Shorts saved in?", a: "Usually 1080×1920 — whatever the creator uploaded, up to the best YouTube serves." },
      { q: "Can I save the music from a Short?", a: "Yes — choose MP3 or M4A to save just the audio track." },
      { q: "Does it work on iPhone?", a: "Yes. Downloads land in the Files app; from there you can save them to Photos." },
      { q: "Do Shorts downloads include a watermark?", a: "No. The file is the original upload without any added branding." },
    ],
  },
  {
    slug: "youtube-to-mp3",
    platform: "youtube",
    title: "YouTube to MP3 Converter — High Quality Audio | yoink",
    description:
      "Convert YouTube videos to MP3 or M4A in the best available audio quality. Paste a link, pick a format, download. Fast, free, no sign-up.",
    keywords: ["youtube to mp3", "youtube mp3 converter", "youtube to m4a", "yt to mp3", "youtube audio downloader"],
    h1: "YouTube to MP3,",
    highlight: "no fuss",
    subtitle: "Converts from YouTube's highest-quality audio stream. Want zero re-encoding? Grab the M4A.",
    placeholder: "https://www.youtube.com/watch?v=…",
    navLabel: "YouTube → MP3",
    steps: [
      "Copy the YouTube video link.",
      "Paste it into yoink and tap Fetch.",
      "Choose MP3 (universal) or M4A (original, no re-encode) and download.",
    ],
    features: [
      { title: "Best-source audio", body: "We convert from the highest-bitrate audio YouTube provides, at the top MP3 VBR setting." },
      { title: "Lossless-copy M4A", body: "M4A saves YouTube's AAC audio exactly as-is — no quality loss from re-encoding." },
      { title: "Tagged files", body: "Title and artist metadata are embedded so your music app shows the right info." },
      { title: "Long videos OK", body: "Podcasts, mixes and lectures up to several hours are supported." },
    ],
    faqs: [
      { q: "What bitrate are the MP3s?", a: "yoink uses LAME's highest VBR setting (V0, ~245 kbps average), converted from YouTube's best audio stream." },
      { q: "MP3 or M4A — which should I pick?", a: "M4A is YouTube's original audio with no re-encoding, so it's the best quality. MP3 is the most compatible with older devices and car stereos." },
      { q: "Is there a length limit?", a: "Videos up to 3 hours are supported by default." },
      { q: "Can I convert a whole playlist?", a: "Not currently. yoink works one video at a time to stay fast and fair for everyone." },
      { q: "Is converting YouTube to MP3 legal?", a: "Only convert content you have the right to — your own uploads, Creative Commons, or with the creator's permission." },
    ],
  },
  {
    slug: "tiktok-downloader",
    platform: "tiktok",
    title: "TikTok Downloader Without Watermark — HD MP4 | yoink",
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
      "Paste it into yoink and hit Fetch.",
      "Download the clean HD MP4, or just the sound as MP3.",
    ],
    features: [
      { title: "Watermark-free", body: "TikTok's watermarked download rendition is filtered out — you only see clean streams." },
      { title: "HD when available", body: "We list every resolution TikTok serves, up to 1080p." },
      { title: "Sounds as MP3", body: "Save trending audio straight to MP3 for edits and remixes." },
      { title: "Short links OK", body: "vm.tiktok.com, vt.tiktok.com and /t/ share links are all resolved automatically." },
    ],
    faqs: [
      { q: "How does yoink remove the TikTok watermark?", a: "It doesn't edit the video. TikTok serves both a watermarked download copy and a clean playback stream — yoink only offers the clean one." },
      { q: "Can I download TikTok photo slideshows?", a: "Not yet. yoink currently supports TikTok videos only." },
      { q: "Do I need the TikTok app?", a: "No. Copy the link from the app or the website and paste it into yoink in any browser." },
      { q: "Can I download private TikToks?", a: "No — only public videos can be downloaded." },
      { q: "Can I repost downloaded TikToks?", a: "Credit and permission matter. Only repost content when the creator has allowed it." },
    ],
  },
  {
    slug: "pinterest-video-downloader",
    platform: "pinterest",
    title: "Pinterest Video Downloader — HD MP4 | yoink",
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
      "Paste it into yoink and tap Fetch.",
      "Pick a resolution and download the MP4.",
    ],
    features: [
      { title: "Highest resolution", body: "We compare every stream Pinterest offers and surface the best one first." },
      { title: "Idea Pins", body: "Video Idea Pins and regular video pins are both supported." },
      { title: "Short links", body: "pin.it share links are resolved for you automatically." },
      { title: "Audio extraction", body: "Need just the soundtrack? Export it as MP3." },
    ],
    faqs: [
      { q: "Can I download Pinterest images?", a: "yoink focuses on video. Image pins aren't supported yet." },
      { q: "Do pin.it short links work?", a: "Yes — paste them as-is and yoink resolves them to the full pin." },
      { q: "What quality are Pinterest videos?", a: "Most video pins are available up to 720p or 1080p. yoink always lists the best one first." },
      { q: "Do I need a Pinterest account?", a: "No. Public pins can be downloaded without logging in." },
      { q: "Can I download a whole board?", a: "Not currently — yoink downloads one pin at a time." },
    ],
  },
];

export function getLandingPage(slug: string): LandingPage | undefined {
  return LANDING_PAGES.find((page) => page.slug === slug);
}

export const HOME_FAQS: Faq[] = [
  { q: "Is yoink free?", a: "Yes. yoink is free to use with a fair-use rate limit to keep things fast for everyone." },
  { q: "Which sites does yoink support?", a: "Instagram (Reels, Stories, video posts & carousels), YouTube (videos, Shorts, MP3), TikTok (without watermark) and Pinterest videos." },
  { q: "Do I need to install an app or sign in?", a: "No. yoink runs in your browser on any phone, tablet or computer, and never asks for your social media logins." },
  { q: "What quality will I get?", a: "The highest quality the platform makes available — up to 4K on YouTube — and you can always pick a smaller file instead." },
  { q: "Do you keep copies of my downloads?", a: "No. Files are prepared temporarily for your download and automatically deleted within minutes. We don't keep a history of links." },
  { q: "Can I download private content?", a: "No. yoink only works with publicly accessible posts. Please respect creators and only download content you have the right to use." },
];
