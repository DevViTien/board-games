import type { Rng } from "@board-games/engine";

const UINT32_RANGE = 2 ** 32;

function nextUint32(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] ?? 0;
}

/**
 * The app's real source of randomness (dice, random first player), backed by `crypto`. Unlike the
 * engine's seeded generator it cannot be predicted, and `nextInt` is unbiased: draws that would
 * favour the low values (the remainder of 2^32 divided by the range) are thrown away and redrawn.
 */
export const cryptoRng: Rng = {
  nextFloat: () => nextUint32() / UINT32_RANGE,
  nextInt: (min, max) => {
    const range = max - min + 1;
    if (!Number.isInteger(min) || !Number.isInteger(max) || range < 1 || range > UINT32_RANGE) {
      throw new RangeError(`Invalid integer range [${min}, ${max}]`);
    }
    const limit = UINT32_RANGE - (UINT32_RANGE % range);
    let value = nextUint32();
    while (value >= limit) value = nextUint32();
    return min + (value % range);
  },
};
