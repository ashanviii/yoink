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
- **Load protection**: global caps on concurrent fetches (`YOINK_MAX_CONCURRENT_RESOLVES`) and downloads (`YOINK_MAX_CONCURRENT_JOBS`), each with a bounded queue. Overflow gets a fast `503 BUSY` with `Retry-After` instead of spawning unbounded yt-dlp processes. Identical links share one in-flight extraction plus a 5-minute cache, so a viral link costs one yt-dlp run.
- **Rate limiting**: per-client-IP token buckets (resolve 20/min, jobs 10/min, thumbnails 120/min), max 2 active jobs per client. Set `YOINK_CLIENT_IP_HEADER` or `YOINK_TRUSTED_PROXY_HOPS` for your proxy (see below). Otherwise clients can spoof their IP.
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

- `npm test`: unit tests (URL validation, concurrency limiter)
- `npm run typecheck` / `npm run lint`
- `npm run build && npm start`: production build

Keep yt-dlp up to date (`pip install -U yt-dlp`). Platforms change their sites often and yt-dlp ships fixes quickly.

## Deployment

yoink needs a long-running Node server with yt-dlp, ffmpeg and local disk. Serverless platforms (e.g. Vercel functions) won't work. Use the included `Dockerfile`:

```bash
docker build -t yoink .
docker run -p 3000:3000 -e YOINK_SECRET="$(openssl rand -base64 48)" \
  -e NEXT_PUBLIC_SITE_URL=https://your.domain -e YOINK_CLIENT_IP_HEADER=cf-connecting-ip yoink
```

**Client IP**: per-IP limits only work if the server knows the real client IP. Behind Cloudflare, set `YOINK_CLIENT_IP_HEADER=cf-connecting-ip`. Behind a single nginx/Caddy/platform load balancer that appends to `X-Forwarded-For`, set `YOINK_TRUSTED_PROXY_HOPS=1`. Don't expose the Node server directly.

**Sizing**: each fetch is a short-lived yt-dlp process (~50–100 MB RAM, a few seconds). Each download adds ffmpeg (CPU) and passes the file through the server twice (bandwidth). A starting point for a 4 vCPU / 8 GB box is `YOINK_MAX_CONCURRENT_RESOLVES=10` and `YOINK_MAX_CONCURRENT_JOBS=6`. Measure with the load test and adjust.

`NEXT_PUBLIC_*` variables are inlined at build time, so pass them as build args or set them in the build environment as well.

Job state, rate limits and the resolve cache are kept **in process memory**, so run a single instance (scale vertically with `YOINK_MAX_CONCURRENT_JOBS`). To scale horizontally, move `rate-limit.ts` and `jobs.ts` state to Redis and use shared storage for the temp files.

See `.env.example` for all configuration options.

## Load testing

`scripts/load-test.mjs` simulates users doing paste → fetch (and optionally → download) against any deployment and prints latency percentiles, error breakdowns and live server queue depth from `/api/health`.

```bash
npm run loadtest -- --base http://localhost:3000 --users 50 --duration 60
npm run loadtest -- --base https://staging.your.domain --users 20 --mode full --pick smallest
```

- Every fetch hits the real platforms. Keep runs modest, because hammering YouTube/Instagram from one IP can get that IP blocked by them.
- By default each virtual user sends its own `X-Forwarded-For` IP. If the target uses `YOINK_CLIENT_IP_HEADER`, pass the same header with `--ip-header`.
- Run the server with `YOINK_RESOLVE_CACHE_TTL_MS=0` to measure uncached extraction (worst case). With the cache on, repeated links are near-instant.
- The `rss` figure is the Node process only. yt-dlp/ffmpeg child processes use additional memory.

Reference results on a laptop (8 cores, home connection):

| Scenario | Result |
| --- | --- |
| 20 users, distinct links, cache off | 100% ok, ~2.2 extractions/s, p50 4.7s / p99 10.2s, never more than 6 yt-dlp processes |
| 30 users vs. caps of 2 running + 5 queued | 67% ok, rest got a clean `503 BUSY` with no runaway processes |
| 150 users, one viral link, cache on | 2,113 requests in 21s, 100% ok, p50 15ms, one yt-dlp run total |

## Known limitations

- **Instagram Stories**: Instagram requires a login for most stories. Without `YTDLP_COOKIES_FILE` these return a clear "login required" error. Supplying an account's cookies may breach Instagram's terms, so that decision is left to the operator.
- **Photo posts** (Instagram images, TikTok slideshows, image pins) aren't supported. yoink is video/audio focused.
- **Regional blocks**: if a platform is blocked where the server runs (e.g. TikTok in India), set `YTDLP_PROXY`.
