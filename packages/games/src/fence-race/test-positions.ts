// Test helpers for Cờ rào: positions by cells named as players name them ("C5": column C, row 5
// counted from the bottom), and fences by the cells they stand between. Only the tests import this.
import { createRng, type Rng } from "@board-games/engine";

import type { Fence, FenceRaceCell } from "./board";
import { compareFences } from "./board";
import { fenceRace, type FenceRaceMove, type FenceRaceState } from "./rules";

/** Rows on the board of each number of players. */
function rowsOf(players: number): number {
  return players === 2 ? 11 : 9;
}

/** The cell named `name` ("C5") on the board of `players` players. */
export function cell(name: string, players = 2): FenceRaceCell {
  const col = name.charCodeAt(0) - "A".charCodeAt(0);
  return { row: rowsOf(players) - Number(name.slice(1)), col };
}

/** A fence between rows `low` and `low + 1` (counted from the bottom), columns `left` and the next. */
export function rowFence(low: number, left: string, players = 2): Fence {
  const { row, col } = cell(`${left}${low + 1}`, players);
  return { row, col, dir: "h" };
}

/** A fence between column `left` and the next one, over rows `low` and `low + 1`. */
export function colFence(left: string, low: number, players = 2): Fence {
  const { row, col } = cell(`${left}${low + 1}`, players);
  return { row, col, dir: "v" };
}

export interface PositionConfig {
  readonly players?: number;
  readonly pawns?: readonly (string | undefined)[];
  readonly fences?: readonly Fence[];
  readonly fencesLeft?: readonly number[];
  readonly breaksLeft?: readonly number[];
  readonly toMove?: number;
  readonly moveCount?: number;
}

/** A position of an unfinished game: the start of a game with what `config` changes. */
export function position({
  players = 2,
  pawns,
  fences = [],
  fencesLeft,
  breaksLeft,
  toMove = 0,
  moveCount = 0,
}: PositionConfig = {}): FenceRaceState {
  const start = fenceRace.setup({ playerCount: players, options: {} });
  return {
    ...start,
    pawns: start.pawns.map((pawn, seat) => {
      const name = pawns?.[seat];
      return name === undefined ? pawn : cell(name, players);
    }),
    fences: [...fences].sort(compareFences),
    fencesLeft: fencesLeft ?? start.fencesLeft,
    breaksLeft: breaksLeft ?? start.breaksLeft,
    toMove,
    moveCount,
  };
}

export function stepTo(name: string, players = 2): FenceRaceMove {
  return { kind: "step", ...cell(name, players) };
}

export function legalKeys(state: FenceRaceState): readonly string[] {
  return fenceRace.legalMoves(state).map(fenceRace.moveKey);
}

export interface RandomGame {
  readonly moves: readonly FenceRaceMove[];
  /** Every state of the game, the first and the last included. */
  readonly states: readonly FenceRaceState[];
}

/** A whole game of random legal moves, half of them fences while there are any to place. */
export function randomGame(seed: number, players: number): RandomGame {
  const rng: Rng = createRng(seed);
  const moves: FenceRaceMove[] = [];
  let state = fenceRace.setup({ playerCount: players, options: {} });
  const states = [state];
  while (state.result === null) {
    const legal = fenceRace.legalMoves(state);
    const fences = legal.filter((move) => move.kind === "fence");
    const pool = fences.length > 0 && rng.nextFloat() < 0.5 ? fences : legal;
    const move = pool[rng.nextInt(0, pool.length - 1)];
    if (move === undefined) throw new Error("An unfinished game with no legal move");
    moves.push(move);
    state = fenceRace.applyMove(state, move);
    states.push(state);
  }
  return { moves, states };
}
