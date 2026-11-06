/** The edge of the board a seat starts on. Its goal is the gate on the opposite edge. */
export const FENCE_RACE_SIDE = {
  Bottom: "bottom",
  Top: "top",
  Left: "left",
  Right: "right",
} as const;

export type FenceRaceSide = (typeof FENCE_RACE_SIDE)[keyof typeof FENCE_RACE_SIDE];

const { Bottom, Top, Left, Right } = FENCE_RACE_SIDE;

export interface FenceRaceTable {
  readonly rows: number;
  readonly columns: number;
  /** Fences each player starts with. */
  readonly fences: number;
  /** The edge each seat starts on. */
  readonly sides: readonly FenceRaceSide[];
}

const TWO: FenceRaceTable = { rows: 11, columns: 9, fences: 9, sides: [Bottom, Top] };
/** The seat with nobody opposite goes last: it wins least in any other place (design §3). */
const THREE: FenceRaceTable = { rows: 9, columns: 9, fences: 6, sides: [Bottom, Top, Left] };
const FOUR: FenceRaceTable = { rows: 9, columns: 9, fences: 4, sides: [Bottom, Left, Top, Right] };

/** Board, fences and seats by the number of players. */
export function fenceRaceTable(playerCount: number): FenceRaceTable {
  if (playerCount === 2) return TWO;
  return playerCount === 3 ? THREE : FOUR;
}

/** Breaks each player has in a whole game. */
export const FENCE_RACE_BREAKS = 1;

/** A goal is this many cells, the middle ones of the opposite edge. */
export const FENCE_RACE_GATE_CELLS = 5;

/**
 * Moves of the whole game before the turn limit ends it: 198 with three players, so that everyone
 * has had as many turns.
 */
export function fenceRaceMoveLimit(playerCount: number): number {
  return playerCount === 3 ? 198 : 200;
}

/** Why a game ended, in `GameResult.reason`; the app translates it. */
export const FENCE_RACE_REASON = {
  Goal: "goal",
  TurnLimit: "turn-limit",
} as const;

/** Why a fence may not be placed, in the order a player reads them. */
export const FENCE_RACE_ISSUE = {
  NoFences: "no-fences",
  OutOfBoard: "out-of-board",
  Overlap: "overlap",
  Cross: "cross",
  Seals: "seals",
} as const;
