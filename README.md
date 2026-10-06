# yoink

A fast, secure media downloader for **Instagram** (Reels, Stories, video posts, carousels), **TikTok** (no watermark), **Facebook** (videos, Reels), **Snapchat** (Spotlight) and **Pinterest** videos.

**Flow:** Paste URL → fetch → optionally trim (filmstrip editor) → pick quality/format → download. Or switch to **Frames** to save stills.

---

## 🎯 Features

- **Multi-platform:** Instagram, TikTok (watermark-free), Facebook, Snapchat Spotlight, Pinterest
- **Trim before download:** drag handles on a filmstrip of the video; only the kept range is re-encoded (frame-accurate)
- **Extract frames:** scrub to any moment and save that exact frame as JPG/PNG at the best available quality, or grab a set (one every 0.5–60s, up to 120 frames) as a ZIP. The source video stays in the tab's memory briefly, so repeat grabs skip the download
- **Processed in the browser:** downloading, merging, trimming, MP3 conversion and frame extraction run client-side with ffmpeg.wasm; the server only resolves links
- **Mobile-first UI:** Works great on phones; desktop too
- **Security hardened:** Strict URL validation, encrypted media tokens, rate limiting per IP, no watermarks
- **Load protected:** Concurrent request caps + smart queuing prevent resource exhaustion
- **SEO optimized:** Platform landing pages, structured data, Open Graph cards
- **Self-hosted:** Full control; public content only (private/login-walled content is refused)
- **Easily deployable:** Docker Compose + automatic HTTPS (Caddy)

---

## 🚀 Quick Start

### Local Development (5 minutes)

**Requirements:** Node 20+, Python 3.10+

```bash
# Install dependencies
npm install

# Install yt-dlp
python -m pip install -U "yt-dlp[default,curl-cffi]"

# Copy example env (optional in dev)
cp .env.example .env.local

# Start dev server at http://localhost:3000
npm run dev
```

**Commands:**
- `npm test` — Run unit tests (URL validation, concurrency limiter)
- `npm run typecheck` — Type check
- `npm run lint` — Lint
- `npm run build && npm start` — Production build and run

---

## 📦 Deployment

### Option 1: Docker Compose (Recommended for production)

Deploys yoink + Caddy (automatic HTTPS) with one command.

**Prerequisites:**
- Docker + Docker Compose installed
- A domain (or DuckDNS subdomain)
- `.env` file configured

**Setup:**

```bash
cp .env.example .env
# Edit .env with your domain and configuration
nano .env

# Start the services
docker compose up -d --build
```

Check status:
```bash
docker compose ps
docker compose logs -f yoink  # Watch yoink startup
```

Visit `https://YOUR_DOMAIN` 🎉

The container updates yt-dlp on every start. For a full first-time walkthrough (server, firewall, domain), see [DEPLOY.md](DEPLOY.md).

### Option 2: Docker (standalone)

Run just the yoink container without Caddy:

```bash
docker build -t yoink .

docker run -p 3000:3000 \
  -e YOINK_SECRET="$(openssl rand -base64 48)" \
  -e NEXT_PUBLIC_SITE_URL=https://your.domain \
  -e YOINK_CLIENT_IP_HEADER=cf-connecting-ip \
  yoink
```

You'll need to:
- Set up reverse proxy (nginx, Caddy) in front for HTTPS
- Handle rate limiting correctly with `YOINK_CLIENT_IP_HEADER` or `YOINK_TRUSTED_PROXY_HOPS`

### Option 3: Manual/VPS

Requires **Node 20+** (distro `nodejs` packages are often older — use NodeSource or nvm) and Python 3.10+. No ffmpeg: media is processed in the browser.

```bash
# System dependencies
sudo apt-get install -y python3 python3-venv

# yt-dlp in a virtualenv
python3 -m venv ~/yt-dlp-env
~/yt-dlp-env/bin/pip install -U "yt-dlp[default,curl-cffi]"

# Clone, configure, build
git clone https://github.com/ashanviii/yoink.git
cd yoink
npm ci
cp .env.example .env
nano .env   # set YOINK_SECRET, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_CONTACT_EMAIL,
            # YTDLP_PATH=$HOME/yt-dlp-env/bin/yt-dlp, YOINK_TRUSTED_PROXY_HOPS=1
npm run build

# Run (keep it alive with systemd or PM2)
npm start
```

Then put a reverse proxy (nginx/Caddy) in front for HTTPS. Don't expose port 3000 directly.

> `NEXT_PUBLIC_*` variables are inlined at **build time** — after changing them, rebuild.

---

## ⚙️ Configuration

### Essential Variables

Create `.env` file (see `.env.example` for full list):

