import {
  GAME_CATEGORY,
  type GameDefinition,
  type PlayerIndex,
  type SetupContext,
} from "@board-games/engine";

import {
  jellyCrewHeldGroups,
  jellyCrewMolds,
  jellyCrewSameBoard,
  type JellyCrewStep,
  jellyCrewStep,
} from "./board";
import {
  JELLY_CREW_BACKS,
  JELLY_CREW_BLOCKED,
  JELLY_CREW_DIRECTIONS,
  JELLY_CREW_GROUPS,
  JELLY_CREW_MAP,
  JELLY_CREW_MAPS,
  JELLY_CREW_MOVE,
  JELLY_CREW_REASON,
  JELLY_CREW_STEPS,
  type JellyCrewDirection,
  type JellyCrewMapId,
  type JellyCrewMove,
} from "./constants";
import { jellyCrewLayout } from "./layouts";
import type {
  JellyCrewBoard,
  JellyCrewLayout,
  JellyCrewNews,
  JellyCrewOptions,
  JellyCrewState,
} from "./types";

export const JELLY_CREW_DEFAULT_OPTIONS = {
  map: JELLY_CREW_MAP.Kitchen,
} as const satisfies JellyCrewOptions;

function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isMap(value: unknown): value is JellyCrewMapId {
  return JELLY_CREW_MAPS.some((map) => map === value);
}

/** Options from outside: a missing `map` is the default; anything else unknown is refused. */
export function parseJellyCrewOptions(raw: unknown): JellyCrewOptions | null {
  if (!isPlainObject(raw)) return null;
  if (Object.keys(raw).some((key) => key !== "map")) return null;
  const { map = JELLY_CREW_DEFAULT_OPTIONS.map } = raw;
  return isMap(map) ? { map } : null;
}

/** The layout a game is played on. */
export function jellyCrewLayoutOf(state: Pick<JellyCrewState, "map" | "playerCount">) {
  return jellyCrewLayout(state.map, state.playerCount);
}

export function isJellyCrewDirection(move: JellyCrewMove): move is JellyCrewDirection {
  return JELLY_CREW_DIRECTIONS.some((direction) => direction === move);
}

/**
 * What a step of the player to move towards `direction` would do, or why it cannot be taken: what
 * the rules decide and what a disabled direction says come from this one function.
 */
export function jellyCrewTryStep(
  state: JellyCrewState,
  direction: JellyCrewDirection,
): JellyCrewStep {
  if (state.result !== null) return { ok: false, blocked: JELLY_CREW_BLOCKED.Over };
  if (state.taken >= JELLY_CREW_STEPS) return { ok: false, blocked: JELLY_CREW_BLOCKED.NoSteps };
  return jellyCrewStep(jellyCrewLayoutOf(state), state.board, state.turn, direction);
}

/** The round being played, from 1; the last one once the game is over. */
export function jellyCrewRound(state: JellyCrewState): number {
  const { rounds } = jellyCrewLayoutOf(state);
  return Math.min(rounds, Math.floor(state.turnsDone / state.playerCount) + 1);
}

/** The group of the plate the seat's character stands on, if it does. */
export function jellyCrewHolding(state: JellyCrewState, seat: PlayerIndex) {
  const cell = state.board.chars[seat];
  return cell === undefined ? undefined : jellyCrewLayoutOf(state).plates.get(cell);
}

function news(
  layout: JellyCrewLayout,
  seat: PlayerIndex,
  move: JellyCrewMove,
  before: JellyCrewBoard,
  after: JellyCrewBoard,
  pushed: JellyCrewNews["pushed"],
): JellyCrewNews {
  const openBefore = jellyCrewHeldGroups(layout, before);
  const openAfter = jellyCrewHeldGroups(layout, after);
  const moldsBefore = jellyCrewMolds(layout, before);
  const moldsAfter = jellyCrewMolds(layout, after);
  return {
    seat,
    move,
    pushed,
    opened: JELLY_CREW_GROUPS.filter((group) => openAfter.has(group) && !openBefore.has(group)),
    closed: JELLY_CREW_GROUPS.filter((group) => openBefore.has(group) && !openAfter.has(group)),
    molds: moldsAfter.fitted === moldsBefore.fitted ? null : moldsAfter,
  };
}

