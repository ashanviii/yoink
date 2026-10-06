import "server-only";
import { mkdtemp, rm, stat } from "node:fs/promises";
import path from "node:path";

export const CACHE_DIR_PREFIX = "yoink-cache-";

interface Entry {
  key: string;
  dir: string;
  filePath: string;
  sizeBytes: number;
  lastUsed: number;
  /** Leases currently reading the file; never evicted while > 0. */
  refs: number;
}

interface Flight {
  promise: Promise<Entry>;
  /** Callers waiting on this download; handed to the entry the moment it lands. */
  refs: number;
}

export interface VideoLease {
  filePath: string;
  /** True when the file was already on disk (no download, no wait). */
  hit: boolean;
  /** Must be called once the caller is done reading the file. */
  release: () => void;
}

async function isFile(file: string): Promise<boolean> {
  const info = await stat(file).catch(() => null);
  return !!info?.isFile() && info.size > 0;
}

/**
 * Keeps recently downloaded videos on disk so repeat frame grabs skip the
 * download. Identical concurrent requests share one download. Idle files are
 * evicted after `ttlMs`, and least-recently-used idle files once the total
 * passes `maxBytes` (0 = share in-flight downloads only, keep nothing).
 */
export class VideoCache {
  private readonly entries = new Map<string, Entry>();
  private readonly flights = new Map<string, Flight>();
  private totalBytes = 0;
  private sweeper: NodeJS.Timeout | null = null;

  constructor(
    private readonly baseDir: () => string,
    private readonly maxBytes: number,
    private readonly ttlMs: number,
  ) {}

  /**
   * Leases the video for `key`, calling `download(dir)` to fetch it into a fresh
   * directory when it isn't cached. `onWait` fires when another caller is
   * already downloading the same video and this one has to wait for it.
   */
  async acquire(key: string, download: (dir: string) => Promise<string>, onWait?: () => void): Promise<VideoLease> {
    this.ensureSweeper();

    const cached = this.entries.get(key);
    if (cached) {
      cached.refs += 1;
      cached.lastUsed = Date.now();
      if (await isFile(cached.filePath)) return this.lease(cached, true);
      cached.refs -= 1;
      this.drop(cached); // deleted out from under us; fetch it again
    }

    let flight = this.flights.get(key);
    if (flight) {
      onWait?.();
    } else {
      flight = { refs: 0 } as Flight;
      flight.promise = this.fill(key, flight, download);
      this.flights.set(key, flight);
    }
    flight.refs += 1;
    return this.lease(await flight.promise, false);
  }

  /** Cache directories that must survive stale-temp-dir cleanup. */
  liveDirs(): Set<string> {
    return new Set([...this.entries.values()].map((entry) => entry.dir));
  }

  stats() {
    return { entries: this.entries.size, bytes: this.totalBytes, maxBytes: this.maxBytes };
  }

  /** Drops idle entries past their TTL, then idle LRU entries until under budget. */
  evict(): void {
    const now = Date.now();
    const idle = [...this.entries.values()].filter((entry) => entry.refs === 0).sort((a, b) => a.lastUsed - b.lastUsed);
    for (const entry of idle) {
      if (now - entry.lastUsed >= this.ttlMs || this.totalBytes > this.maxBytes) this.drop(entry);
    }
  }

  private async fill(key: string, flight: Flight, download: (dir: string) => Promise<string>): Promise<Entry> {
    let dir: string | null = null;
    try {
      dir = await mkdtemp(path.join(this.baseDir(), CACHE_DIR_PREFIX));
      const filePath = await download(dir);
      const { size } = await stat(filePath);
      // Synchronous from here: no new waiter can join between copying refs and publishing.
      const entry: Entry = { key, dir, filePath, sizeBytes: size, lastUsed: Date.now(), refs: flight.refs };
      this.flights.delete(key);
      this.entries.set(key, entry);
      this.totalBytes += size;
      this.evict();
      return entry;
    } catch (err) {
      this.flights.delete(key);
      if (dir) await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      throw err;
    }
  }

  private lease(entry: Entry, hit: boolean): VideoLease {
    let released = false;
    return {
      filePath: entry.filePath,
      hit,
      release: () => {
        if (released) return;
        released = true;
        entry.refs -= 1;
        entry.lastUsed = Date.now();
        if (this.entries.get(entry.key) !== entry) {
          // Already dropped while in use; the last reader cleans up.
          if (entry.refs === 0) void rm(entry.dir, { recursive: true, force: true }).catch(() => undefined);
        } else {
          this.evict();
        }
      },
    };
  }

  private drop(entry: Entry): void {
    if (this.entries.get(entry.key) !== entry) return;
    this.entries.delete(entry.key);
    this.totalBytes -= entry.sizeBytes;
    if (entry.refs === 0) void rm(entry.dir, { recursive: true, force: true }).catch(() => undefined);
  }

  private ensureSweeper(): void {
    if (this.sweeper) return;
    this.sweeper = setInterval(() => this.evict(), Math.min(60_000, this.ttlMs));
    this.sweeper.unref();
  }
}
