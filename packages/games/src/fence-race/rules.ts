import {
  GAME_CATEGORY,
  type GameDefinition,
  type GameResult,
  type PlayerIndex,
  type SetupContext,
} from "@board-games/engine";

import { fenceRaceCandidateMoves, fenceRaceEvaluate } from "./ai";
import {
  compareFences,
  distancesWithFence,
  type EdgeTable,
  edgeTable,
  type Fence,
  type FenceDirection,
  type FenceInTheWay,
  fenceInTheWay,
  type FenceRaceCell,
  fenceRaceDistance,
  fenceRaceIsGoal,
  fenceRaceStartCell,
  openSteps,
  sameFence,
  searchWay,
  setFence,
  waysOnEdges,
} from "./board";
import {
  FENCE_RACE_BREAKS,
  FENCE_RACE_ISSUE,
  FENCE_RACE_REASON,
  fenceRaceMoveLimit,
  fenceRaceTable,
} from "./constants";

export interface FenceRaceState {
  readonly rows: number;
  readonly columns: number;
  /** By seat; their number is the number of players. */
  readonly pawns: readonly FenceRaceCell[];
  /** Always in the order of `compareFences`, so a game replayed gives the very same state. */
  readonly fences: readonly Fence[];
  readonly fencesLeft: readonly number[];
  readonly breaksLeft: readonly number[];
  readonly toMove: PlayerIndex;
  /** Moves played by everyone. */
  readonly moveCount: number;
  /** The cell the pawn just left, if the last move was a step; for the board's marker. */
  readonly lastFrom: FenceRaceCell | null;
  /** The fence just broken, if the last move was a break: `fenceRaceEvaluate` looks at it. */
  readonly lastBroken: Fence | null;
  /** Found once, by the move that ended the game: `result` is asked at every node of a search. */
  readonly result: GameResult | null;
}

export type FenceRaceMove =
  | { readonly kind: "step"; readonly row: number; readonly col: number }
  | {
      readonly kind: "fence" | "break";
      readonly row: number;
      readonly col: number;
      readonly dir: FenceDirection;
    };

/** Both, to check data from outside against. */
const DIRECTIONS: readonly string[] = ["h", "v"];
/** The first letter of the key of a move about a fence. */
const FENCE_MOVE_KEYS: ReadonlyMap<string, string> = new Map([
  ["fence", "f"],
  ["break", "b"],
]);

/** Why a fence may not be placed, in the words of the board's preview. */
export type FenceRaceFenceIssue =
  | { readonly code: typeof FENCE_RACE_ISSUE.NoFences | typeof FENCE_RACE_ISSUE.OutOfBoard }
  | FenceInTheWay
  | {
      readonly code: typeof FENCE_RACE_ISSUE.Seals;
      /** Who would have no way left. */
      readonly seats: readonly PlayerIndex[];
    };

/**
 * Why the player to move may not place `fence`, or `null` if they may: the source of the reasons the
 * preview shows. `legalMoves` has its own optimised way, sharing `fenceInTheWay` and the search for
 * ways; `legal-moves.test.ts` keeps the two in step.
 */
export function fenceRaceFenceIssue(
  state: FenceRaceState,
  fence: Fence,
): FenceRaceFenceIssue | null {
  if ((state.fencesLeft[state.toMove] ?? 0) <= 0) return { code: FENCE_RACE_ISSUE.NoFences };
  const { row, col, dir } = fence;
  if (
    !Number.isInteger(row) ||
    !Number.isInteger(col) ||
    !DIRECTIONS.includes(dir) ||
    row < 0 ||
    col < 0 ||
    row > state.rows - 2 ||
    col > state.columns - 2
  ) {
    return { code: FENCE_RACE_ISSUE.OutOfBoard };
  }
  const inTheWay = fenceInTheWay(state.fences, fence);
  if (inTheWay !== null) return inTheWay;
  const table = edgeTable(state);
  setFence(table, state.columns, fence, 1);
  const seats = state.pawns.flatMap((_pawn, seat) =>
    searchWay(table, state, seat).distance < 0 ? [seat] : [],
  );
  return seats.length === 0 ? null : { code: FENCE_RACE_ISSUE.Seals, seats };
}

/** The steps the player to move can take. */
function stepMoves(table: EdgeTable, state: FenceRaceState): readonly FenceRaceMove[] {
  return openSteps(table, state, state.toMove).map((cell) => ({ kind: "step", ...cell }));
}

