import { chooseMove, createRng, type Rng } from "@board-games/engine";
import { expiresImmediately, neverExpires } from "@board-games/engine/testing";
import { describe, expect, it } from "vitest";

import { fenceRaceEvaluate } from "./ai";
import {
  edgeTable,
  type Fence,
  fenceRaceDistance,
  fenceRaceWay,
  openSteps,
  sameFence,
} from "./board";
import { fenceRace, type FenceRaceMove, type FenceRaceState } from "./rules";
import { colFence, position, randomGame, rowFence, stepTo } from "./test-positions";

const keyOf = fenceRace.moveKey;

/** Never plays a random move and always takes the first of tied moves. */
const NO_CHANCE: Rng = { nextInt: (min) => min, nextFloat: () => 0.99 };

function choose(
  state: FenceRaceState,
  level: "easy" | "medium" | "hard" = "medium",
): FenceRaceMove {
  const chosen = chooseMove(fenceRace, state, {
    level,
    rng: NO_CHANCE,
    now: level === "hard" ? expiresImmediately() : neverExpires(),
    timeLimitMs: 1500,
  });
  if (!chosen.ok) throw new Error(chosen.error);
  return chosen.value;
}

function sampleStates(): FenceRaceState[] {
  return [2, 3, 4].flatMap((players) =>
    randomGame(players * 31, players).states.filter((state) => state.result === null),
  );
}

/** The steps a break saves the player to move. */
function gainOfBreaking(state: FenceRaceState, fence: Fence): number {
  const without = state.fences.filter((other) => !sameFence(other, fence));
  return (
    fenceRaceDistance(state, state.toMove) -
    fenceRaceDistance({ ...state, fences: without }, state.toMove)
  );
}

/** How many steps each cell is from a seat's pawn, behind the fences on the board. */
function stepsFromPawn(state: FenceRaceState, seat: number): ReadonlyMap<string, number> {
  const table = edgeTable(state);
  const start = state.pawns[seat] ?? { row: 0, col: 0 };
  const steps = new Map([[`${start.row}:${start.col}`, 0]]);
  const waiting = [start];
  for (let from = waiting.shift(); from !== undefined; from = waiting.shift()) {
    const pawns = state.pawns.map((pawn, at) => (at === seat ? from : pawn));
    const here = steps.get(`${from.row}:${from.col}`) ?? 0;
    for (const cell of openSteps(table, { ...state, pawns }, seat)) {
      if (!steps.has(`${cell.row}:${cell.col}`)) {
        steps.set(`${cell.row}:${cell.col}`, here + 1);
        waiting.push(cell);
      }
    }
  }
  return steps;
}

/** Whether a fence closes a step of some shortest way of an opponent of the player to move. */
function closesOpponentsWay(state: FenceRaceState, { row, col, dir }: Fence): boolean {
  const steps =
    dir === "h"
      ? [
          [row, col, row + 1, col],
          [row, col + 1, row + 1, col + 1],
        ]
      : [
          [row, col, row, col + 1],
          [row + 1, col, row + 1, col + 1],
        ];
  return state.pawns.some((_pawn, seat) => {
    if (seat === state.toMove) return false;
    const total = fenceRaceDistance(state, seat);
    const fromPawn = stepsFromPawn(state, seat);
    const toGate = (cell: { row: number; col: number }) =>
      fenceRaceDistance(
        { ...state, pawns: state.pawns.map((pawn, at) => (at === seat ? cell : pawn)) },
        seat,
      );
    return steps.some(([aRow = 0, aCol = 0, bRow = 0, bCol = 0]) => {
      const a = fromPawn.get(`${aRow}:${aCol}`);
      const b = fromPawn.get(`${bRow}:${bCol}`);
      return (
        (a !== undefined && a + 1 + toGate({ row: bRow, col: bCol }) === total) ||
        (b !== undefined && b + 1 + toGate({ row: aRow, col: aCol }) === total)
      );
    });
  });
}

