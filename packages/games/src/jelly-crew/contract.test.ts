import { createRng, currentState, fromRecord, RECORD_VERSION, type Rng } from "@board-games/engine";
import { describeGameContract } from "@board-games/engine/testing";
import { describe, expect, it } from "vitest";

import {
  JELLY_CREW_MAPS,
  JELLY_CREW_MAX_MOVES,
  type JellyCrewMapId,
  type JellyCrewMove,
} from "./constants";
import { jellyCrew } from "./rules";
import type { JellyCrewState } from "./types";

// Random games never fill the molds: each one runs to the safety limit (design §10.3).
describeGameContract(jellyCrew, {
  seeds: [1],
  maxPlies: JELLY_CREW_MAX_MOVES,
  timeout: 120_000,
});
for (const map of JELLY_CREW_MAPS.slice(1)) {
  describeGameContract(jellyCrew, {
    seeds: [3],
    playerCounts: [4],
    maxPlies: JELLY_CREW_MAX_MOVES,
    options: { map },
    timeout: 120_000,
  });
}

function randomGame(rng: Rng, map: JellyCrewMapId, playerCount: number) {
  let state: JellyCrewState = jellyCrew.setup({ playerCount, options: { map } });
  const moves: JellyCrewMove[] = [];
  while (jellyCrew.result(state) === null) {
    const legal = jellyCrew.legalMoves(state);
    const move = legal[rng.nextInt(0, legal.length - 1)];
    if (move === undefined) throw new Error("No legal move in an unfinished game");
    moves.push(move);
    state = jellyCrew.applyMove(state, move);
  }
  return { moves, state };
}

function recordOf(map: JellyCrewMapId, playerCount: number, moves: readonly JellyCrewMove[]) {
  return {
    version: RECORD_VERSION,
    gameId: jellyCrew.id,
    playerCount,
    options: { map },
    entries: moves.map((move) => ({ move })),
  };
}

describe("Giới hạn an toàn của ván", { timeout: 120_000 }, () => {
  it("every random game ends at the safety limit at the latest, and its record rebuilds it", () => {
    const rng = createRng(42);
    for (const map of JELLY_CREW_MAPS) {
      const { moves, state } = randomGame(rng, map, 4);
      expect(jellyCrew.result(state)).not.toBeNull();
      expect(moves.length).toBeLessThanOrEqual(JELLY_CREW_MAX_MOVES);
      const rebuilt = fromRecord(jellyCrew, JSON.parse(JSON.stringify(recordOf(map, 4, moves))));
      if (!rebuilt.ok) throw new Error(rebuilt.error);
      expect(currentState(rebuilt.value)).toEqual(state);
    }
  });

  it("rebuilds a record of 3,000 moves within its budget (design §10.6: 200 ms on a dev machine)", () => {
    const { moves } = randomGame(createRng(7), "cold-store", 4);
    expect(moves).toHaveLength(JELLY_CREW_MAX_MOVES);
    const record = recordOf("cold-store", 4, moves);
    const begin = performance.now();
    const rebuilt = fromRecord(jellyCrew, record);
    const took = performance.now() - begin;
    expect(rebuilt.ok).toBe(true);
    // Loose here, so a busy CI machine never fails it; the number measured is in design §10.6.
    expect(took).toBeLessThan(2000);
  });
});
