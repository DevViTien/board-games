import { chooseMove, createRng, type Rng } from "@board-games/engine";
import { neverExpires, ticking } from "@board-games/engine/testing";
import { describe, expect, it } from "vitest";

import { ludoEvaluate } from "./ai";
import { IN_STABLE, LUDO_COLOUR, type LudoColour, OWN_GATE } from "./constants";
import { LUDO_DEFAULT_OPTIONS } from "./options";
import { ludo, type LudoMove, type LudoState } from "./rules";
import { selfPlay } from "./self-play";
import { position } from "./test-positions";
import { ludoVariantRules } from "./test-variants";
import { cellOf, progressAt } from "./track";

const S = IN_STABLE;
const step = (k: number) => OWN_GATE + k;
const { Red, Blue, Yellow } = LUDO_COLOUR;

/** The progress of a horse of `colour` standing where a Red horse at `redProgress` would. */
function seenFromRed(colour: LudoColour, redProgress: number): number {
  return progressAt(colour, cellOf(Red, redProgress));
}

/** Never plays a random move and always takes the first of tied moves. */
const NO_CHANCE: Rng = { nextInt: (min) => min, nextFloat: () => 0.99 };

/**
 * Time limit of the real-clock test, kept short so the suite stays fast. The app gives Hard 1.5 s
 * (`AI_TIME_LIMIT_MS.hard`); the depth it reaches then was measured by setting this to 1 500 once
 * (design §6).
 */
const HARD_LIMIT_MS = 300;

function choose(
  state: LudoState,
  level: "easy" | "medium" | "hard",
  rng: Rng = NO_CHANCE,
  rules: typeof ludo = ludo,
): LudoMove {
  const chosen = chooseMove(rules, state, {
    level,
    rng,
    // Medium has a fixed depth; Hard stops after a few hundred clock reads past its minimum.
    now: level === "hard" ? ticking(1) : neverExpires(),
    timeLimitMs: 300,
  });
  if (!chosen.ok) throw new Error(chosen.error);
  return chosen.value;
}

/** Every state of a few random games of each size, for properties of `evaluate`. */
function sampleStates(): LudoState[] {
  const states: LudoState[] = [];
  for (const players of [2, 3, 4] as const) {
    for (const seed of [1, 2]) {
      const game = selfPlay(ludo, { seed, players, maxPlies: 5000, options: LUDO_DEFAULT_OPTIONS });
      let state = ludo.setup({ playerCount: players, options: LUDO_DEFAULT_OPTIONS });
      for (const entry of game.entries) {
        states.push(state);
        state = ludo.applyMove(state, entry.move, entry.outcome);
      }
    }
  }
  return states;
}