function endTurn(state: JellyCrewState, layout: JellyCrewLayout): JellyCrewState {
  const turnsDone = state.turnsDone + 1;
  return {
    ...state,
    turn: (state.turn + 1) % state.playerCount,
    taken: 0,
    backs: 0,
    turnsDone,
    turnBoards: [],
    result:
      state.result ??
      (turnsDone >= layout.rounds * state.playerCount ? JELLY_CREW_REASON.OutOfRounds : null),
  };
}

function apply(state: JellyCrewState, move: JellyCrewMove): JellyCrewState {
  const layout = jellyCrewLayoutOf(state);
  const seat = state.turn;
  if (isJellyCrewDirection(move)) {
    const step = jellyCrewTryStep(state, move);
    if (!step.ok) throw new Error(`A blocked step: ${step.blocked}`);
    const from = state.board.chars[seat] ?? -1;
    const to = step.board.chars[seat] ?? -1;
    const trail =
      state.taken === 0 || state.trail?.seat !== seat
        ? { seat, cells: [from, to] }
        : { seat, cells: [...state.trail.cells, to] };
    const filled = jellyCrewMolds(layout, step.board);
    return {
      ...state,
      board: step.board,
      taken: state.taken + 1,
      steps: state.steps + 1,
      turnBoards: [...state.turnBoards, state.board],
      trail,
      last: news(layout, seat, move, state.board, step.board, step.pushedKinds),
      result: filled.fitted === filled.total ? JELLY_CREW_REASON.Filled : null,
    };
  }
  if (move === JELLY_CREW_MOVE.End) {
    return {
      ...endTurn(state, layout),
      last: news(layout, seat, move, state.board, state.board, []),
    };
  }
  if (move === JELLY_CREW_MOVE.Back) {
    const board = state.turnBoards.at(-1);
    if (board === undefined || state.backs >= JELLY_CREW_BACKS) throw new Error("No step back");
    return {
      ...state,
      board,
      taken: state.taken - 1,
      steps: state.steps - 1,
      backs: state.backs + 1,
      turnBoards: state.turnBoards.slice(0, -1),
      trail:
        state.trail === null ? null : { ...state.trail, cells: state.trail.cells.slice(0, -1) },
      last: news(layout, seat, move, state.board, board, []),
    };
  }
  return {
    ...endTurn({ ...state, board: layout.start, trail: null }, layout),
    last: news(layout, seat, move, state.board, layout.start, []),
  };
}

export const jellyCrew = {
  id: "jelly-crew",
  meta: {
    players: { min: 2, max: 4 },
    category: GAME_CATEGORY.Original,
    durationMinutes: 15,
    supportsAI: false,
    cooperative: true,
  },
  defaultOptions: JELLY_CREW_DEFAULT_OPTIONS,
  optionChoices: { map: JELLY_CREW_MAPS },
  parseOptions: parseJellyCrewOptions,
  setup: ({ playerCount, options }: SetupContext<JellyCrewOptions>): JellyCrewState => {
    const layout = jellyCrewLayout(options.map, playerCount);
    return {
      map: options.map,
      playerCount,
      board: layout.start,
      turn: 0,
      taken: 0,
      backs: 0,
      turnsDone: 0,
      steps: 0,
      turnBoards: [],
      trail: null,
      last: null,
      result: null,
    };
  },
  currentPlayer: (state) => state.turn,
  legalMoves: (state) => {
    if (state.result !== null) return [];
    const moves: JellyCrewMove[] = JELLY_CREW_DIRECTIONS.filter(
      (direction) => jellyCrewTryStep(state, direction).ok,
    );
    moves.push(JELLY_CREW_MOVE.End);
    if (state.taken > 0 && state.backs < JELLY_CREW_BACKS) moves.push(JELLY_CREW_MOVE.Back);
    if (!jellyCrewSameBoard(state.board, jellyCrewLayoutOf(state).start)) {
      moves.push(JELLY_CREW_MOVE.Reset);
    }
    return moves;
  },
  applyMove: apply,
  result: (state) => {
    if (state.result === JELLY_CREW_REASON.Filled) {
      return {
        kind: "win",
        winners: Array.from({ length: state.playerCount }, (_, seat) => seat),
        reason: JELLY_CREW_REASON.Filled,
      };
    }
    if (state.result === JELLY_CREW_REASON.OutOfRounds) {
      return { kind: "draw", reason: JELLY_CREW_REASON.OutOfRounds };
    }
    return null;
  },
  moveKey: (move) => move,
} as const satisfies GameDefinition<JellyCrewState, JellyCrewMove, never, JellyCrewOptions>;
