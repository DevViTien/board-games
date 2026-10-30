import { describe, expect, it } from "vitest";

import { cryptoRng } from "./crypto-rng";

function take(count: number, next: () => number): number[] {
  return Array.from({ length: count }, next);
}

describe("cryptoRng", () => {
  it("keeps nextInt within [min, max] and reaches both ends", () => {
    const values = take(10_000, () => cryptoRng.nextInt(1, 6));

    expect(values.every((value) => Number.isInteger(value) && value >= 1 && value <= 6)).toBe(true);
    expect(new Set(values)).toEqual(new Set([1, 2, 3, 4, 5, 6]));
  });

  it("keeps nextFloat within [0, 1)", () => {
    expect(take(10_000, cryptoRng.nextFloat).every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it("handles a single-value range", () => {
    expect(cryptoRng.nextInt(4, 4)).toBe(4);
  });

  it("rejects an invalid range", () => {
    expect(() => cryptoRng.nextInt(3, 1)).toThrow(RangeError);
    expect(() => cryptoRng.nextInt(0, 1.5)).toThrow(RangeError);
    expect(() => cryptoRng.nextInt(0, 2 ** 33)).toThrow(RangeError);
  });
});
