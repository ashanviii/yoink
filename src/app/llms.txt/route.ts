import { LANDING_PAGES } from "@/lib/landing-pages";
import { absoluteUrl, site } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  const pages = LANDING_PAGES.map((p) => `- [${p.title.split(" | ")[0]}](${absoluteUrl(`/${p.slug}`)}): ${p.description}`);
  const body = `# ${site.name}

> ${site.description}

${site.name} is a free, mobile-first video downloader and editor that runs in the browser. Users paste a public link from Instagram, TikTok, Facebook, Snapchat or Pinterest, optionally trim, crop, change the speed or volume, flip or rotate it, and save the result as MP4, GIF or WebM, the audio as MP3, or single frames as JPG or PNG, all in one flow. No account, app install or login is required, and only publicly accessible content is supported. Editing happens in the user's browser and files are not stored on the server.

## Downloaders

- [Home — all platforms](${absoluteUrl("/")}): Overview of every supported platform and what is and isn't supported.
${pages.join("\n")}
- [How to download and trim videos from Instagram, TikTok, Facebook, Snapchat & Pinterest](${absoluteUrl("/download-videos-from-social-media")}): Guide to what works on each platform, saving just the part you want (trim, crop, GIF), choosing a safe downloader, and step-by-step instructions.

## Policies

- [Terms of use](${absoluteUrl("/terms")})
- [Privacy policy](${absoluteUrl("/privacy")})
- [Copyright & DMCA](${absoluteUrl("/copyright")})
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
