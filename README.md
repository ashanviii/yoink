# yoink

A mobile-first media downloader for **Instagram** (Reels, Stories, video posts and carousels), **YouTube** (videos up to 4K, Shorts, MP3/M4A), **TikTok** (without watermark) and **Pinterest** videos.

Flow: paste link → fetch → pick quality/format → download.

## Stack

- **Next.js 16** (App Router), React 19, TypeScript, Tailwind CSS v4
- **yt-dlp** for extraction, **ffmpeg** for merging high-res streams and audio conversion
- Zod for input validation, Vitest for tests

## How it works

```
Browser ──POST /api/resolve {url}──▶ validate + canonicalise URL (src/lib/url.ts)
                                     yt-dlp --dump-single-json
                                     ◀── items + quality options, each with an HMAC-signed token
        ──POST /api/jobs {token}───▶ verify token → queue job (concurrency-capped)
        ──GET  /api/jobs/:id───────▶ poll progress (downloading → processing → ready)
        ──GET  /api/jobs/:id/file──▶ stream the finished file (deleted after YOINK_FILE_TTL_MS)
```

- **Signed tokens**: the client can only download options the server offered. It can't send arbitrary URLs or yt-dlp format expressions.
- **Strict URL allowlist**: only known hostnames and path shapes for each platform are accepted, and URLs are rebuilt in canonical form before reaching yt-dlp. yt-dlp runs via `spawn` with an argument array (no shell), and the URL is always passed after `--`.
- **No watermarks**: TikTok's watermarked "download" rendition is filtered out, so only clean playback streams are offered.
- **Rate limiting**: token buckets per client IP (resolve 20/min, jobs 10/min, thumbnails 120/min), max 2 active jobs per client, plus a global concurrency cap and queue limit.
- **Thumbnail proxy**: Instagram/TikTok CDNs block hotlinking, so `/api/thumb` proxies images from an allowlist of CDN domains only. HTTPS only, redirects refused, image types only, 5 MB cap.
- **Security headers**: CSP, `frame-ancestors 'none'`, nosniff, HSTS (prod), plus same-origin checks on POST APIs.
- **Respectful by design**: public content only. Private/login-walled/DRM/live content returns a clear error and is never faked. There are Terms, Privacy and Copyright/DMCA pages.

## SEO

- Platform landing pages (`src/lib/landing-pages.ts`), each with a unique title, description, H1, how-to steps, features and FAQ
- JSON-LD: `WebSite`, `WebApplication`, `HowTo`, `FAQPage`, `BreadcrumbList`
- `sitemap.xml`, `robots.txt`, canonical URLs, Open Graph/Twitter cards with a generated OG image, web manifest
- Statically prerendered pages. The only client JS is the downloader widget and the theme toggle.

To add a landing page, append an entry to `LANDING_PAGES`. The route, sitemap entry and structured data are generated from it.

## Local development

Requirements: Node 20+ and Python 3.10+.

```bash
python -m pip install -U "yt-dlp[default,curl-cffi]"
npm install
cp .env.example .env.local   # optional in dev
npm run dev
```

- `npm test`: unit tests (URL validation)
- `npm run typecheck` / `npm run lint`
- `npm run build && npm start`: production build

Keep yt-dlp up to date (`pip install -U yt-dlp`). Platforms change their sites often and yt-dlp ships fixes quickly.

## Deployment

yoink needs a long-running Node server with yt-dlp, ffmpeg and local disk. Serverless platforms (e.g. Vercel functions) won't work. Use the included `Dockerfile`:

```bash
docker build -t yoink .
docker run -p 3000:3000 -e YOINK_SECRET="$(openssl rand -base64 48)" \
  -e NEXT_PUBLIC_SITE_URL=https://your.domain -e YOINK_TRUST_PROXY=true yoink
```

`NEXT_PUBLIC_*` variables are inlined at build time, so pass them as build args or set them in the build environment as well.

Job state, rate limits and the resolve cache are kept **in process memory**, so run a single instance (scale vertically with `YOINK_MAX_CONCURRENT_JOBS`). To scale horizontally, move `rate-limit.ts` and `jobs.ts` state to Redis and use shared storage for the temp files.

See `.env.example` for all configuration options.

## Known limitations

- **Instagram Stories**: Instagram requires a login for most stories. Without `YTDLP_COOKIES_FILE` these return a clear "login required" error. Supplying an account's cookies may breach Instagram's terms, so that decision is left to the operator.
- **Photo posts** (Instagram images, TikTok slideshows, image pins) aren't supported. yoink is video/audio focused.
- **Regional blocks**: if a platform is blocked where the server runs (e.g. TikTok in India), set `YTDLP_PROXY`.
