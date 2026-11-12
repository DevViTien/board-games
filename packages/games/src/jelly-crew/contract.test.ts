import { createRng, currentState, fromRecord, RECORD_VERSION, type Rng } from "@board-games/engine";
import { describeGameContract } from "@board-games/engine/testing";
import { describe, expect, it } from "vitest";

import { JELLY_CREW_MAPS, type JellyCrewMapId, type JellyCrewMove } from "./constants";
import { jellyCrewLayout } from "./layouts";
import { jellyCrew } from "./rules";
import type { JellyCrewState } from "./types";

/** At most 16 moves a turn (design §3): 5 steps, 5 back, 5 again, and the move that ends it. */
const MOVES_PER_TURN = 16;

function moveLimit(map: JellyCrewMapId, playerCount: number): number {
  return MOVES_PER_TURN * jellyCrewLayout(map, playerCount).rounds * playerCount;
}

/** The longest game any layout allows: the contract's limit for every random game. */
const MAX_PLIES = Math.max(
  ...JELLY_CREW_MAPS.flatMap((map) => [2, 3, 4].map((count) => moveLimit(map, count))),
);

describeGameContract(jellyCrew, { seeds: [1, 2], maxPlies: MAX_PLIES, timeout: 30_000 });
for (const map of JELLY_CREW_MAPS.slice(1)) {
  describeGameContract(jellyCrew, {
    seeds: [3],
    maxPlies: MAX_PLIES,
    options: { map },
    timeout: 30_000,
  });
}

function randomGame(rng: Rng, map: JellyCrewMapId, playerCount: number) {
  let state: JellyCrewState = jellyCrew.setup({ playerCount, options: { map } });
  const moves: JellyCrewMove[] = [];
  while (jellyCrew.result(state) === null && moves.length <= moveLimit(map, playerCount)) {
    const legal = jellyCrew.legalMoves(state);
    const move = legal[rng.nextInt(0, legal.length - 1)];
    if (move === undefined) throw new Error("No legal move in an unfinished game");
    moves.push(move);
    state = jellyCrew.applyMove(state, move);
  }
  return { moves, state };
}

describe("Ván luôn hữu hạn", { timeout: 60_000 }, () => {
  it("every random game ends within 16 moves a turn, and its record rebuilds it", () => {
    const rng = createRng(42);
    for (const map of JELLY_CREW_MAPS) {
      for (const playerCount of [2, 3, 4]) {
        for (let game = 0; game < 5; game += 1) {
          const { moves, state } = randomGame(rng, map, playerCount);
          expect(jellyCrew.result(state)).not.toBeNull();
          expect(moves.length).toBeLessThanOrEqual(moveLimit(map, playerCount));
          const record = {
            version: RECORD_VERSION,
            gameId: jellyCrew.id,
            playerCount,
            options: { map },
            entries: moves.map((move) => ({ move })),
          };
          const rebuilt = fromRecord(jellyCrew, JSON.parse(JSON.stringify(record)));
          if (!rebuilt.ok) throw new Error(rebuilt.error);
          expect(currentState(rebuilt.value)).toEqual(state);
        }
      }
    }
  });

  it("rebuilds a record of 1,000 moves well within its budget (design §8: 50 ms on a dev machine)", () => {
    // The longest kind of turn: five steps, five back, five again, then the end of the turn.
    let state: JellyCrewState = jellyCrew.setup({ playerCount: 4, options: { map: "cold-store" } });
    const longest: JellyCrewMove[] = [];
    while (longest.length < 1000) {
      const legal = jellyCrew.legalMoves(state);
      const step = legal.find((move) => move.length === 1);
      const move =
        state.taken < 5 && step !== undefined ? step : legal.includes("back") ? "back" : "end";
      longest.push(move);
      state = jellyCrew.applyMove(state, move);
    }
    const record = {
      version: RECORD_VERSION,
      gameId: jellyCrew.id,
      playerCount: 4,
      options: { map: "cold-store" },
      entries: longest.map((move) => ({ move })),
    };
    const begin = performance.now();
    const rebuilt = fromRecord(jellyCrew, record);
    const took = performance.now() - begin;
    expect(rebuilt.ok).toBe(true);
    // Loose here, so a busy CI machine never fails it; the number measured is in design §8.
    expect(took).toBeLessThan(500);
  });
});
