import "server-only";
import { AppError } from "@/lib/errors";

interface Waiter {
  grant: () => void;
  timer: NodeJS.Timeout;
}

/**
 * Caps how many expensive operations (each one a yt-dlp process) run at once.
 * Extra callers wait in a bounded FIFO queue; when the queue is full, or a
 * caller waits too long, they get a BUSY error instead of piling up processes
 * until the box runs out of memory.
 */
export class Semaphore {
  private active = 0;
  private readonly waiters: Waiter[] = [];

  constructor(
    private readonly max: number,
    private readonly maxQueue: number,
    private readonly maxWaitMs: number,
  ) {}

  get stats() {
    return { active: this.active, queued: this.waiters.length, max: this.max, maxQueue: this.maxQueue };
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active += 1;
      return Promise.resolve();
    }
    if (this.waiters.length >= this.maxQueue) {
      return Promise.reject(new AppError("BUSY", undefined, { retryAfter: 10 }));
    }
    return new Promise((resolve, reject) => {
      const waiter: Waiter = {
        grant: () => {
          clearTimeout(waiter.timer);
          this.active += 1;
          resolve();
        },
        timer: setTimeout(() => {
          const index = this.waiters.indexOf(waiter);
          if (index >= 0) this.waiters.splice(index, 1);
          reject(new AppError("BUSY", undefined, { retryAfter: 10 }));
        }, this.maxWaitMs),
      };
      this.waiters.push(waiter);
    });
  }

  private release(): void {
    this.active -= 1;
    this.waiters.shift()?.grant();
  }
}