function fenceMoves(table: EdgeTable, state: FenceRaceState): readonly FenceRaceMove[] {
  const moves: FenceRaceMove[] = [];
  const ways = waysOnEdges(table, state);
  for (let row = 0; row <= state.rows - 2; row += 1) {
    for (let col = 0; col <= state.columns - 2; col += 1) {
      for (const dir of ["h", "v"] as const) {
        const fence = { row, col, dir };
        if (fenceInTheWay(state.fences, fence) !== null) continue;
        if (distancesWithFence(table, state, ways, fence) === null) continue;
        moves.push({ kind: "fence", ...fence });
      }
    }
  }
  return moves;
}

/** The result at the turn limit: the nearest to their gate wins; two or more nearest draw. */
function turnLimitResult(state: FenceRaceState): GameResult {
  const distances = state.pawns.map((_pawn, seat) => fenceRaceDistance(state, seat));
  const nearest = Math.min(...distances);
  const winners = distances.flatMap((distance, seat) => (distance === nearest ? [seat] : []));
  return winners.length === 1
    ? { kind: "win", winners, reason: FENCE_RACE_REASON.TurnLimit }
    : { kind: "draw", reason: FENCE_RACE_REASON.TurnLimit };
}

/** The state after `move`, before asking whether the game is over. */
function played(state: FenceRaceState, move: FenceRaceMove): FenceRaceState {
  const mover = state.toMove;
  const base = {
    ...state,
    toMove: (mover + 1) % state.pawns.length,
    moveCount: state.moveCount + 1,
    lastFrom: null,
    lastBroken: null,
  };
  if (move.kind === "step") {
    return {
      ...base,
      pawns: state.pawns.map((pawn, seat) =>
        seat === mover ? { row: move.row, col: move.col } : pawn,
      ),
      lastFrom: state.pawns[mover] ?? null,
    };
  }
  const fence = { row: move.row, col: move.col, dir: move.dir };
  const less = (left: number, seat: PlayerIndex) => (seat === mover ? left - 1 : left);
  return move.kind === "fence"
    ? {
        ...base,
        fences: [...state.fences, fence].sort(compareFences),
        fencesLeft: state.fencesLeft.map(less),
      }
    : {
        ...base,
        fences: state.fences.filter((other) => !sameFence(other, fence)),
        breaksLeft: state.breaksLeft.map(less),
        lastBroken: fence,
      };
}

export const fenceRace = {
  id: "fence-race",
  meta: {
    players: { min: 2, max: 4 },
    category: GAME_CATEGORY.Original,
    durationMinutes: 15,
    supportsAI: true,
  },
  defaultOptions: {},
  setup: ({ playerCount }: SetupContext<Record<string, never>>): FenceRaceState => {
    const { rows, columns, fences, sides } = fenceRaceTable(playerCount);
    return {
      rows,
      columns,
      pawns: sides.map((side) => fenceRaceStartCell(side, rows, columns)),
      fences: [],
      fencesLeft: sides.map(() => fences),
      breaksLeft: sides.map(() => FENCE_RACE_BREAKS),
      toMove: 0,
      moveCount: 0,
      lastFrom: null,
      lastBroken: null,
      result: null,
    };
  },
  currentPlayer: (state) => state.toMove,
  legalMoves: (state) => {
    if (state.result !== null) return [];
    const table = edgeTable(state);
    const moves = [...stepMoves(table, state)];
    if ((state.fencesLeft[state.toMove] ?? 0) > 0) moves.push(...fenceMoves(table, state));
    if ((state.breaksLeft[state.toMove] ?? 0) > 0) {
      for (const fence of state.fences) moves.push({ kind: "break", ...fence });
    }
    return moves;
  },
  applyMove: (state, move) => {
    const next = played(state, move);
    if (move.kind === "step" && fenceRaceIsGoal(next, state.toMove, move.row, move.col)) {
      return {
        ...next,
        result: { kind: "win", winners: [state.toMove], reason: FENCE_RACE_REASON.Goal },
      };
    }
    return next.moveCount >= fenceRaceMoveLimit(next.pawns.length)
      ? { ...next, result: turnLimitResult(next) }
      : next;
  },
  result: (state) => state.result,
  evaluate: fenceRaceEvaluate,
  candidateMoves: fenceRaceCandidateMoves,
  // A move from outside may be anything: throwing says it matches no legal move (`findLegalMove`).
  moveKey: (move) => {
    if (!Number.isInteger(move.row) || !Number.isInteger(move.col)) throw new Error("Not a move");
    if (move.kind === "step") return `s:${move.row}:${move.col}`;
    const prefix = FENCE_MOVE_KEYS.get(move.kind);
    if (prefix === undefined || !DIRECTIONS.includes(move.dir)) throw new Error("Not a move");
    return `${prefix}:${move.dir}:${move.row}:${move.col}`;
  },
} as const satisfies GameDefinition<FenceRaceState, FenceRaceMove>;
