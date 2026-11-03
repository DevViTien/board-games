import { describe, expect, it } from "vitest";

import { createRng } from "../rng";
import { choiceGame } from "../test-fixtures/choice-game";
import { counterGame } from "../test-fixtures/counter-game";
import { diceRaceAiGame } from "../test-fixtures/dice-race-game";
import { lineGame, linePosition, type LineState } from "../test-fixtures/line-game";
import { rollChooseGame, type RollChooseState } from "../test-fixtures/roll-choose-game";
import { treeGame, type TreeNode } from "../test-fixtures/tree-game";
import { expiresImmediately, neverExpires, ticking } from "../testing/clocks";
import { deepFreeze } from "../testing/deep-freeze";
import type { GameDefinition, PlayerIndex } from "../types";
import { chooseMove, type ChooseMoveOptions } from "./choose-move";
import { AI_LEVEL, type AiLevel } from "./levels";

function options(level: AiLevel, seed = 1, now = neverExpires()): ChooseMoveOptions {
  return { level, rng: createRng(seed), now, timeLimitMs: 1000 };
}

function cellChosen(state: LineState, opts: ChooseMoveOptions): number {
  const chosen = chooseMove(lineGame, state, opts);
  if (!chosen.ok) throw new Error(chosen.error);
  return chosen.value.cell;
}

/** The cells chosen over `seeds` different random sequences. */
function cellsChosen(state: LineState, level: AiLevel, seeds = 40): Set<number> {
  return new Set(
    Array.from({ length: seeds }, (_unused, seed) => cellChosen(state, options(level, seed))),
  );
}

const ALL_LEVELS = Object.values(AI_LEVEL);

// X X . / O O . / . . .  — X to move: cell 2 wins, cell 5 blocks O.
const WIN_OR_BLOCK = linePosition("XX.OO....");
// X . . / O O . / X . .  — X to move: no win, cell 5 blocks O.
const MUST_BLOCK = linePosition("X..OO.X..");

