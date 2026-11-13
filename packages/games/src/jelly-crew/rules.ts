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
  JELLY_CREW_ACTION,
  JELLY_CREW_BLOCKED,
  JELLY_CREW_DIRECTIONS,
  JELLY_CREW_GROUPS,
  JELLY_CREW_MAP,
  JELLY_CREW_MAPS,
  JELLY_CREW_MAX_MOVES,
  JELLY_CREW_REASON,
  type JellyCrewAction,
  type JellyCrewDirection,
  type JellyCrewMapId,
  type JellyCrewMove,
  type JellyCrewSeatDigit,
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

export function isJellyCrewDirection(action: JellyCrewAction): action is JellyCrewDirection {
  return JELLY_CREW_DIRECTIONS.some((direction) => direction === action);
}

/** The move of `seat` doing `action`. */
export function jellyCrewMove(seat: PlayerIndex, action: JellyCrewAction): JellyCrewMove {
  return `${String(seat) as JellyCrewSeatDigit}${action}`;
}

/** The seat a move names and what it does. */
export function jellyCrewMoveParts(move: JellyCrewMove): {
  readonly seat: PlayerIndex;
  readonly action: JellyCrewAction;
} {
  return { seat: Number(move[0]), action: move.slice(1) as JellyCrewAction };
}

/**
 * What a step of `seat` towards `direction` would do, or why it cannot be taken: what the rules
 * decide and what a disabled direction says come from this one function.
 */
export function jellyCrewTryStep(
  state: JellyCrewState,
  seat: PlayerIndex,
  direction: JellyCrewDirection,
): JellyCrewStep {
  if (state.result !== null) return { ok: false, blocked: JELLY_CREW_BLOCKED.Over };
  return jellyCrewStep(jellyCrewLayoutOf(state), state.board, seat, direction);
}

/** The group of the plate the seat's character stands on, if it does. */
export function jellyCrewHolding(state: JellyCrewState, seat: PlayerIndex) {
  const cell = state.board.chars[seat];
  return cell === undefined ? undefined : jellyCrewLayoutOf(state).plates.get(cell);
}

function news(
  layout: JellyCrewLayout,
  seat: PlayerIndex,
  action: JellyCrewAction,
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
    action,
    pushed,
    opened: JELLY_CREW_GROUPS.filter((group) => openAfter.has(group) && !openBefore.has(group)),
    closed: JELLY_CREW_GROUPS.filter((group) => openBefore.has(group) && !openAfter.has(group)),
    molds: moldsAfter.fitted === moldsBefore.fitted ? null : moldsAfter,
  };
}

/** Counts the move, and ends the game at the safety limit if the molds are not full. */
function counted(state: JellyCrewState): JellyCrewState {
  const moves = state.moves + 1;
  const result = state.result ?? (moves >= JELLY_CREW_MAX_MOVES ? JELLY_CREW_REASON.TooLong : null);
  return { ...state, moves, result };
}

function apply(state: JellyCrewState, move: JellyCrewMove): JellyCrewState {
  const layout = jellyCrewLayoutOf(state);
  const { seat, action } = jellyCrewMoveParts(move);
  if (isJellyCrewDirection(action)) {
    const step = jellyCrewTryStep(state, seat, action);
    if (!step.ok) throw new Error(`A blocked step: ${step.blocked}`);
    const filled = jellyCrewMolds(layout, step.board);
    return counted({
      ...state,
      board: step.board,
      steps: state.steps + 1,
      last: news(layout, seat, action, state.board, step.board, step.pushedKinds),
      result: filled.fitted === filled.total ? JELLY_CREW_REASON.Filled : null,
    });
  }
  return counted({
    ...state,
    board: layout.start,
    last: news(layout, seat, action, state.board, layout.start, []),
  });
}

export const jellyCrew = {
  id: "jelly-crew",
  meta: {
    players: { min: 2, max: 4 },
    category: GAME_CATEGORY.Original,
    durationMinutes: 15,
    supportsAI: false,
    cooperative: true,
    freePlay: true,
  },
  defaultOptions: JELLY_CREW_DEFAULT_OPTIONS,
  optionChoices: { map: JELLY_CREW_MAPS },
  parseOptions: parseJellyCrewOptions,
  setup: ({ playerCount, options }: SetupContext<JellyCrewOptions>): JellyCrewState => ({
    map: options.map,
    playerCount,
    board: jellyCrewLayout(options.map, playerCount).start,
    steps: 0,
    moves: 0,
    last: null,
    result: null,
  }),
  // Nobody is to move in a game played freely; shared code reads `moverOf` instead.
  currentPlayer: () => 0,
  moverOf: (move) => jellyCrewMoveParts(move).seat,
  legalMoves: (state) => {
    if (state.result !== null) return [];
    const changed = !jellyCrewSameBoard(state.board, jellyCrewLayoutOf(state).start);
    const moves: JellyCrewMove[] = [];
    for (let seat = 0; seat < state.playerCount; seat += 1) {
      for (const direction of JELLY_CREW_DIRECTIONS) {
        if (jellyCrewTryStep(state, seat, direction).ok) moves.push(jellyCrewMove(seat, direction));
      }
      if (changed) moves.push(jellyCrewMove(seat, JELLY_CREW_ACTION.Reset));
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
    if (state.result === JELLY_CREW_REASON.TooLong) {
      return { kind: "draw", reason: JELLY_CREW_REASON.TooLong };
    }
    return null;
  },
  moveKey: (move) => move,
} as const satisfies GameDefinition<JellyCrewState, JellyCrewMove, never, JellyCrewOptions>;
