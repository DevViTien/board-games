import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TimeoutError, withTimeout } from "./with-timeout";

describe("withTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("answers what the operation answers in time", async () => {
    await expect(withTimeout(() => Promise.resolve(42), 100, "late")).resolves.toBe(42);
  });

  it("fails with a TimeoutError once the time is up, and ignores a late answer", async () => {
    let answer: (value: number) => void = () => undefined;
    const result = withTimeout(
      () =>
        new Promise<number>((resolve) => {
          answer = resolve;
        }),
      100,
      "No answer in 100 ms",
    );
    const settled = expect(result).rejects.toThrow(new TimeoutError("No answer in 100 ms"));

    await vi.advanceTimersByTimeAsync(100);
    answer(42);

    await settled;
  });

  it("turns a throw into a rejection, and a non-Error into an Error", async () => {
    await expect(
      withTimeout(
        () => {
          throw new Error("broken");
        },
        100,
        "late",
      ),
    ).rejects.toThrow("broken");
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the case under test
    await expect(withTimeout(() => Promise.reject("down"), 100, "late")).rejects.toThrow("down");
  });
});