describe("ludoEvaluate", () => {
  it("is an integer below 10^6 in absolute value in every state of random games", () => {
    for (const state of sampleStates()) {
      for (let seat = 0; seat < state.colours.length; seat += 1) {
        const value = ludoEvaluate(state, seat);
        expect(Number.isInteger(value)).toBe(true);
        expect(Math.abs(value)).toBeLessThan(1_000_000);
      }
    }
  });

  it("is symmetric between two players", () => {
    // Red and Yellow sit opposite: the same progress is the same place, rotated half a turn, so
    // swapping their horses swaps their views.
    const red = [10, 30, OWN_GATE, step(2)];
    const yellow = [3, 45, S, step(4)];
    const state = position({ players: 2, horses: { 0: red, 1: yellow } });
    const mirrored = position({ players: 2, horses: { 0: yellow, 1: red } });

    expect(ludoEvaluate(state, 0)).not.toBe(0);
    expect(ludoEvaluate(state, 0) + ludoEvaluate(state, 1)).toBe(0);
    expect(ludoEvaluate(mirrored, 1)).toBe(ludoEvaluate(state, 0));
    expect(ludoEvaluate(position({ players: 2, horses: { 0: red, 1: red } }), 0)).toBe(0);
  });

  it("rises when a horse of a player who is not leading is kicked (4 players)", () => {
    // Blue leads; Yellow trails with one horse far along.
    const before = position({
      horses: { 0: [5], 1: [step(4), step(3), 40], 2: [S, S, 45], 3: [20] },
    });
    const after = position({ horses: { 0: [5], 1: [step(4), step(3), 40], 3: [20] } });

    expect(ludoEvaluate(after, 0)).toBeGreaterThan(ludoEvaluate(before, 0));
  });

  // A Blue and a Yellow horse at the same progress are worth the same: swapping them keeps the
  // mean of the other players, and only where they stand changes.
  it.each([
    ["3 cells behind", 3],
    ["6 cells behind", 0],
  ])("scores a horse lower with an opponent's horse %s than safe", (_what, progress) => {
    // Red's horse on cell 20; Blue's progress `progress` is cell 14 + progress, Yellow's is 28 +.
    const threatened = position({ horses: { 0: [20], 1: [progress] } });
    const safe = position({ horses: { 0: [20], 2: [progress] } });

    expect(cellOf(Blue, progress)).toBeLessThan(20);
    expect(ludoEvaluate(threatened, 0)).toBeLessThan(ludoEvaluate(safe, 0));
  });

  it("scores a horse on a gate lower with an opponent 9 cells behind and the way clear", () => {
    // Progress 27 is Yellow's gate: a Blue horse 9 cells behind jumps onto it with a 1.
    const threatened = position({ horses: { 0: [27], 1: [4] } });
    const safe = position({ horses: { 0: [27], 3: [4] } });

    expect(cellOf(Blue, 4)).toBe(18);
    expect(ludoEvaluate(threatened, 0)).toBeLessThan(ludoEvaluate(safe, 0));
  });

  it("scores a horse on the start cell of an opponent with horses in the stable lower", () => {
    // Red's progress 42 is Green's start cell; Green plays only with four players.
    const threatened = position({ players: 4, horses: { 0: [42] } });
    const safe = position({ players: 3, horses: { 0: [42] } });

    expect(ludoEvaluate(threatened, 0)).toBeLessThan(ludoEvaluate(safe, 0));
  });

  it("rates steps 1 and 2 far below step 3", () => {
    const at = (progress: number) =>
      ludoEvaluate(position({ players: 2, horses: { 0: [progress] } }), 0);

    expect(at(step(3)) - at(step(2))).toBeGreaterThan(5 * (at(step(2)) - at(OWN_GATE)));
    expect(at(step(1))).toBeGreaterThan(at(OWN_GATE));
  });
});

