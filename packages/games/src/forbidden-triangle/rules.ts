import {
  GAME_CATEGORY,
  type GameDefinition,
  type PlayerIndex,
  type SetupContext,
} from "@board-games/engine";

// Tam giác cấm (design of `add-forbidden-triangle-game`): guests around a table, two players
// drawing lines between them in turn, red and blue; whoever closes a triangle of their own colour
// loses. From six guests on, a game cannot end in a draw: R(3,3) = 6.

/** How many guests sit at the table, in the order the setup screen lists them. */
export const FORBIDDEN_TRIANGLE_GUESTS = [5, 6, 7] as const;

export type ForbiddenTriangleGuests = (typeof FORBIDDEN_TRIANGLE_GUESTS)[number];

export interface ForbiddenTriangleOptions {
  readonly guests: ForbiddenTriangleGuests;
}

export const FORBIDDEN_TRIANGLE_DEFAULT_OPTIONS = {
  guests: 6,
} as const satisfies ForbiddenTriangleOptions;

/** Why a game ended by its rules, in `GameResult.reason`; the app translates it. */
export const FORBIDDEN_TRIANGLE_REASON = {
  /** A player closed a triangle of their own colour: the other one wins. */
  Triangle: "triangle",
  /** Every line drawn, no triangle closed: a draw (only five guests allow it). */
  Full: "full",
} as const;

/** A closed triangle: who closed it, and its three guests in increasing order. */
export interface ForbiddenTriangleLoss {
  readonly player: PlayerIndex;
  readonly triangle: readonly [number, number, number];
}

export interface ForbiddenTriangleState {
  readonly guests: ForbiddenTriangleGuests;
  /** One per pair of guests (`pairOf`): the seat whose line it is, or `null` while undrawn. */
  readonly lines: readonly (PlayerIndex | null)[];
  readonly toMove: PlayerIndex;
  /** The line drawn last, or `null` before the first. */
  readonly last: number | null;
  readonly lost: ForbiddenTriangleLoss | null;
}

export interface ForbiddenTriangleMove {
  /** The pair of guests to join (`lineOf`). */
  readonly line: number;
}

function isGuests(value: unknown): value is ForbiddenTriangleGuests {
  return FORBIDDEN_TRIANGLE_GUESTS.some((guests) => guests === value);
}

function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Options from outside: a missing `guests` is the default; anything else unknown is refused. */
export function parseForbiddenTriangleOptions(raw: unknown): ForbiddenTriangleOptions | null {
  if (!isPlainObject(raw)) return null;
  if (Object.keys(raw).some((key) => key !== "guests")) return null;
  const { guests = FORBIDDEN_TRIANGLE_DEFAULT_OPTIONS.guests } = raw;
  return isGuests(guests) ? { guests } : null;
}

/** How many lines a table of `guests` has: one per pair. */
export function lineCount(guests: number): number {
  return (guests * (guests - 1)) / 2;
}

/** The pairs of a table, in the order of `lines`: (0,1), (0,2) … (0,n−1), (1,2) … (n−2,n−1). */
const PAIRS = new Map<number, readonly (readonly [number, number])[]>(
  FORBIDDEN_TRIANGLE_GUESTS.map((guests) => {
    const pairs: (readonly [number, number])[] = [];
    for (let a = 0; a < guests; a += 1) for (let b = a + 1; b < guests; b += 1) pairs.push([a, b]);
    return [guests, pairs];
  }),
);

function pairsOf(guests: number): readonly (readonly [number, number])[] {
  const pairs = PAIRS.get(guests);
  if (pairs === undefined) throw new Error(`No table of ${String(guests)} guests`);
  return pairs;
}

/** The two guests a line joins, the lower first. */
export function pairOf(guests: number, line: number): readonly [number, number] {
  const pair = pairsOf(guests)[line];
  if (pair === undefined) throw new Error(`No line ${String(line)} at ${String(guests)} guests`);
  return pair;
}

/** The line joining guests `a` and `b` (in any order), or -1 if they are the same or not seated. */
export function lineOf(guests: number, a: number, b: number): number {
  if (a === b || a < 0 || b < 0 || a >= guests || b >= guests) return -1;
  const [low, high] = a < b ? [a, b] : [b, a];
  // Lines before row `low`: (guests − 1) + (guests − 2) + … for each earlier guest.
  return low * guests - (low * (low + 1)) / 2 + (high - low - 1);
}

