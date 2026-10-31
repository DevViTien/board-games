// Fake clocks for the AI's `now`. The AI reads the clock once to set its deadline, then while it
// searches, so each clock below decides how much "time" passes between reads.
//
// The Hard level has no depth limit: with a clock that never runs out, only the end of the game
// tree stops it, and on a game whose tree never ends the search would hang the test run (Vitest's
// timeout cannot interrupt synchronous code). So a clock where time does not pass throws after
// `maxReads` reads instead, turning such a hang into a failing test.

/** Default read budget: far more than any finite search in the tests needs. */
const MAX_FROZEN_READS = 1_000_000;

/** Time never passes: the search only stops when it is done, or the clock throws after `maxReads`. */
export function neverExpires(maxReads = MAX_FROZEN_READS): () => number {
  let reads = 0;
  return () => {
    reads += 1;
    if (reads > maxReads) {
      throw new Error(`Fake clock read more than ${maxReads} times: the search does not stop`);
    }
    return 0;
  };
}

/** The deadline has passed as soon as the search starts. */
export function expiresImmediately(): () => number {
  let reads = 0;
  return () => (reads++ === 0 ? 0 : Number.MAX_SAFE_INTEGER);
}

/** Every read advances the clock by `step` milliseconds, so any search reaches its deadline. */
export function ticking(step = 1): () => number {
  let time = 0;
  return () => {
    time += step;
    return time;
  };
}