describe("Máy chơi Cờ cá ngựa", () => {
  it("rolls when its turn starts, at every level", () => {
    for (const level of ["easy", "medium", "hard"] as const) {
      expect(choose(position({ horses: { 0: [10] } }), level)).toEqual({ type: "roll" });
    }
  });

  it("Máy chọn nước thắng: the winning move is the only one under the default rules", () => {
    const state = position({ horses: { 0: [step(4), step(5), step(6), step(2)] }, die: 3 });

    expect(ludo.legalMoves(state)).toEqual([{ type: "move", horse: 3 }]);
    expect(choose(state, "medium")).toEqual({ type: "move", horse: 3 });
  });

  it("Máy chọn nước thắng over another move (test-only passing variant)", () => {
    // Gate → step 5 over steps 3 and 4 wins; step 4 → 5 does not.
    const state = position({
      horses: { 0: [step(3), step(4), step(6), OWN_GATE] },
      die: 5,
      options: { passing: "free" },
    });

    expect(ludoVariantRules.legalMoves(state)).toHaveLength(2);
    expect(choose(state, "medium", NO_CHANCE, ludoVariantRules)).toEqual({
      type: "move",
      horse: 3,
    });
  });

  it.each(["medium", "hard"] as const)("Máy đá ngựa đối thủ (%s)", (level) => {
    // Red rolled 3: horse 0 kicks Yellow's horse 40 cells along; horse 1 has an empty cell ahead.
    const state = position({
      players: 2,
      horses: { 0: [9, 30], 1: [seenFromRed(Yellow, 12)] },
      die: 3,
    });

    expect(state.horses[1]).toEqual([40, S, S, S]);
    expect(choose(state, level)).toEqual({ type: "move", horse: 0 });
  });

  it.each(["medium", "hard"] as const)("Máy đá ngựa của người không dẫn đầu (%s)", (level) => {
    // Blue leads, Green second, Yellow third (one horse 40 cells along), Red last.
    const state = position({
      horses: {
        0: [9, 2],
        1: [step(3), step(4)],
        2: [seenFromRed(Yellow, 12)],
        3: [45, 30],
      },
      die: 3,
    });

    expect(state.horses[2]).toEqual([40, S, S, S]);
    expect(choose(state, level)).toEqual({ type: "move", horse: 0 });
  });

  // A kick is worth as much with four players as with two: not averaged away (design §6).
  it.each([
    [10, "medium"],
    [20, "medium"],
    [10, "hard"],
    [20, "hard"],
  ] as const)(
    "kicks a Blue horse %i squares along rather than bring a horse out, with four players (%s)",
    (blueProgress, level) => {
      // Red rolled 6: horse 0 lands on the Blue horse, or one of the others comes out.
      const redProgress = progressAt(Red, cellOf(Blue, blueProgress)) - 6;
      const state = position({ horses: { 0: [redProgress], 1: [blueProgress] }, die: 6 });

      expect(ludo.legalMoves(state)).toHaveLength(4);
      expect(choose(state, level)).toEqual({ type: "move", horse: 0 });
    },
  );

  it.each(["medium", "hard"] as const)(
    "kicks rather than climb from its gate to step 6, with four players (%s)",
    (level) => {
      const redProgress = progressAt(Red, cellOf(Blue, 10)) - 6;
      const state = position({ horses: { 0: [redProgress, OWN_GATE], 1: [10] }, die: 6 });

      expect(choose(state, level)).toEqual({ type: "move", horse: 0 });
    },
  );

  it.each(["medium", "hard"] as const)("Máy ưu tiên lên chuồng hơn ra quân (%s)", (level) => {
    const state = position({ horses: { 0: [OWN_GATE, S, S, S] }, die: 6 });

    expect(ludo.legalMoves(state)).toHaveLength(4);
    expect(choose(state, level)).toEqual({ type: "move", horse: 0 });
  });

  it("Easy and Medium choose differently when a horse risks being kicked next turn", () => {
    // Yellow (the AI) rolled 4. Its horse 0 stands 2 cells ahead of Red's horse 1. Easy only
    // weighs the position after its move: horse 0 stays exposed either way (2 or 6 cells ahead),
    // so it advances horse 2. Medium looks at Red's next roll: with a 6, Red would rather take its
    // horse from its gate up to step 6 than kick, so moving horse 0 six cells ahead is safe.
    const state = position({
      players: 2,
      horses: { 0: [OWN_GATE, 30], 1: [4, S, 31] },
      toMove: 1,
      die: 4,
    });

    expect(choose(state, "easy")).toEqual({ type: "move", horse: 2 });
    expect(choose(state, "medium")).toEqual({ type: "move", horse: 0 });
  });

  it("Easy sometimes plays a move that is not the best", () => {
    const state = position({
      players: 2,
      horses: { 0: [9, 30], 1: [seenFromRed(Yellow, 12)] },
      die: 3,
    });
    const picks = new Set<number>();
    for (let seed = 1; seed <= 40; seed += 1) {
      const move = choose(state, "easy", createRng(seed));
      if (move.type === "move") picks.add(move.horse);
    }

    expect(picks).toEqual(new Set([0, 1]));
  });

  it.each([4, 2] as const)(
    "Máy mức Khó với bốn người: answers within the time limit on a real clock (%i players)",
    (players) => {
      const game = selfPlay(ludo, {
        seed: 3,
        players,
        maxPlies: 5000,
        options: LUDO_DEFAULT_OPTIONS,
      });
      let state = ludo.setup({ playerCount: players, options: LUDO_DEFAULT_OPTIONS });
      for (const [index, entry] of game.entries.entries()) {
        if (index > 300 && state.die !== null && ludo.legalMoves(state).length >= 3) break;
        state = ludo.applyMove(state, entry.move, entry.outcome);
      }
      expect(ludo.legalMoves(state).length).toBeGreaterThanOrEqual(3);

      // Counts the searches started at the root: one per depth (iterative deepening).
      let rootMoves = 0;
      const root = state;
      const counted = {
        ...ludo,
        applyMove: (
          current: LudoState,
          move: LudoMove,
          outcome?: Parameters<typeof ludo.applyMove>[2],
        ) => {
          if (current === root) rootMoves += 1;
          return ludo.applyMove(current, move, outcome);
        },
      };
      const started = performance.now();
      const chosen = chooseMove(counted, state, {
        level: "hard",
        rng: createRng(1),
        now: () => performance.now(),
        timeLimitMs: HARD_LIMIT_MS,
      });
      const elapsed = performance.now() - started;

      expect(chosen.ok).toBe(true);
      expect(elapsed).toBeLessThan(HARD_LIMIT_MS + 200);
      const depth = Math.floor(rootMoves / ludo.legalMoves(state).length);
      console.info(
        `[ludo AI] Hard, ${players} players: ${elapsed.toFixed(0)} ms, depth reached ≥ ${depth}`,
      );
    },
    10_000,
  );
});
