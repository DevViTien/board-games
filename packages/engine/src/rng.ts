import type { Rng } from "./types";

const UINT32_RANGE = 2 ** 32;

/**
 * Seeded generator (mulberry32) for tests, the contract suite and AI. Not for anything security
 * related: real dice in the app and on the server come from `crypto`.
 *
 * The seed must be an integer; it is taken modulo 2^32, so `0` and `2 ** 32` give the same sequence.
 */
export function createRng(seed: number): Rng {
  // A fractional or NaN seed would silently truncate to another seed's sequence.
  if (!Number.isInteger(seed)) throw new RangeError(`Seed must be an integer, got ${seed}`);
  let state = seed >>> 0;

  function nextUint32(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  function nextFloat(): number {
    return nextUint32() / UINT32_RANGE;
  }

  function nextInt(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new RangeError(`Invalid integer range [${min}, ${max}]`);
    }
    // One 32-bit draw cannot reach every integer of a wider range (it would skip all odd numbers
    // of [0, 2^33)); no game needs more than 2^32 outcomes, so refuse rather than combine draws.
    if (max - min + 1 > UINT32_RANGE) {
      throw new RangeError(`Range [${min}, ${max}] is wider than 2^32 values`);
    }
    return min + Math.floor(nextFloat() * (max - min + 1));
  }

  return { nextInt, nextFloat };
}