describe("chooseMove", () => {
  it.each(ALL_LEVELS)("plays a legal move on an empty cell at level %s", (level) => {
    const state = deepFreeze(linePosition("X...O...."));
    const chosen = chooseMove(lineGame, state, options(level));

    expect(chosen.ok).toBe(true);
    expect(lineGame.legalMoves(state)).toContainEqual(chosen.ok && chosen.value);
  });

  it("refuses a finished game", () => {
    expect(chooseMove(lineGame, linePosition("XXXOO...."), options(AI_LEVEL.Hard))).toEqual({
      ok: false,
      error: "game-over",
    });
  });

  it("refuses a game that does not support the AI", () => {
    expect(chooseMove(counterGame, counterGame.setup(), options(AI_LEVEL.Hard))).toEqual({
      ok: false,
      error: "ai-not-supported",
    });
  });

  it("lets an error thrown by the rules through", () => {
    const broken = {
      ...lineGame,
      evaluate: () => {
        throw new Error("broken rules");
      },
    };

    expect(() => chooseMove(broken, lineGame.setup(), options(AI_LEVEL.Medium))).toThrow(
      "broken rules",
    );
  });

  // These options cross the Worker boundary as plain data, so the types alone do not guard them.
  it("throws on an unknown level", () => {
    for (const level of ["expert", "toString", undefined]) {
      const bad = { ...options(AI_LEVEL.Hard), level: level as AiLevel };
      expect(() => chooseMove(lineGame, lineGame.setup(), bad)).toThrow(RangeError);
    }
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])("throws on a time limit of %s", (limit) => {
    const bad = { ...options(AI_LEVEL.Hard), timeLimitMs: limit };
    expect(() => chooseMove(lineGame, lineGame.setup(), bad)).toThrow(RangeError);
  });

  it("throws on a clock that does not read a finite time", () => {
    const bad = { ...options(AI_LEVEL.Hard), now: () => Number.NaN };
    expect(() => chooseMove(lineGame, lineGame.setup(), bad)).toThrow(RangeError);
  });

  describe("Hard", () => {
    it("takes an immediate win", () => {
      expect(cellsChosen(WIN_OR_BLOCK, AI_LEVEL.Hard)).toEqual(new Set([2]));
    });

    it("blocks the opponent's next-move win", () => {
      expect(cellsChosen(MUST_BLOCK, AI_LEVEL.Hard)).toEqual(new Set([5]));
    });

    it("wins as early as possible", () => {
      // X X . / . O . / . . O  — X to move: cell 2 wins now; 3 and 6 also win, but later.
      expect(cellsChosen(linePosition("XX..O...O"), AI_LEVEL.Hard)).toEqual(new Set([2]));
    });

    it("loses as late as possible when every move loses", () => {
      // X O . / . X . / . . .  — O to move: blocking at 8 loses two moves later than anything else.
      expect(cellsChosen(linePosition("XO..X...."), AI_LEVEL.Hard)).toEqual(new Set([8]));
    });

    it("avoids a move that loses against best play", () => {
      // X . . / . . . / . . .  — O to move: every reply but the centre lets X force a win.
      expect(cellsChosen(linePosition("X........"), AI_LEVEL.Hard, 10)).toEqual(new Set([4]));
    });

    it("picks among equally good opening moves at random", () => {
      expect(cellsChosen(lineGame.setup(), AI_LEVEL.Hard, 8).size).toBeGreaterThan(1);
    });

    it("returns without waiting when it can search to the end of the game", () => {
      // Time never passes, so only reaching the end of the tree can stop Hard. The whole tree of
      // three empty cells takes a few dozen reads; deepening past its end would use them all up.
      const now = neverExpires(100);

      expect([6, 7, 8]).toContain(
        cellChosen(linePosition("XOXOXO..."), { ...options(AI_LEVEL.Hard), now }),
      );
    });
  });

  describe("Medium", () => {
    it("blocks the opponent's immediate win", () => {
      expect(cellsChosen(MUST_BLOCK, AI_LEVEL.Medium)).toEqual(new Set([5]));
    });

    it("prefers its own immediate win to blocking", () => {
      expect(cellsChosen(WIN_OR_BLOCK, AI_LEVEL.Medium)).toEqual(new Set([2]));
    });
  });

  describe("Easy", () => {
    it("sometimes plays the immediate win and sometimes another move", () => {
      const chosen = cellsChosen(WIN_OR_BLOCK, AI_LEVEL.Easy, 60);

      expect(chosen.has(2)).toBe(true);
      expect(chosen.size).toBeGreaterThan(1);
    });
  });

  describe("time limit", () => {
    it.each(ALL_LEVELS)("still returns a legal move when time is up at once (%s)", (level) => {
      const state = lineGame.setup();
      const chosen = chooseMove(lineGame, state, options(level, 3, expiresImmediately()));

      expect(chosen.ok && lineGame.legalMoves(state)).toContainEqual(chosen.ok && chosen.value);
    });

    it.each([AI_LEVEL.Medium, AI_LEVEL.Hard])(
      "still blocks the opponent's immediate win when time is up at once (%s)",
      (level) => {
        for (let seed = 0; seed < 10; seed += 1) {
          expect(cellChosen(MUST_BLOCK, options(level, seed, expiresImmediately()))).toBe(5);
        }
      },
    );

    it("stops at the first node it reaches once the deadline has passed", () => {
      // Counts every call into the rules, and notes the count when the clock first reads past the
      // deadline (its 30th read, well inside the depth-3 search of an empty board).
      let calls = 0;
      const counted = <Args extends unknown[], Value>(rule: (...args: Args) => Value) => {
        return (...args: Args): Value => {
          calls += 1;
          return rule(...args);
        };
      };
      const game = {
        ...lineGame,
        legalMoves: counted(lineGame.legalMoves),
        applyMove: counted(lineGame.applyMove),
        result: counted(lineGame.result),
        evaluate: counted(lineGame.evaluate),
      };
      let reads = 0;
      let callsAtDeadline: number | undefined;
      const now = () => {
        reads += 1;
        if (reads < 30) return 0;
        callsAtDeadline ??= calls;
        return 1000;
      };

      const chosen = chooseMove(game, lineGame.setup(), {
        level: AI_LEVEL.Hard,
        rng: createRng(1),
        now,
        timeLimitMs: 1000,
      });

      expect(chosen.ok).toBe(true);
      expect(callsAtDeadline).toBeDefined();
      expect(calls).toBe(callsAtDeadline);
    });
  });

  describe("reproducibility", () => {
    it.each(ALL_LEVELS)("gives the same move for the same inputs (%s)", (level) => {
      const state = linePosition("X...O....");

      expect(cellChosen(state, options(level, 42))).toBe(cellChosen(state, options(level, 42)));
    });
  });

  describe("random outcomes", () => {
    function choice(winWeight: number, loseWeight: number, seed: number) {
      const state = choiceGame.setup({ playerCount: 2, options: { winWeight, loseWeight } });
      const chosen = chooseMove(choiceGame, state, options(AI_LEVEL.Hard, seed));
      if (!chosen.ok) throw new Error(chosen.error);
      return chosen.value.choice;
    }

    it("gambles when winning is three times likelier than losing", () => {
      expect(choice(3, 1, 1)).toBe("gamble");
    });

    it("plays it safe when losing is three times likelier", () => {
      expect(choice(1, 3, 1)).toBe("safe");
    });

    it("picks either of two equally good moves over different seeds", () => {
      const picks = new Set(Array.from({ length: 30 }, (_unused, seed) => choice(1, 1, seed)));

      expect(picks).toEqual(new Set(["safe", "gamble"]));
    });

    describe("looking past the next player's roll", () => {
      // Seat 0 has rolled 2 halfway through the game: "greedy" scores 4 now, "safe" 2, but seat 1
      // punishes a greedy move whatever it rolls next.
      const rolled: RollChooseState = {
        scores: [5, 5],
        toMove: 0,
        rolled: 2,
        exposed: null,
        turnsLeft: 4,
      };
      /** Never below Easy's chance of a random move: the search always decides. */
      const searching = { nextInt: (min: number) => min, nextFloat: () => 0.99 };

      function chosenAt(level: AiLevel) {
        const chosen = chooseMove(rollChooseGame, rolled, {
          level,
          rng: searching,
          now: neverExpires(),
          timeLimitMs: 1000,
        });
        if (!chosen.ok) throw new Error(chosen.error);
        return chosen.value.type;
      }

      it("plays it safe at Medium, seeing the punishment after the next roll", () => {
        expect(chosenAt(AI_LEVEL.Medium)).toBe("safe");
      });

      it("plays it safe at Hard", () => {
        expect(chosenAt(AI_LEVEL.Hard)).toBe("safe");
      });

      it("takes the points at Easy, which only looks at its own move", () => {
        expect(chosenAt(AI_LEVEL.Easy)).toBe("greedy");
      });
    });

    it.each([2, 3, 4])("plays legal moves in a %i-player dice race at every level", (players) => {
      const state = diceRaceAiGame.setup({ playerCount: players, options: { target: 30 } });
      for (const level of ALL_LEVELS) {
        const chosen = chooseMove(diceRaceAiGame, state, {
          level,
          rng: createRng(players),
          // A dice race never runs out of tree: only the deadline stops Hard. Kept short so that
          // even a search that only looked at the clock between depths would stay small.
          now: ticking(1),
          timeLimitMs: 5,
        });
        expect(chosen).toEqual({ ok: true, value: { type: "roll" } });
      }
    });
  });
});