describe("fenceRaceEvaluate", () => {
  it("is an integer within the engine's limits, in every state of random games", () => {
    for (const state of sampleStates()) {
      for (let seat = 0; seat < state.pawns.length; seat += 1) {
        const value = fenceRaceEvaluate(state, seat);
        expect(Number.isInteger(value)).toBe(true);
        expect(Math.abs(value)).toBeLessThan(100_000_000);
      }
    }
  });

  it("grows with the lead, by a hundred a step", () => {
    const even = position();
    const ahead = position({ pawns: ["E2"] });

    expect(fenceRaceEvaluate(ahead, 0) - fenceRaceEvaluate(even, 0)).toBe(100);
    expect(fenceRaceEvaluate(ahead, 1) - fenceRaceEvaluate(even, 1)).toBe(-100);
  });

  it("counts the opponent nearest the gate, not the others", () => {
    const state = position({ players: 4, pawns: ["E1", "E5", "E9", "I5"] });
    const further = position({ players: 4, pawns: ["E1", "E5", "E9", "H5"] });

    // Seat 3 is further on in the second: it goes from 8 steps to 7, past seat 0's own 8.
    expect(fenceRaceDistance(further, 3)).toBe(fenceRaceDistance(state, 3) - 1);
    expect(fenceRaceEvaluate(state, 0) - fenceRaceEvaluate(further, 0)).toBe(0);
  });

  it("is worth forty for a fence more than the other player, ten for a break", () => {
    const state = position();

    expect(
      fenceRaceEvaluate(state, 0) - fenceRaceEvaluate({ ...state, fencesLeft: [8, 9] }, 0),
    ).toBe(40);
    expect(
      fenceRaceEvaluate({ ...state, fencesLeft: [9, 8] }, 0) - fenceRaceEvaluate(state, 0),
    ).toBe(40);
    // With more players, five for one's own, whatever the others have.
    const four = position({ players: 4 });
    expect(
      fenceRaceEvaluate(four, 0) - fenceRaceEvaluate({ ...four, fencesLeft: [3, 4, 4, 4] }, 0),
    ).toBe(5);
    expect(
      fenceRaceEvaluate({ ...four, fencesLeft: [4, 3, 4, 4] }, 0) - fenceRaceEvaluate(four, 0),
    ).toBe(0);
    expect(
      fenceRaceEvaluate(state, 0) - fenceRaceEvaluate({ ...state, breaksLeft: [0, 1] }, 0),
    ).toBe(10);
  });

  it("costs four hundred for every opponent one step from their gate", () => {
    const far = position({ pawns: ["E1", "E3"] });
    const near = position({ pawns: ["E1", "E2"] });

    // One step of lead (100) and the threat (400).
    expect(fenceRaceEvaluate(far, 0) - fenceRaceEvaluate(near, 0)).toBe(500);
  });

  it("does not count a break really played, while the next player can put the fence back", () => {
    const fence = rowFence(1, "E");
    const before = position({ pawns: ["E1", "D11"], fences: [fence] });

    const broken = fenceRace.applyMove(before, { kind: "break", ...fence });

    const standing = { ...before, toMove: 1, breaksLeft: [0, 1] };
    expect(fenceRaceEvaluate(broken, 0)).toBe(fenceRaceEvaluate(standing, 0));
  });

  it("does not count a break just played, while the next player can put the fence back", () => {
    // Seat 0 is closed in by the fence between rows 1 and 2, columns E and F, and just broke it.
    const fence = rowFence(1, "E");
    const standing = position({
      pawns: ["E1", "D11"],
      fences: [fence],
      toMove: 1,
      breaksLeft: [0, 1],
    });
    const broken = { ...standing, fences: [], lastBroken: fence };

    expect(fenceRaceEvaluate(broken, 0)).toBe(fenceRaceEvaluate(standing, 0));
    // With no fence left to put back, it counts.
    const noFences = [9, 0];
    expect(fenceRaceEvaluate({ ...broken, fencesLeft: noFences }, 0)).toBeGreaterThan(
      fenceRaceEvaluate({ ...standing, fencesLeft: noFences }, 0),
    );
    // Only with two players: with more, the search needs no such help.
    const threeFence = rowFence(1, "E", 3);
    const three = position({
      players: 3,
      pawns: ["E1", "D9", "A5"],
      fences: [threeFence],
      toMove: 1,
      breaksLeft: [0, 1, 1],
    });
    expect(fenceRaceEvaluate({ ...three, fences: [], lastBroken: threeFence }, 0)).toBeGreaterThan(
      fenceRaceEvaluate(three, 0),
    );
    // And once somebody has answered it, whatever they did.
    expect(fenceRaceEvaluate({ ...broken, lastBroken: null }, 0)).toBeGreaterThan(
      fenceRaceEvaluate(standing, 0),
    );
  });
});