```env
# REQUIRED for production
DOMAIN=yoink.example.com                           # Used by Caddy for HTTPS
YOINK_SECRET=<generate with: openssl rand -base64 48>
NEXT_PUBLIC_SITE_URL=https://yoink.example.com    # Public URL
NEXT_PUBLIC_CONTACT_EMAIL=legal@yoink.example.com # For privacy page

# Recommended: Tune these based on server resources
YOINK_MAX_CONCURRENT_RESOLVES=6   # Parallel fetch operations
```

### Client IP Detection (Important!)

For per-IP rate limiting to work, the server must know real client IPs:

```env
# Use ONE of these (depending on your setup):

# Cloudflare
YOINK_CLIENT_IP_HEADER=cf-connecting-ip

# Behind a single proxy (nginx, Caddy, Fly.io, etc.)
YOINK_TRUSTED_PROXY_HOPS=1

# Without either, clients can spoof IPs and dodge per-IP limits
```

Docker Compose already sets this correctly: `YOINK_TRUSTED_PROXY_HOPS=1` (Caddy is the proxy).

### Advanced Options

See `.env.example` for:
- File size/duration limits
- Concurrent operation caps and queue sizes
- Cache TTL (for viral links)
- Timeout values
- Proxy settings (for geo-blocked platforms)
- Cookie files (for Instagram Stories that require login)

---

## 🏗️ Architecture

```
URL → server extracts media → browser receives media → browser processes (ffmpeg.wasm) → user saves

Browser ──POST /api/resolve {url}──▶ Validate + canonicalize URL, extract with yt-dlp
                                      Return quality options: per stream a direct CDN URL
                                      (when browsers may read it) + an encrypted proxy URL

        ──GET  <platform CDN>───────▶ Media straight from the CDN when CORS allows (Instagram/Facebook)
        ──GET  /api/media?t=…───────▶ Otherwise a pass-through stream (Range + HLS), nothing stored

        ffmpeg.wasm in the tab ─────▶ merge video+audio, remux HLS, trim, MP3/M4A, frames + ZIP
```

The server never stores or transcodes media. ffmpeg.wasm (`@ffmpeg/core`, single-threaded) is copied
into `public/ffmpeg/` by `scripts/copy-ffmpeg.mjs` before `dev`/`build` and served from your own domain.
Filmstrip previews are drawn from a small rendition with a `<video>` element and a canvas.

**Key security features:**
- **Encrypted media tokens:** The proxy only fetches streams the server resolved; clients can't forge targets or read the upstream headers/cookies
- **URL whitelist:** Only known platforms accepted, URLs canonicalized
- **No shell execution:** yt-dlp spawned with array args (no injection)
- **Load caps:** Prevents resource exhaustion; overflows get `503 BUSY`
- **Deduplication:** Identical URLs share one extraction; cached 5 minutes
- **Rate limiting:** Per-IP token buckets (resolve 20/min, media proxy 600/min)
- **Thumbnail proxy:** Instagram/TikTok CDNs block hotlinking, so `/api/thumb` proxies images from an allowlist of CDN domains only

**Storage:** No media on disk. Rate limits and the resolve cache live in process memory, so per-IP limits are per instance; move `src/lib/server/rate-limit.ts` to Redis to share them. Media tokens are stateless, so any instance with the same `YOINK_SECRET` can serve `/api/media`.

---

## 📊 Load Testing

Test your deployment before going live:

```bash
npm run loadtest -- --base https://your.domain --users 50 --duration 60
```

Options:
- `--users 50` — Concurrent virtual users
- `--duration 60` — Test duration in seconds
- `--mode full` — Also pull a file through the media proxy (default `resolve` = fetch only)
- `--pick smallest|best` — Which option to download in full mode (default `smallest`)
- `--ip-header H` — Header used to give each virtual user its own IP

Reference results on a laptop (8 cores, home connection):

| Scenario | Result |
| --- | --- |
| 20 users, distinct links, cache off | 100% ok, ~2.2 extractions/s, p50 4.7s / p99 10.2s, never more than 6 yt-dlp processes |
| 30 users vs. caps of 2 running + 5 queued | 67% ok, rest got a clean `503 BUSY` with no runaway processes |
| 150 users, one viral link, cache on | 2,113 requests in 21s, 100% ok, p50 15ms, one yt-dlp run total |

**Tips:**
- Real requests hit actual platforms — don't hammer them
- If repeated links show <100ms, the cache is working ✓
- Lots of `503 BUSY` → raise `YOINK_MAX_CONCURRENT_RESOLVES`
- `UPSTREAM_BLOCKED` → Platform rate-limiting you; add `YTDLP_PROXY`

---

## 🆓 Free Deployment (Oracle Cloud Always Free)

**Steps:** 30–45 minutes first time.

→ **See [DEPLOY.md](DEPLOY.md)** for step-by-step guide:
1. Create Oracle Cloud free-tier account
2. Spin up 4-CPU ARM server (24 GB RAM, free)
3. Open ports 80/443
4. Get free domain (DuckDNS)
5. Clone repo, configure `.env`, `docker compose up`
6. Done! Runs the full downloader with automatic HTTPS.

