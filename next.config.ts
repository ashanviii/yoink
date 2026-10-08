import { readFileSync } from "node:fs";
import type { NextConfig } from "next";
import { DIRECT_MEDIA_CSP } from "./src/lib/media-hosts";

const isDev = process.env.NODE_ENV !== "production";

/** Busts the long-lived /ffmpeg cache whenever either core is upgraded. */
const ffmpegVersion = ["@ffmpeg/core", "@ffmpeg/core-mt"]
  .map((pkg) => JSON.parse(readFileSync(`node_modules/${pkg}/package.json`, "utf8")).version)
  .join("-");

// Cloudflare Turnstile's bot check loads a script and renders in an iframe. If it's turned back
// on, check it still loads under the Cross-Origin-Embedder-Policy below.
const turnstile = "https://challenges.cloudflare.com";

const csp = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; dev mode also needs eval for HMR.
  // ffmpeg.wasm needs to compile WebAssembly.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' ${turnstile}${isDev ? " 'unsafe-eval'" : ""}`,
  `frame-src ${turnstile}`,
  // ffmpeg.wasm's workers are files on this site; Mediabunny starts small helpers (its MP3
  // encoder, timers that keep running in a background tab) from blob: URLs it creates.
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  // Media is fetched straight from these CDNs when they allow it (else via /api/media).
  // blob: lets the ffmpeg worker read the core we downloaded with a progress bar.
  `connect-src 'self' blob: ${DIRECT_MEDIA_CSP}${isDev ? " ws: wss:" : ""}`,
  `media-src 'self' blob: ${DIRECT_MEDIA_CSP}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: { NEXT_PUBLIC_FFMPEG_VERSION: ffmpegVersion },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), clipboard-read=(self)" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // With COOP above, isolates the page so multi-threaded ffmpeg.wasm can use SharedArrayBuffer.
          // "credentialless" still lets CDN media and images load (without cookies); browsers that
          // don't know it (Safari) stay un-isolated and use the single-threaded core.
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
          ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
        ],
      },
      {
        // ffmpeg.wasm is ~32 MB; URLs carry the core version (?v=), so browsers can keep it.
        source: "/ffmpeg/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // The showcase clip, poster and filmstrip; rename the files to replace them.
        source: "/demo/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
