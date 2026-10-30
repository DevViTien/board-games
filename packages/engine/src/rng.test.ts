import { describe, expect, it } from "vitest";

import { createRng } from "./rng";

function take(count: number, next: () => number): number[] {
  return Array.from({ length: count }, next);
}

describe("createRng", () => {
  it("gives the same sequence for the same seed", () => {
    const a = createRng(42);
    const b = createRng(42);

    expect(take(20, () => a.nextInt(1, 6))).toEqual(take(20, () => b.nextInt(1, 6)));
  });

  it("gives different sequences for different seeds", () => {
    const a = createRng(1);
    const b = createRng(2);

    expect(take(20, a.nextFloat)).not.toEqual(take(20, b.nextFloat));
  });

  it("keeps nextInt within [min, max] and reaches both ends", () => {
    const rng = createRng(7);
    const values = take(10_000, () => rng.nextInt(1, 6));

    expect(Math.min(...values)).toBe(1);
    expect(Math.max(...values)).toBe(6);
    expect(values.every(Number.isInteger)).toBe(true);
  });

  it("keeps nextFloat within [0, 1)", () => {
    const rng = createRng(99);
    const values = take(10_000, rng.nextFloat);

    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it("rejects an invalid range", () => {
    const rng = createRng(0);

    expect(() => rng.nextInt(3, 1)).toThrow(RangeError);
    expect(() => rng.nextInt(0.5, 2)).toThrow(RangeError);
  });

  it("rejects a range wider than one 32-bit draw can cover", () => {
    const rng = createRng(0);

    expect(() => rng.nextInt(0, 2 ** 33 - 1)).toThrow(RangeError);
    expect(rng.nextInt(0, 2 ** 32 - 1)).toBeLessThan(2 ** 32);
  });

  it("rejects a seed that is not an integer instead of truncating it", () => {
    expect(() => createRng(1.9)).toThrow(RangeError);
    expect(() => createRng(Number.NaN)).toThrow(RangeError);
  });

  it("takes the seed modulo 2^32", () => {
    expect(take(5, createRng(2 ** 32 + 5).nextFloat)).toEqual(take(5, createRng(5).nextFloat));
  });
});
