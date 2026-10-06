import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VideoCache } from "../video-cache";

describe("VideoCache", () => {
  let base: string;
  let downloads: number;

  /** Fake downloader: writes `bytes` bytes, optionally after `gate` resolves. */
  const downloader =
    (bytes = 100, gate?: Promise<void>) =>
    async (dir: string) => {
      downloads += 1;
      await gate;
      const file = path.join(dir, "video.mp4");
      await writeFile(file, Buffer.alloc(bytes, 1));
      return file;
    };

  beforeEach(async () => {
    base = await mkdtemp(path.join(tmpdir(), "yoink-cache-test-"));
    downloads = 0;
  });
  afterEach(async () => {
    vi.useRealTimers();
    await rm(base, { recursive: true, force: true });
  });

  it("serves a repeat request from disk without downloading again", async () => {
    const cache = new VideoCache(() => base, 10_000, 60_000);
    const first = await cache.acquire("a", downloader());
    first.release();
    const second = await cache.acquire("a", downloader());

    expect(downloads).toBe(1);
    expect(first.hit).toBe(false);
    expect(second.hit).toBe(true);
    expect(second.filePath).toBe(first.filePath);
    second.release();
  });

  it("shares one in-flight download between concurrent requests", async () => {
    const cache = new VideoCache(() => base, 10_000, 60_000);
    let open!: () => void;
    const gate = new Promise<void>((resolve) => (open = resolve));
    const onWait = vi.fn();

    const a = cache.acquire("a", downloader(100, gate));
    const b = cache.acquire("a", downloader(100, gate), onWait);
    open();
    const [leaseA, leaseB] = await Promise.all([a, b]);

    expect(downloads).toBe(1);
    expect(onWait).toHaveBeenCalledOnce();
    expect(leaseA.filePath).toBe(leaseB.filePath);
    leaseA.release();
    leaseB.release();
  });

  it("doesn't cache failures, and retries on the next request", async () => {
    const cache = new VideoCache(() => base, 10_000, 60_000);
    await expect(
      cache.acquire("a", async () => {
        downloads += 1;
        throw new Error("upstream down");
      }),
    ).rejects.toThrow("upstream down");

    const lease = await cache.acquire("a", downloader());
    expect(downloads).toBe(2);
    expect(lease.hit).toBe(false);
    lease.release();
  });

  it("evicts least-recently-used idle videos over budget, never one in use", async () => {
    const cache = new VideoCache(() => base, 250, 60_000);
    const a = await cache.acquire("a", downloader());
    const b = await cache.acquire("b", downloader());
    b.release();
    const c = await cache.acquire("c", downloader()); // 300 bytes: "b" is the only idle one to drop

    expect(cache.stats()).toMatchObject({ entries: 2, bytes: 200 });
    await vi.waitFor(() => expect(existsSync(b.filePath)).toBe(false));
    expect(existsSync(a.filePath)).toBe(true);
    a.release();
    c.release();
  });

  it("drops idle videos after the TTL", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const cache = new VideoCache(() => base, 10_000, 60_000);
    const lease = await cache.acquire("a", downloader());
    lease.release();

    vi.setSystemTime(Date.now() + 61_000);
    cache.evict();
    await vi.waitFor(() => expect(existsSync(lease.filePath)).toBe(false));
    expect(cache.stats().entries).toBe(0);
  });

  it("with a zero budget still shares concurrent downloads but keeps nothing", async () => {
    const cache = new VideoCache(() => base, 0, 60_000);
    const lease = await cache.acquire("a", downloader());
    expect(existsSync(lease.filePath)).toBe(true); // usable while leased
    lease.release();
    await vi.waitFor(() => expect(existsSync(lease.filePath)).toBe(false));
  });
});
