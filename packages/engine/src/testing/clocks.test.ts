import { describe, expect, it } from "vitest";

import { expiresImmediately, neverExpires, ticking } from "./clocks";

describe("fake clocks", () => {
  it("never expires", () => {
    const now = neverExpires();
    expect([now(), now(), now()]).toEqual([0, 0, 0]);
  });

  it("throws instead of letting a search that never stops hang", () => {
    const now = neverExpires(2);
    expect([now(), now()]).toEqual([0, 0]);
    expect(now).toThrow("read more than 2 times");
  });

  it("expires right after the first read", () => {
    const now = expiresImmediately();
    expect(now()).toBe(0);
    expect(now()).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("ticks forward on every read", () => {
    const now = ticking(5);
    expect([now(), now(), now()]).toEqual([5, 10, 15]);
  });
});
