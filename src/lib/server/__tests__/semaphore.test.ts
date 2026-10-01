import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { Semaphore } from "../semaphore";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
};

describe("Semaphore", () => {
  it("never runs more than `max` tasks at once and drains the queue in order", async () => {
    const sem = new Semaphore(2, 10, 5_000);
    let running = 0;
    let peak = 0;
    const order: number[] = [];
    const gates = Array.from({ length: 5 }, deferred);

    const tasks = gates.map((gate, i) =>
      sem.run(async () => {
        running += 1;
        peak = Math.max(peak, running);
        order.push(i);
        await gate.promise;
        running -= 1;
      }),
    );

    await Promise.resolve();
    expect(sem.stats).toMatchObject({ active: 2, queued: 3 });
    gates.forEach((g) => g.resolve());
    await Promise.all(tasks);

    expect(peak).toBe(2);
    expect(order).toEqual([0, 1, 2, 3, 4]);
    expect(sem.stats).toMatchObject({ active: 0, queued: 0 });
  });

  it("rejects with BUSY when the queue is full", async () => {
    const sem = new Semaphore(1, 1, 5_000);
    const gate = deferred();
    const first = sem.run(() => gate.promise);
    const second = sem.run(async () => "queued");
    await expect(sem.run(async () => "overflow")).rejects.toMatchObject({ code: "BUSY" });
    gate.resolve();
    await first;
    await expect(second).resolves.toBe("queued");
  });

  it("rejects with BUSY after waiting too long and frees the queue slot", async () => {
    const sem = new Semaphore(1, 5, 20);
    const gate = deferred();
    const first = sem.run(() => gate.promise);
    const err = await sem.run(async () => "late").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe("BUSY");
    expect(sem.stats.queued).toBe(0);
    gate.resolve();
    await first;
  });

  it("releases the slot when a task throws", async () => {
    const sem = new Semaphore(1, 5, 5_000);
    await expect(sem.run(async () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    await expect(sem.run(async () => "ok")).resolves.toBe("ok");
  });
});