**Daily operations:**
```bash
# Deploy new code
git pull && docker compose up -d --build

# Watch logs
docker compose logs -f yoink

# Check health
curl -s https://YOUR_DOMAIN/api/health

# Restart (also updates yt-dlp)
docker compose restart yoink

# Keep yt-dlp fresh (add to crontab)
0 5 * * * cd ~/yoink && docker compose restart yoink
```

---

## 🐛 Troubleshooting

| Problem | Solution |
| --- | --- |
| **Certificate errors in `docker compose logs caddy`** | Check DNS points to server IP; verify ports 80/443 open in firewall (Oracle has 2: security list + iptables) |
| **"set YOINK_SECRET in .env" error** | `.env` missing required variable; run `openssl rand -base64 48` and add it |
| **Lots of "We're at capacity" (503 BUSY)** | Raise `YOINK_MAX_CONCURRENT_RESOLVES`, then `docker compose up -d` |
| **Instagram Stories return "login required"** | Need `YTDLP_COOKIES_FILE` with logged-in cookies (may violate TOS — your choice) |
| **TikTok blocked (e.g., India)** | Set `YTDLP_PROXY=socks5://...` to proxy requests |
| **Server keeps getting reclaimed (Oracle)** | Oracle reclaims idle Always Free instances. Upgrading to Pay-As-You-Go (still free within limits) exempts it |

---

## 📈 Performance & Sizing

**Resource usage per operation:**
- Fetch: ~50–100 MB RAM, a few seconds (yt-dlp process)
- Download: no server CPU (processing runs in the browser); bandwidth only for CDNs that block direct browser reads (TikTok, Pinterest, Snapchat), which stream through `/api/media`

**Starting point for 4 vCPU / 8 GB:**
```env
YOINK_MAX_CONCURRENT_RESOLVES=10
```

Monitor with load testing and adjust based on memory usage.

---

## 📝 API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/resolve` | Extract video/audio info from URL; return download options, each a recipe of streams (direct CDN URL and/or `/api/media` proxy URL) the browser fetches and processes |
| GET | `/api/media?t=` | Pass-through stream for a resolved media file or HLS playlist (playlist URIs are rewritten to proxy URLs); forwards `Range`, stores nothing |
| GET | `/api/thumb` | Proxy image URLs (whitelisted CDNs only) |
| GET | `/api/health` | Health check (resolve queue depth, memory) |

All requests are rate-limited per client IP.

---

## 🔒 Security & Compliance

- **Public content only:** Private/DRM/live content returns clear error
- **Rate limiting:** Per-IP caps prevent abuse
- **Encrypted media tokens:** The proxy can't be used to fetch arbitrary URLs
- **URL validation:** Strict allowlist per platform
- **Security headers:** CSP, `frame-ancestors 'none'`, nosniff, HSTS in production, same-origin checks on POST APIs
- **Privacy:** See [Privacy Policy](src/app/privacy/page.tsx)
- **DMCA/Copyright:** See [Copyright Policy](src/app/copyright/page.tsx)

## ⚠️ Known Limitations

- **Instagram Stories:** most need a login. Without `YTDLP_COOKIES_FILE` they return a clear "login required" error. Supplying an account's cookies may breach Instagram's terms — operator's call.
- **Photo posts** (Instagram images, TikTok slideshows, image pins) aren't supported; yoink is video only.
- **Regional blocks:** if a platform is blocked where the server runs (e.g. TikTok in India), set `YTDLP_PROXY`.
- **Per-instance limits:** rate limits and the resolve cache live in memory.
- **Serverless won't work** (e.g. Vercel functions): needs a long-running Node server with yt-dlp.
- **Browser memory:** files are built in the tab, so very large videos (hundreds of MB, especially with trimming) can exceed what a phone can hold; pick a lower quality there.
- **Segmented DASH** formats (rare on these platforms) aren't offered; whole files and HLS are.

---

## 📚 Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4** — Styling
- **yt-dlp** — Video/audio extraction
- **ffmpeg.wasm** — In-browser merging, trimming, audio conversion & frame extraction
- **Zod** — Input validation
- **Vitest** — Unit tests

---

## 📄 License

No license file is included yet — all rights reserved by default. Operators are responsible for complying with platform terms and copyright law.

---

## 🤝 Contributing

1. Clone the repo
2. Install dependencies: `npm install && pip install -U yt-dlp`
3. Run tests: `npm test`
4. Make changes
5. Submit PR

Keep yt-dlp up to date — platforms change frequently and yt-dlp ships fixes quickly.

---

## 📞 Support & Issues

- Check [DEPLOY.md](DEPLOY.md) for deployment issues
- Review [Troubleshooting](#-troubleshooting) above
- Check existing GitHub issues
- Load test to identify bottlenecks

---

**Made with ❤️ for the internet**
