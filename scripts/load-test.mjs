#!/usr/bin/env node
/**
 * yoink load test — simulates users doing paste → fetch (→ download).
 *
 *   node scripts/load-test.mjs --base http://localhost:3000 --users 50 --duration 60
 *   node scripts/load-test.mjs --base https://staging.example.com --users 200 --mode full --pick smallest
 *
 * Options
 *   --base URL         target origin (default http://localhost:3000)
 *   --users N          concurrent virtual users (default 25)
 *   --duration S       test length in seconds (default 60)
 *   --ramp S           seconds to ramp up to full user count (default 10)
 *   --think S          pause between a user's iterations (default 3)
 *   --mode M           resolve | full (full also downloads a file; default resolve)
 *   --pick P           smallest | best — which option to download in full mode (default smallest)
 *   --urls FILE        newline-separated media links to use (default: built-in public list)
 *   --ip-header H      header used to give each user its own IP so per-IP limits behave like
 *                      real traffic (default x-forwarded-for). Must match the server's client-IP
 *                      config (e.g. YOINK_CLIENT_IP_HEADER) — "none" sends one shared IP.
 *
 * Full mode pulls the option's first stream through /api/media, the only download
 * work left on the server (processing happens in the browser). HLS streams transfer
 * just the rewritten playlist.
 *
 * Every fetch hits the real platforms. Keep runs short and modest: hammering YouTube
 * or Instagram from one IP can get that IP temporarily blocked by them.
 * Set YOINK_RESOLVE_CACHE_TTL_MS=0 on the server to measure uncached extraction.
 */
import { readFileSync } from "node:fs";

const DEFAULT_URLS = [
  "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://www.youtube.com/watch?v=9bZkp7q19f0",
  "https://www.youtube.com/watch?v=kJQP7kiw5Fk",
  "https://www.instagram.com/reel/Chunk8-jurw/",
  "https://www.pinterest.com/pin/664281013778109217/",
];

function parseArgs(argv) {
  const opts = {
    base: "http://localhost:3000",
    users: 25,
    duration: 60,
    ramp: 10,
    think: 3,
    mode: "resolve",
    pick: "smallest",
    urls: null,
    ipHeader: "x-forwarded-for",
  };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = argv[i + 1];
    if (!(key in opts) || value === undefined) {
      console.error(`Unknown or incomplete option: ${argv[i]}`);
      process.exit(1);
    }
    opts[key] = typeof opts[key] === "number" ? Number(value) : value;
  }
  if (!["resolve", "full"].includes(opts.mode)) throw new Error("--mode must be resolve or full");
  if (!["smallest", "best"].includes(opts.pick)) throw new Error("--pick must be smallest or best");
  opts.base = opts.base.replace(/\/$/, "");
  opts.urlList = opts.urls
    ? readFileSync(opts.urls, "utf8").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    : DEFAULT_URLS;
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- metrics -----------------------------------------------------------------
const metrics = {
  resolve: { latencies: [], statuses: {}, codes: {} },
  download: { latencies: [], statuses: {}, codes: {}, bytes: 0 },
  peak: { resolvesActive: 0, resolvesQueued: 0, memoryMb: 0 },
};

function record(bucket, ms, status, code) {
  const m = metrics[bucket];
  m.latencies.push(ms);
  m.statuses[status] = (m.statuses[status] ?? 0) + 1;
  if (code) m.codes[code] = (m.codes[code] ?? 0) + 1;
}

