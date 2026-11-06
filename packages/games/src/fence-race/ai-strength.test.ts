import { chooseMove, createRng, type Rng } from "@board-games/engine";
import { neverExpires } from "@board-games/engine/testing";
import { describe, expect, it } from "vitest";

import { fenceRace, type FenceRaceMove, type FenceRaceState } from "./rules";

// What these tests measure: whole games between levels, on fixed seeds, whatever the speed of the
// machine. Easy and Medium are the AI's real `chooseMove`. Hard has no fixed depth, only a time limit,
// so here it is the real `chooseMove` with a clock that stops it right after depth 3: what the rules
// (a wrapper round `applyMove`) see of the search tells when it starts on depth 4, and the clock runs
// out there. The same on any machine, with nothing wasted on a depth left unfinished. This is the real
// `chooseMove` stopped at depth 3, not a lower bound of Hard: Hard at its real limit is measured only
// outside these tests, on real clocks (design §3).
const HARD_STOPS_BEFORE_DEPTH = 4;

type Level = "easy" | "medium" | "hard";

/** Hard's move, its search stopped once it has finished depth 3. */
function hardMoveToDepthThree(state: FenceRaceState, rng: Rng) {
  let depth = 0;
  let outOfTime = false;
  const tried = new Set<string>();
  const game: typeof fenceRace = {
    ...fenceRace,
    applyMove: (from, move) => {
      if (from === state) {
        // The moves from the root come once in each depth: one seen again is the next depth.
        const key = fenceRace.moveKey(move);
        if (depth === 0 || tried.has(key)) {
          depth += 1;
          tried.clear();
          if (depth === HARD_STOPS_BEFORE_DEPTH) outOfTime = true;
        }
        tried.add(key);
      }
      return fenceRace.applyMove(from, move);
    },
  };
  return chooseMove(game, state, {
    level: "hard",
    rng,
    now: () => (outOfTime ? Number.MAX_SAFE_INTEGER : 0),
    timeLimitMs: 1_000_000,
  });
}

function chooseFor(state: FenceRaceState, level: Level, rng: Rng): FenceRaceMove {
  const chosen =
    level === "hard"
      ? hardMoveToDepthThree(state, rng)
      : chooseMove(fenceRace, state, { level, rng, now: neverExpires(), timeLimitMs: 0 });
  if (!chosen.ok) throw new Error(chosen.error);
  return chosen.value;
}

/** The moves picked at random at the start of each game: else the same game every time. */
const OPENING_MOVES = 2;

/** A game with a level for each seat: `state` at its end. */
function playGame(seed: number, levels: readonly Level[]): FenceRaceState {
  const rng = createRng(seed);
  let state = fenceRace.setup({ playerCount: levels.length, options: {} });
  while (state.result === null) {
    let move: FenceRaceMove | undefined;
    if (state.moveCount < OPENING_MOVES) {
      const moves = fenceRace.candidateMoves(state);
      move = moves[rng.nextInt(0, moves.length - 1)];
    } else {
      move = chooseFor(state, levels[state.toMove] ?? "medium", rng);
    }
    if (move === undefined) throw new Error("No move");
    state = fenceRace.applyMove(state, move);
  }
  return state;
}

/**
 * How many of `games` games `strong` wins against `weak`, taking turns to start. Stops as soon as it
 * has `enough`: the games left could not change the answer.
 */
function winsUpTo(strong: Level, weak: Level, enough: number, games: number, seed: number) {
  let wins = 0;
  for (let game = 0; game < games && wins < enough; game += 1) {
    const strongSeat = game % 2;
    const levels = strongSeat === 0 ? [strong, weak] : [weak, strong];
    const { result } = playGame(seed + game, levels);
    if (result?.kind === "win" && result.winners[0] === strongSeat) wins += 1;
  }
  return wins;
}

describe("Máy chơi Cờ rào: whole games on fixed seeds", { timeout: 600_000 }, () => {
  it("Khó thắng Dễ: at least 36 of 40 games", () => {
    expect(winsUpTo("hard", "easy", 36, 40, 1000)).toBeGreaterThanOrEqual(36);
  });

  it("Khó thắng Vừa: at least 60% of 100 games with a random opening", () => {
    expect(winsUpTo("hard", "medium", 60, 100, 2000)).toBeGreaterThanOrEqual(60);
  });

  it("Vừa thắng Dễ in a game of two, by a clear margin", () => {
    expect(winsUpTo("medium", "easy", 30, 40, 3000)).toBeGreaterThanOrEqual(30);
  });

  it.each([3, 4])("Medium beats Easy with %i players: well over its fair share", (players) => {
    const games = 60;
    let wins = 0;
    for (let game = 0; game < games; game += 1) {
      const mediumSeat = game % players;
      const levels = Array.from({ length: players }, (_seat, seat): Level =>
        seat === mediumSeat ? "medium" : "easy",
      );
      const { result } = playGame(4000 + game, levels);
      if (result?.kind === "win" && result.winners[0] === mediumSeat) wins += 1;
    }
    expect(wins).toBeGreaterThan((games / players) * 1.2);
  });

  it.each([2, 3, 4])(
    "Máy không đi qua đi lại: games of %i at Medium with a random opening reach no limit",
    (players) => {
      const levels = Array.from({ length: players }, (): Level => "medium");
      for (let game = 0; game < 34; game += 1) {
        const { result } = playGame(5000 + game, levels);
        expect(result?.reason, `seed ${5000 + game}`).toBe("goal");
      }
    },
  );
});