describe("fenceRace.candidateMoves", () => {
  it("offers only steps along a shortest way", () => {
    const state = position({ fencesLeft: [0, 9], breaksLeft: [0, 1] });

    expect(fenceRace.candidateMoves(state).map(keyOf)).toEqual([keyOf(stepTo("E2"))]);
  });

  it("offers every step along a shortest way when several are equally short", () => {
    // Closed above: left and right are as short as each other.
    const state = position({
      pawns: ["E1", "E11"],
      fences: [rowFence(1, "E")],
      fencesLeft: [0, 9],
      breaksLeft: [0, 1],
    });

    expect(fenceRace.candidateMoves(state).map(keyOf)).toEqual([keyOf(stepTo("D1"))]);
    expect(fenceRaceDistance(state, 0)).toBe(11);
  });

  it("always has a step, and the one reaching the gate", () => {
    for (const state of sampleStates()) {
      const steps = fenceRace.candidateMoves(state).filter((move) => move.kind === "step");
      expect(steps.length).toBeGreaterThan(0);
    }
    const about = position({ pawns: ["E10", "E5"] });
    expect(fenceRace.candidateMoves(about).map(keyOf)).toContain(keyOf(stepTo("E11")));
  });

  it("stays near the limit of about twenty moves on any board", () => {
    for (const state of sampleStates()) {
      expect(fenceRace.candidateMoves(state).length).toBeLessThanOrEqual(25);
    }
  });

  it("orders fences across an opponent's way by the steps they add", () => {
    const state = position({ pawns: ["A1", "E6"] });
    const fences = fenceRace.candidateMoves(state).filter((move) => move.kind === "fence");
    const added = fences.map((fence) => {
      const after = fenceRace.applyMove(state, fence);
      return fenceRaceDistance(after, 1) - fenceRaceDistance(state, 1);
    });

    expect(fences.length).toBeGreaterThan(0);
    // Each fence is across the way the opponent would take, and the first adds no fewer steps than
    // the last.
    expect(added[0]).toBeGreaterThanOrEqual(added.at(-1) ?? 0);
  });

  it("includes every fence that stops an opponent about to arrive", () => {
    const state = position({ players: 4, pawns: ["E1", "H5", "E2", "B5"] });
    const keys = fenceRace.candidateMoves(state).map(keyOf);
    const stops = fenceRace
      .legalMoves(state)
      .filter((move) => move.kind === "fence")
      .filter((fence) => {
        const after = fenceRace.applyMove(state, fence);
        return [1, 2, 3].some(
          (seat) => fenceRaceDistance(state, seat) === 1 && fenceRaceDistance(after, seat) > 1,
        );
      });

    expect(stops.length).toBeGreaterThanOrEqual(6);
    for (const fence of stops) expect(keys).toContain(keyOf(fence));
  });

  it("looks first at the fence that costs the player itself less, of two that add as much", () => {
    let pairs = 0;
    for (let seed = 1; seed <= 30; seed += 1) {
      for (const state of randomGame(seed * 29, 2).states) {
        if (state.result !== null) continue;
        const me = state.toMove;
        const other = 1 - me;
        // Fences that stop an arrival come first whatever they cost.
        if (fenceRaceDistance(state, other) <= 1) continue;
        const scored = fenceRace
          .candidateMoves(state)
          .filter((move) => move.kind === "fence")
          .map((move) => {
            const after = fenceRace.applyMove(state, move);
            return {
              added: fenceRaceDistance(after, other) - fenceRaceDistance(state, other),
              hurt: fenceRaceDistance(after, me) - fenceRaceDistance(state, me),
            };
          });
        for (const [index, first] of scored.entries()) {
          for (const later of scored.slice(index + 1)) {
            if (first.added !== later.added || first.hurt === later.hurt) continue;
            pairs += 1;
            expect(first.hurt).toBeLessThan(later.hurt);
          }
        }
      }
    }
    expect(pairs).toBeGreaterThan(0);
  });

  it("offers only breaks that shorten the player's way by two steps or more", () => {
    // The fence across column E only makes a way one step longer; the wall below costs more.
    const shortOne = position({
      pawns: ["E1", "A11"],
      fences: [rowFence(1, "E")],
    });
    expect(fenceRace.candidateMoves(shortOne).some((move) => move.kind === "break")).toBe(false);

    const wall = position({
      pawns: ["E1", "A11"],
      fences: [rowFence(1, "C"), rowFence(1, "E"), rowFence(1, "G"), rowFence(1, "A")],
    });
    expect(fenceRace.candidateMoves(wall).some((move) => move.kind === "break")).toBe(true);
  });

  it("offers at most three breaks, the most useful first", () => {
    const wall = position({
      pawns: ["E1", "A11"],
      fences: [rowFence(1, "C"), rowFence(1, "E"), rowFence(1, "G"), rowFence(1, "A")],
    });
    const breaks = fenceRace.candidateMoves(wall).filter((move) => move.kind === "break");

    expect(breaks).toHaveLength(3);
    expect(breaks[0]).toEqual({ kind: "break", ...rowFence(1, "E") });
  });
});