function pct(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

const fmtMs = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`);

// ---- virtual user ----------------------------------------------------------------
async function call(path, ip, init = {}) {
  const headers = { "content-type": "application/json", ...init.headers };
  if (opts.ipHeader !== "none") headers[opts.ipHeader] = ip;
  const started = performance.now();
  try {
    const res = await fetch(`${opts.base}${path}`, { ...init, headers, signal: AbortSignal.timeout(180_000) });
    const body = res.headers.get("content-type")?.includes("json") ? await res.json().catch(() => null) : null;
    return { status: res.status, body, ms: performance.now() - started, res };
  } catch (err) {
    return { status: err?.name === "TimeoutError" ? "timeout" : "network", body: null, ms: performance.now() - started };
  }
}

function chooseOption(media) {
  const options = media?.items?.[0]?.options?.filter((o) => o.kind === "video") ?? [];
  if (!options.length) return null;
  if (opts.pick === "best") return options[0];
  return [...options].sort((a, b) => (a.sizeBytes ?? Infinity) - (b.sizeBytes ?? Infinity))[0];
}

async function fullDownload(media, ip) {
  const option = chooseOption(media);
  const stream = option?.recipe?.streams?.[0];
  if (!stream) return;
  const started = performance.now();
  const file = await call(stream.proxy, ip);
  let bytes = 0;
  if (file.res?.body && !file.body) for await (const chunk of file.res.body) bytes += chunk.length;
  metrics.download.bytes += bytes;
  record("download", performance.now() - started, file.status, file.body?.error?.code);
}

async function virtualUser(index, stopAt) {
  const ip = `10.${(index >> 16) & 255}.${(index >> 8) & 255}.${index & 255}`;
  let iteration = 0;
  while (Date.now() < stopAt) {
    const url = opts.urlList[(index + iteration) % opts.urlList.length];
    iteration += 1;
    const res = await call("/api/resolve", ip, { method: "POST", body: JSON.stringify({ url }) });
    record("resolve", res.ms, res.status, res.body?.error?.code);
    if (opts.mode === "full" && res.status === 200) await fullDownload(res.body, ip);
    const retryAfter = res.status === 429 || res.status === 503 ? 5_000 : 0;
    await sleep(opts.think * 1000 * (0.5 + Math.random()) + retryAfter);
  }
}

// ---- health sampling ---------------------------------------------------------
async function sampleHealth() {
  const res = await call("/api/health", "127.0.0.1");
  const h = res.body;
  if (!h?.ok) return null;
  const p = metrics.peak;
  p.resolvesActive = Math.max(p.resolvesActive, h.resolves.active);
  p.resolvesQueued = Math.max(p.resolvesQueued, h.resolves.queued);
  p.memoryMb = Math.max(p.memoryMb, h.memoryMb);
  return h;
}

function summary(name, m) {
  const total = m.latencies.length;
  if (!total) return `${name}: no requests`;
  const ok = Object.entries(m.statuses)
    .filter(([s]) => s === "200" || s === "206")
    .reduce((n, [, c]) => n + c, 0);
  const lines = [
    `${name}: ${total} total, ${((ok / total) * 100).toFixed(1)}% ok`,
    `  latency  p50 ${fmtMs(pct(m.latencies, 50))}  p90 ${fmtMs(pct(m.latencies, 90))}  p99 ${fmtMs(pct(m.latencies, 99))}  max ${fmtMs(Math.max(...m.latencies))}`,
    `  status   ${Object.entries(m.statuses).map(([s, c]) => `${s}×${c}`).join("  ")}`,
  ];
  if (Object.keys(m.codes).length) lines.push(`  errors   ${Object.entries(m.codes).map(([c, n]) => `${c}×${n}`).join("  ")}`);
  return lines.join("\n");
}

// ---- main ----------------------------------------------------------------------
async function main() {
  const health = await sampleHealth();
  if (!health) {
    console.error(`Can't reach ${opts.base}/api/health — is the server running?`);
    process.exit(1);
  }
  console.log(
    `yoink load test → ${opts.base}\n` +
      `${opts.users} users · ${opts.duration}s · ramp ${opts.ramp}s · mode ${opts.mode} · ${opts.urlList.length} links\n` +
      `server caps: resolves ${health.resolves.max} (+${health.resolves.maxQueue} queued)\n`,
  );

  const startedAt = Date.now();
  const stopAt = startedAt + opts.duration * 1000;
  const users = [];
  const rampDelay = (opts.ramp * 1000) / Math.max(opts.users, 1);
  const spawner = (async () => {
    for (let i = 0; i < opts.users && Date.now() < stopAt; i++) {
      users.push(virtualUser(i, stopAt));
      await sleep(rampDelay);
    }
  })();

  const ticker = setInterval(async () => {
    const h = await sampleHealth();
    const r = metrics.resolve;
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    console.log(
      `[${String(elapsed).padStart(3)}s] users ${users.length}  resolves ${r.latencies.length} (p90 ${fmtMs(pct(r.latencies.slice(-200), 90))})` +
        (h ? `  server: resolving ${h.resolves.active}/${h.resolves.max} queued ${h.resolves.queued}  rss ${h.memoryMb}MB` : "  server: health check failed"),
    );
  }, 5000);

  await spawner;
  await Promise.all(users);
  clearInterval(ticker);

  const seconds = (Date.now() - startedAt) / 1000;
  const p = metrics.peak;
  console.log(`\n=== results (${seconds.toFixed(0)}s) ===`);
  console.log(summary("resolve", metrics.resolve));
  if (opts.mode === "full") {
    console.log(summary("proxied transfer", metrics.download));
    console.log(`  transferred ${(metrics.download.bytes / 1048576).toFixed(1)} MB`);
  }
  console.log(`throughput: ${(metrics.resolve.latencies.length / seconds).toFixed(2)} resolves/s`);
  console.log(
    `server peaks: resolving ${p.resolvesActive} · resolve queue ${p.resolvesQueued} · rss ${p.memoryMb}MB`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
