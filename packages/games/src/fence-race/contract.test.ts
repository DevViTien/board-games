import {
  createRng,
  createSession,
  currentState,
  fromRecord,
  playMove,
  RECORD_VERSION,
} from "@board-games/engine";
import { describeGameContract } from "@board-games/engine/testing";
import { describe, expect, it } from "vitest";

import { fenceInTheWay, fenceRaceDistance } from "./board";
import { fenceRace, type FenceRaceMove, type FenceRaceState } from "./rules";
import { randomGame } from "./test-positions";

// A game ends within 200 moves (198 with three players), whatever is played.
describeGameContract(fenceRace, { seeds: [1, 2, 3], maxPlies: 200, timeout: 20_000 });

const GAMES_PER_SIZE = 100;
const PLAYER_COUNTS = [2, 3, 4] as const;

/** The way to the gate, for every seat, is what the rules promise after any move. */
function everyoneHasAWay(state: FenceRaceState): boolean {
  return state.pawns.every((_pawn, seat) => fenceRaceDistance(state, seat) >= 0);
}

describe("Ván ngẫu nhiên kết thúc", { timeout: 60_000 }, () => {
  it.each(PLAYER_COUNTS)(
    `${GAMES_PER_SIZE} random games of %i players all end, and a record rebuilds each`,
    (players) => {
      for (let seed = 1; seed <= GAMES_PER_SIZE; seed += 1) {
        const { moves, states } = randomGame(seed * 1000 + players, players);
        const last = states.at(-1);
        if (last === undefined) throw new Error("A game without a state");
        expect(fenceRace.result(last), `seed ${seed}`).not.toBeNull();
        expect(moves.length).toBeLessThanOrEqual(players === 3 ? 198 : 200);
        expect(states.every(everyoneHasAWay), `seed ${seed}`).toBe(true);

        const record = {
          version: RECORD_VERSION,
          gameId: fenceRace.id,
          playerCount: players,
          options: {},
          entries: moves.map((move) => ({ move })),
        };
        // As a room stores it.
        const rebuilt = fromRecord(fenceRace, JSON.parse(JSON.stringify(record)));
        if (!rebuilt.ok) throw new Error(`${rebuilt.error} (seed ${seed})`);
        expect(currentState(rebuilt.value)).toEqual(last);
      }
    },
  );
});

describe("the fences of a game", () => {
  it("never overlap or cross, and stay sorted", () => {
    for (const players of PLAYER_COUNTS) {
      for (const state of randomGame(7 + players, players).states) {
        state.fences.forEach((fence, index) => {
          const others = state.fences.filter((_other, at) => at !== index);
          expect(fenceInTheWay(others, fence)).toBeNull();
        });
        const sorted = [...state.fences].sort(
          (a, b) => a.row - b.row || a.col - b.col || a.dir.localeCompare(b.dir),
        );
        expect(state.fences).toEqual(sorted);
      }
    }
  });

  it("never have more placed than players were given", () => {
    for (const players of PLAYER_COUNTS) {
      for (const state of randomGame(11 + players, players).states) {
        for (const left of state.fencesLeft) expect(left).toBeGreaterThanOrEqual(0);
        for (const left of state.breaksLeft) expect(left).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("the session and the record", () => {
  it("play the same game as the rules alone", () => {
    const rng = createRng(5);
    const started = createSession(fenceRace, { playerCount: 3, options: {} });
    if (!started.ok) throw new Error(started.error);
    let session = started.value;
    for (let ply = 0; ply < 30; ply += 1) {
      const legal: readonly FenceRaceMove[] = fenceRace.legalMoves(currentState(session));
      const move = legal[rng.nextInt(0, legal.length - 1)];
      if (move === undefined) throw new Error("no move");
      const played = playMove(fenceRace, session, move, rng);
      if (!played.ok) throw new Error(played.error);
      session = played.value;
    }
    expect(currentState(session).moveCount).toBe(30);
  });
});