// Ten moves, of which the game lets the AI consider two: each move adds 1 to 10 to a running total,
// and whoever brings it to RACE_TARGET or more wins. From RACE_START, adding 7 or more wins at once.
const RACE_TARGET = 12;
const RACE_START = 5;

interface RaceState {
  readonly total: number;
  readonly toMove: PlayerIndex;
  readonly winner: PlayerIndex | null;
}

interface RaceMove {
  readonly add: number;
}

const TEN_MOVES: readonly RaceMove[] = Array.from({ length: 10 }, (_unused, index) => ({
  add: index + 1,
}));
const DECLARED: readonly RaceMove[] = [{ add: 1 }, { add: 2 }];

const raceGame = {
  id: "race",
  meta: {
    players: { min: 2, max: 2 },
    category: "original",
    durationMinutes: 1,
    supportsAI: true,
  },
  defaultOptions: {},
  setup: (): RaceState => ({ total: RACE_START, toMove: 0, winner: null }),
  currentPlayer: (state) => state.toMove,
  legalMoves: (state) => (state.winner === null ? TEN_MOVES : []),
  applyMove: (state, move) => {
    const total = state.total + move.add;
    return { total, toMove: 1 - state.toMove, winner: total >= RACE_TARGET ? state.toMove : null };
  },
  result: (state) => (state.winner === null ? null : { kind: "win", winners: [state.winner] }),
  evaluate: () => 0,
  candidateMoves: (state) => (state.winner === null ? DECLARED : []),
} as const satisfies GameDefinition<RaceState, RaceMove>;