/**
 * The third guest of the triangle `player` would close by drawing `line`, the lowest if several, or
 * `null` if drawing it closes none.
 */
export function closesTriangle(
  state: Pick<ForbiddenTriangleState, "guests" | "lines">,
  player: PlayerIndex,
  line: number,
): number | null {
  const [a, b] = pairOf(state.guests, line);
  for (let c = 0; c < state.guests; c += 1) {
    if (c === a || c === b) continue;
    if (
      state.lines[lineOf(state.guests, a, c)] === player &&
      state.lines[lineOf(state.guests, b, c)] === player
    ) {
      return c;
    }
  }
  return null;
}

/** The undrawn lines `player` may draw without closing a triangle of their own colour. */
export function safeLines(
  state: Pick<ForbiddenTriangleState, "guests" | "lines">,
  player: PlayerIndex,
): number[] {
  const safe: number[] = [];
  state.lines.forEach((owner, line) => {
    if (owner === null && closesTriangle(state, player, line) === null) safe.push(line);
  });
  return safe;
}

function freeLines(state: ForbiddenTriangleState): number[] {
  const free: number[] = [];
  state.lines.forEach((owner, line) => {
    if (owner === null) free.push(line);
  });
  return free;
}

function isOver(state: ForbiddenTriangleState): boolean {
  return state.lost !== null || state.lines.every((owner) => owner !== null);
}

/** A safe line is worth this much in `evaluate`: the AI's scale asks for an integer. */
const SAFE_LINE_WORTH = 10;

export const forbiddenTriangle = {
  id: "forbidden-triangle",
  meta: {
    players: { min: 2, max: 2 },
    category: GAME_CATEGORY.Classic,
    durationMinutes: 3,
    supportsAI: true,
  },
  defaultOptions: FORBIDDEN_TRIANGLE_DEFAULT_OPTIONS,
  optionChoices: { guests: FORBIDDEN_TRIANGLE_GUESTS },
  parseOptions: parseForbiddenTriangleOptions,
  setup: ({ options }: SetupContext<ForbiddenTriangleOptions>): ForbiddenTriangleState => ({
    guests: options.guests,
    lines: Array.from({ length: lineCount(options.guests) }, () => null),
    toMove: 0,
    last: null,
    lost: null,
  }),
  currentPlayer: (state) => state.toMove,
  legalMoves: (state) => (isOver(state) ? [] : freeLines(state).map((line) => ({ line }))),
  applyMove: (state, { line }) => {
    if (state.lines[line] !== null) throw new Error(`Line ${String(line)} is drawn already`);
    const player = state.toMove;
    const third = closesTriangle(state, player, line);
    const [a, b] = pairOf(state.guests, line);
    const triangle =
      third === null ? null : ([a, b, third].sort((x, y) => x - y) as [number, number, number]);
    return {
      guests: state.guests,
      lines: state.lines.map((owner, at) => (at === line ? player : owner)),
      toMove: 1 - player,
      last: line,
      lost: triangle === null ? null : { player, triangle },
    };
  },
  result: (state) => {
    if (state.lost !== null) {
      return {
        kind: "win",
        winners: [1 - state.lost.player],
        reason: FORBIDDEN_TRIANGLE_REASON.Triangle,
      };
    }
    return state.lines.every((owner) => owner !== null)
      ? { kind: "draw", reason: FORBIDDEN_TRIANGLE_REASON.Full }
      : null;
  },
  // The safe lines one has left against the other's (design §3): whoever runs out on their turn
  // loses, so the search wants to keep its own and use up the opponent's.
  evaluate: (state, player) =>
    (safeLines(state, player).length - safeLines(state, 1 - player).length) * SAFE_LINE_WORTH,
  // The lines that do not lose at once, or every line when none is left. No move wins at once and
  // none stops the opponent winning at once: a player only ever loses by their own move.
  candidateMoves: (state) => {
    if (isOver(state)) return [];
    const safe = safeLines(state, state.toMove);
    return (safe.length > 0 ? safe : freeLines(state)).map((line) => ({ line }));
  },
  moveKey: ({ line }) => String(line),
} as const satisfies GameDefinition<
  ForbiddenTriangleState,
  ForbiddenTriangleMove,
  never,
  ForbiddenTriangleOptions
>;
