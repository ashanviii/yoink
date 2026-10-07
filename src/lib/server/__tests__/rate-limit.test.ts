import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import { RateLimiter } from "../rate-limit";

const rejection = (fn: () => void): AppError => {
  try {
    fn();
  } catch (err) {
    return err as AppError;
  }
  throw new Error("expected a rejection");
};

describe("RateLimiter", () => {
  afterEach(() => vi.useRealTimers());

  it("allows a burst up to capacity, then refills over the window", () => {
    vi.useFakeTimers();
    const limiter = new RateLimiter(3, 60_000);
    for (let i = 0; i < 3; i++) limiter.consume("a");

    const err = rejection(() => limiter.consume("a"));
    expect(err.code).toBe("RATE_LIMITED");
    expect(err.retryAfter).toBe(20);
    limiter.consume("b"); // other clients are unaffected

    vi.advanceTimersByTime(20_000);
    limiter.consume("a");
    expect(() => limiter.consume("a")).toThrow(AppError);
  });

  it("blocks once charged usage exhausts the budget, until it refills", () => {
    vi.useFakeTimers();
    const limiter = new RateLimiter(1000, 60_000);
    limiter.consume("a", 0);
    limiter.charge("a", 1500); // one request may overshoot; the next is blocked

    const err = rejection(() => limiter.consume("a", 0, "hourly cap"));
    expect(err.message).toBe("hourly cap");
    expect(err.retryAfter).toBe(31);

    vi.advanceTimersByTime(31_000);
    limiter.consume("a", 0);
  });
});