function raceMove(game: GameDefinition<RaceState, RaceMove>, opts: ChooseMoveOptions): number {
  const chosen = chooseMove(game, game.setup({ playerCount: 2, options: {} }), opts);
  if (!chosen.ok) throw new Error(chosen.error);
  return chosen.value.add;
}

describe("candidate moves declared by the game", () => {
  it.each(ALL_LEVELS)("only plays a declared move, even past a winning one (%s)", (level) => {
    const chosen = new Set(
      Array.from({ length: 30 }, (_unused, seed) => raceMove(raceGame, options(level, seed))),
    );

    expect([...chosen].every((add) => add === 1 || add === 2)).toBe(true);
  });

  it("returns the rules' own legal move object for a declared move", () => {
    const state = raceGame.setup();
    const chosen = chooseMove(raceGame, state, options(AI_LEVEL.Medium));

    expect(chosen.ok && TEN_MOVES.includes(chosen.value)).toBe(true);
  });

  it.each(ALL_LEVELS)(
    "still plays a legal move when every declared move is illegal (%s)",
    (level) => {
      const broken = { ...raceGame, candidateMoves: () => [{ add: 11 }, { add: 0 }] };

      for (let seed = 0; seed < 10; seed += 1) {
        expect(TEN_MOVES.map((move) => move.add)).toContain(raceMove(broken, options(level, seed)));
      }
    },
  );

  it("considers every legal move when the game declares none", () => {
    // Tic-tac-toe's line game has no candidateMoves: Hard still finds the only block, cell 5.
    expect(cellsChosen(MUST_BLOCK, AI_LEVEL.Hard)).toEqual(new Set([5]));
  });

  it("asks the game at every node of the search, not only at the root", () => {
    const asked: number[] = [];
    const recording = {
      ...raceGame,
      candidateMoves: (state: RaceState) => {
        asked.push(state.total);
        return raceGame.candidateMoves(state);
      },
    };

    raceMove(recording, options(AI_LEVEL.Medium));

    expect(asked.some((total) => total > RACE_START)).toBe(true);
  });

  it.each(ALL_LEVELS)(
    "returns a single declared move at once, without searching or waiting (%s)",
    (level) => {
      const single = { ...raceGame, candidateMoves: () => [{ add: 3 }] };
      // The clock may be read once, for the start of the search: a second read throws.
      for (let seed = 0; seed < 10; seed += 1) {
        expect(raceMove(single, { ...options(level, seed), now: neverExpires(1) })).toBe(3);
      }
    },
  );

  it("still checks the clock before returning a single move", () => {
    const single = { ...raceGame, candidateMoves: () => [{ add: 3 }] };

    expect(() =>
      chooseMove(single, raceGame.setup(), { ...options(AI_LEVEL.Hard), now: () => Number.NaN }),
    ).toThrow(RangeError);
  });

  it("loses as late as possible among the declared moves only (Hard)", () => {
    // Seat 0 to move: move 0 loses at once, move 1 loses two moves later, move 2 draws. Only moves
    // 0 and 1 are declared, so the draw is never considered.
    const lose: TreeNode = { kind: "end", result: { kind: "win", winners: [1] } };
    const only = (node: TreeNode) => ({ random: false, children: [{ weight: 1, node }] });
    const root: TreeNode = {
      kind: "turn",
      player: 0,
      scores: [0, 0],
      moves: [
        only(lose),
        only({
          kind: "turn",
          player: 1,
          scores: [0, 0],
          moves: [only({ kind: "turn", player: 0, scores: [0, 0], moves: [only(lose)] })],
        }),
        only({ kind: "end", result: { kind: "draw" } }),
      ],
    };
    const declared = {
      ...treeGame,
      candidateMoves: (node: TreeNode) => (node === root ? [0, 1] : treeGame.legalMoves(node)),
    };

    for (let seed = 0; seed < 10; seed += 1) {
      expect(chooseMove(declared, root, options(AI_LEVEL.Hard, seed))).toEqual({
        ok: true,
        value: 1,
      });
    }
    // Without the declaration, the draw is the best move.
    expect(chooseMove(treeGame, root, options(AI_LEVEL.Hard))).toEqual({ ok: true, value: 2 });
  });
});
