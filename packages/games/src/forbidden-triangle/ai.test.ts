import {
  AI_LEVEL,
  type AiLevel,
  chooseMove,
  createRng,
  type PlayerIndex,
  type Rng,
} from "@board-games/engine";
import { neverExpires, ticking } from "@board-games/engine/testing";
import { describe, expect, it } from "vitest";

import {
  closesTriangle,
  forbiddenTriangle,
  type ForbiddenTriangleGuests,
  type ForbiddenTriangleState,
  safeLines,
} from "./rules";

function start(guests: ForbiddenTriangleGuests = 6): ForbiddenTriangleState {
  return forbiddenTriangle.setup({ playerCount: 2, options: { guests } });
}

/**
 * The AI's move. Hard searches until its budget runs out: here every read of the clock is a
 * millisecond, so the budget counts the positions searched, the same on every machine.
 */
function aiMove(state: ForbiddenTriangleState, level: AiLevel, rng: Rng, budget = 20_000) {
  const chosen = chooseMove(forbiddenTriangle, state, {
    level,
    rng,
    now: level === AI_LEVEL.Hard ? ticking(1) : () => 0,
    timeLimitMs: budget,
  });
  if (!chosen.ok) throw new Error(chosen.error);
  return chosen.value;
}

/** A player who picks at random among the lines that do not lose at once, if any. */
function randomSafe(state: ForbiddenTriangleState, rng: Rng) {
  const safe = safeLines(state, state.toMove);
  const pool = safe.length > 0 ? safe : forbiddenTriangle.legalMoves(state).map(({ line }) => line);
  return { line: pool[rng.nextInt(0, pool.length - 1)] ?? 0 };
}

/** Plays a game, the AI at `level` in seat `aiSeat`; returns the winner, or `null` for a draw. */
function playAgainst(
  guests: ForbiddenTriangleGuests,
  level: AiLevel,
  aiSeat: PlayerIndex,
  seed: number,
): PlayerIndex | null {
  const rng = createRng(seed);
  let state = start(guests);
  for (;;) {
    const result = forbiddenTriangle.result(state);
    if (result !== null) return result.kind === "win" ? (result.winners[0] ?? null) : null;
    const move = state.toMove === aiSeat ? aiMove(state, level, rng) : randomSafe(state, rng);
    state = forbiddenTriangle.applyMove(state, move);
  }
}

describe("Máy chơi Tam giác cấm", () => {
  it("Không tự thua: every level draws a safe line while one is left", () => {
    for (const level of [AI_LEVEL.Easy, AI_LEVEL.Medium, AI_LEVEL.Hard]) {
      for (let seed = 1; seed <= 20; seed += 1) {
        const rng = createRng(seed);
        let state = start(6);
        while (forbiddenTriangle.result(state) === null) {
          const safe = safeLines(state, state.toMove);
          const move =
            state.toMove === 1 ? aiMove(state, level, rng, 2_000) : randomSafe(state, rng);
          if (state.toMove === 1 && safe.length > 0) {
            expect(
              closesTriangle(state, 1, move.line),
              `${level}, seed ${String(seed)}`,
            ).toBeNull();
          }
          state = forbiddenTriangle.applyMove(state, move);
        }
      }
    }
  });

  it("Máy Khó đi sau ở bàn 6 khách: wins 50 games out of 50", { timeout: 60_000 }, () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      expect(playAgainst(6, AI_LEVEL.Hard, 1, seed), `seed ${String(seed)}`).toBe(1);
    }
  });

  it("searches five guests to the end on Hard, and never loses there", { timeout: 60_000 }, () => {
    const rng = createRng(1);
    const chosen = chooseMove(forbiddenTriangle, start(5), {
      level: AI_LEVEL.Hard,
      rng,
      now: neverExpires(),
      timeLimitMs: 1000,
    });
    expect(chosen.ok).toBe(true);
    for (let seed = 1; seed <= 20; seed += 1) {
      for (const seat of [0, 1] as const) {
        expect(playAgainst(5, AI_LEVEL.Hard, seat, seed)).not.toBe(1 - seat);
      }
    }
  });

  it("scores the safe lines one keeps against the opponent's, as an integer", () => {
    let state = start(6);
    expect(forbiddenTriangle.evaluate(state, 0)).toBe(0);
    const rng = createRng(3);
    while (forbiddenTriangle.result(state) === null) {
      const mine = forbiddenTriangle.evaluate(state, 0);
      expect(Number.isInteger(mine)).toBe(true);
      expect(forbiddenTriangle.evaluate(state, 1) + mine).toBe(0);
      state = forbiddenTriangle.applyMove(state, randomSafe(state, rng));
    }
  });
});
