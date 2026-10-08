#!/usr/bin/env node
/**
 * Copies ffmpeg.wasm's core and worker into public/ffmpeg so the browser loads
 * them from this site (no third-party CDN). Runs before `dev` and `build`; the
 * output is gitignored.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sources = [
  ["ffmpeg", "@ffmpeg/core/dist/esm", ["ffmpeg-core.js", "ffmpeg-core.wasm"]],
  // The worker imports these two siblings.
  ["ffmpeg", "@ffmpeg/ffmpeg/dist/esm", ["worker.js", "const.js", "errors.js"]],
  // Multi-threaded core, used where the page is cross-origin isolated.
  ["ffmpeg/mt", "@ffmpeg/core-mt/dist/esm", ["ffmpeg-core.js", "ffmpeg-core.wasm", "ffmpeg-core.worker.js"]],
];

for (const [dest, dir, files] of sources) {
  const out = path.join(root, "public", dest);
  mkdirSync(out, { recursive: true });
  for (const file of files) copyFileSync(path.join(root, "node_modules", dir, file), path.join(out, file));
}
console.log("[yoink] ffmpeg.wasm copied to public/ffmpeg");