describe("Máy chơi Cờ rào", () => {
  it.each(["medium", "hard"] as const)("Đi nước thắng at %s", (level) => {
    const state = position({ pawns: ["E10", "A5"] });

    expect(choose(state, level)).toEqual(stepTo("E11"));
  });

  it("Đi nước thắng along the edge, into the gate", () => {
    const state = position({ pawns: ["B11", "A5"], fencesLeft: [0, 9] });

    expect(choose(state)).toEqual(stepTo("C11"));
  });

  const stopsOpponent = (state: FenceRaceState, move: FenceRaceMove) => {
    expect(move.kind).toBe("fence");
    expect(fenceRaceDistance(fenceRace.applyMove(state, move), 1)).toBeGreaterThan(1);
  };

  it.each(["medium", "hard"] as const)(
    "Chặn đối thủ sắp về đích at %s, with no time left for a deeper search",
    (level) => {
      const state = position({ pawns: ["A1", "E2"] });
      expect(fenceRaceDistance(state, 1)).toBe(1);

      stopsOpponent(state, choose(state, level));
    },
  );

  it("Chặn đối thủ sắp về đích along the edge", () => {
    const state = position({ pawns: ["A1", "B1"] });
    expect(fenceRaceDistance(state, 1)).toBe(1);

    stopsOpponent(state, choose(state));
  });

  it("Đi nước thắng first when it could also block", () => {
    const state = position({ pawns: ["E10", "E2"] });

    expect(choose(state)).toEqual(stepTo("E11"));
  });

  it.each(["medium", "hard"] as const)(
    "plays on at %s when no fence can stop the opponent: a gap one cell wide",
    (level) => {
      // Fences on either side of column E leave no room for a fence across it.
      const state = position({
        pawns: ["A1", "E2"],
        fences: [rowFence(1, "C"), rowFence(1, "F")],
      });
      const stops = fenceRace.legalMoves(state).filter((move) => {
        if (move.kind !== "fence") return false;
        return fenceRaceDistance(fenceRace.applyMove(state, move), 1) > 1;
      });
      expect(stops).toEqual([]);

      const move = choose(state, level);

      expect(fenceRace.legalMoves(state).map(keyOf)).toContain(keyOf(move));
    },
  );

  it("steps when it has no fence left to block with", () => {
    const state = position({ pawns: ["A1", "E2"], fencesLeft: [0, 9], breaksLeft: [0, 1] });

    expect(choose(state).kind).toBe("step");
  });

  it("Máy biết phá rào", () => {
    // Seat 0 has no fence left, walled off from row 2 but for column I: breaking across E saves it
    // six steps, across C–D five, across G–H four. Seat 1 is well ahead, on the same side of the wall.
    const fences = [rowFence(1, "A"), rowFence(1, "C"), rowFence(1, "E"), rowFence(1, "G")];
    const state = position({ pawns: ["E1", "A1"], fences, fencesLeft: [0, 9] });
    expect(fenceRaceDistance(state, 0)).toBe(16);
    expect(fenceRaceDistance(state, 1)).toBe(2);

    for (let seed = 1; seed <= 40; seed += 1) {
      const chosen = chooseMove(fenceRace, state, {
        level: "medium",
        rng: createRng(seed),
        now: neverExpires(),
        timeLimitMs: 0,
      });
      if (!chosen.ok) throw new Error(chosen.error);
      const move = chosen.value;
      expect(move.kind, `seed ${seed}`).toBe("break");
      if (move.kind === "break") {
        expect(gainOfBreaking(state, move), `seed ${seed}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it.each(["medium", "hard"] as const)(
    "Máy không phá rào vô ích: every break %s chooses shortens its own way by two steps or more",
    (level) => {
      let breaks = 0;
      for (let seed = 1; seed <= 40; seed += 1) {
        for (const state of randomGame(seed * 17, 2).states) {
          if (state.result !== null || state.fences.length === 0) continue;
          const seat = state.toMove;
          // With no fence left to spend, a break is the only other thing to do than a step.
          const here = {
            ...state,
            fencesLeft: state.fencesLeft.map((left, at) => (at === seat ? 0 : left)),
          };
          const move = choose(here, level);
          if (move.kind !== "break") continue;
          breaks += 1;
          expect(gainOfBreaking(here, move)).toBeGreaterThanOrEqual(2);
        }
      }
      expect(breaks).toBeGreaterThan(0);
    },
    120_000,
  );

  it.each([2, 3, 4])(
    "Rào của máy chắn đường đối thủ: every fence looked at, with %i players",
    (players) => {
      let fences = 0;
      let addingNothing = 0;
      let stoppingArrival = 0;
      // Random games rarely bring a pawn to its gate: these do, for the fences right at it.
      const gameStart = fenceRace.setup({ playerCount: players, options: {} });
      const atGate = gameStart.pawns.map((_pawn, seat) => {
        const pawns = [...gameStart.pawns];
        const way = fenceRaceWay(gameStart, seat);
        pawns[seat] = way.at(-2) ?? pawns[seat] ?? { row: 0, col: 0 };
        return { ...gameStart, pawns, toMove: (seat + 1) % players };
      });
      const games = Array.from(
        { length: 6 },
        (_game, game) => randomGame((game + 1) * 41 + players, players).states,
      );
      for (const state of [...atGate, ...games.flat()]) {
        if (state.result === null) {
          for (const move of fenceRace.candidateMoves(state)) {
            if (move.kind !== "fence") continue;
            fences += 1;
            expect(closesOpponentsWay(state, move), keyOf(move)).toBe(true);
            const after = fenceRace.applyMove(state, move);
            const others = state.pawns.flatMap((_pawn, seat) =>
              seat === state.toMove ? [] : [seat],
            );
            const stepsBefore = others.map((seat) => fenceRaceDistance(state, seat));
            const stepsAfter = others.map((seat) => fenceRaceDistance(after, seat));
            if (stepsAfter.every((steps, at) => steps === stepsBefore[at])) addingNothing += 1;
            if (stepsBefore.some((steps, at) => steps === 1 && (stepsAfter[at] ?? 0) > 1)) {
              stoppingArrival += 1;
            }
          }
        }
      }
      expect(fences).toBeGreaterThan(1000);
      // The kinds that could break it: a fence that adds no step, one right at a gate.
      expect(addingNothing).toBeGreaterThan(0);
      expect(stoppingArrival).toBeGreaterThan(0);
    },
    120_000,
  );

  it.each(["easy", "medium", "hard"] as const)(
    "Rào của máy chắn đường đối thủ: every fence %s chooses",
    (level) => {
      let chosenFences = 0;
      for (let seed = 1; seed <= 12; seed += 1) {
        for (const state of randomGame(seed * 43, 2 + (seed % 3)).states) {
          if (state.result !== null) continue;
          const chosen = chooseMove(fenceRace, state, {
            level,
            rng: createRng(seed * 1000 + state.moveCount),
            now: level === "hard" ? expiresImmediately() : neverExpires(),
            timeLimitMs: 1500,
          });
          if (!chosen.ok) throw new Error(chosen.error);
          const move = chosen.value;
          if (move.kind !== "fence") continue;
          chosenFences += 1;
          expect(closesOpponentsWay(state, move), keyOf(move)).toBe(true);
        }
      }
      expect(chosenFences).toBeGreaterThan(0);
    },
    180_000,
  );

  it("does not break a fence that does not stand in its way", () => {
    const state = position({
      pawns: ["E1", "A5"],
      fences: [colFence("A", 8)],
      fencesLeft: [0, 9],
    });

    expect(choose(state).kind).toBe("step");
  });

  it("plays every level from the start of a game of each size", () => {
    for (const players of [2, 3, 4]) {
      const state = fenceRace.setup({ playerCount: players, options: {} });
      for (const level of ["easy", "medium", "hard"] as const) {
        const chosen = chooseMove(fenceRace, state, {
          level,
          rng: createRng(players),
          now: level === "hard" ? expiresImmediately() : neverExpires(),
          timeLimitMs: 0,
        });
        expect(chosen.ok).toBe(true);
      }
    }
  });
});
