import { jellyCrewSettle } from "./board";
import {
  JELLY_CREW_GROUP,
  JELLY_CREW_KIND,
  type JellyCrewGroup,
  type JellyCrewKind,
  type JellyCrewMapId,
} from "./constants";
import type { JellyCrewLayout, JellyCrewMoldKind, JellyCrewPiece } from "./types";

/** A layout as written in `layouts.ts`: one string a row, and a mold layer of the same size. */
export interface JellyCrewLayoutDefinition {
  readonly map: JellyCrewMapId;
  readonly playerCount: number;
  readonly rows: readonly string[];
  /** `.` no mold, or the kind a mold asks for: `R G Y P S I`. */
  readonly molds: readonly string[];
}

/** The largest layout, walls included: 19 columns still fit a 360 px phone (design §6). */
export const JELLY_CREW_MAX_WIDTH = 19;
export const JELLY_CREW_MAX_HEIGHT = 13;

export const JELLY_CREW_LAYOUT_ERROR = {
  /** Rows of different lengths, or a mold layer not the layout's size. */
  Shape: "shape",
  /** Wider than 19 or higher than 13 (or too small to hold anything). */
  Size: "size",
  /** A cell of the edge is not a wall. */
  Border: "border",
  /** A symbol the format does not have. */
  Symbol: "symbol",
  /** The starts are not exactly `1` to the number of players. */
  Starts: "starts",
  /** A door with no plate of its group, or a plate with no door. */
  Group: "group",
  /** A mold on a wall, a plate or a door. */
  MoldPlace: "mold-place",
  /** A moulded kind with not exactly as many cells as molds. */
  MoldCount: "mold-count",
  /** No mold at all: the game could never be won. */
  NoMolds: "no-molds",
  /** Fewer than one round. */
} as const;

export type JellyCrewLayoutErrorCode =
  (typeof JELLY_CREW_LAYOUT_ERROR)[keyof typeof JELLY_CREW_LAYOUT_ERROR];

/** A layout written wrong: caught by the layouts' tests, never by a player. */
export class JellyCrewLayoutError extends Error {
  readonly code: JellyCrewLayoutErrorCode;

  constructor(code: JellyCrewLayoutErrorCode, message: string) {
    super(message);
    this.name = "JellyCrewLayoutError";
    this.code = code;
  }
}

const JELLY: Readonly<Record<string, JellyCrewKind>> = {
  r: JELLY_CREW_KIND.Strawberry,
  g: JELLY_CREW_KIND.Pandan,
  y: JELLY_CREW_KIND.Mango,
  p: JELLY_CREW_KIND.Taro,
  s: JELLY_CREW_KIND.Grass,
  i: JELLY_CREW_KIND.Ice,
};

const MOLD: Readonly<Record<string, JellyCrewMoldKind>> = {
  R: JELLY_CREW_KIND.Strawberry,
  G: JELLY_CREW_KIND.Pandan,
  Y: JELLY_CREW_KIND.Mango,
  P: JELLY_CREW_KIND.Taro,
  S: JELLY_CREW_KIND.Grass,
  I: JELLY_CREW_KIND.Ice,
};

const PLATE: Readonly<Record<string, JellyCrewGroup>> = {
  a: JELLY_CREW_GROUP.Circle,
  b: JELLY_CREW_GROUP.Triangle,
  c: JELLY_CREW_GROUP.Square,
};

const DOOR: Readonly<Record<string, JellyCrewGroup>> = {
  A: JELLY_CREW_GROUP.Circle,
  B: JELLY_CREW_GROUP.Triangle,
  C: JELLY_CREW_GROUP.Square,
};

/**
 * Reads a layout (design §4): `#` wall, `.` floor, `1`–`4` the start of each seat, `r g y p s i`
 * strawberry, pandan, mango, taro, grass jelly, ice, `a b c` plates ● ▲ ■, `A B C` their doors.
 * Every jelly cell starts as a piece of its own and what touches sticks at once. Throws a
 * `JellyCrewLayoutError` with a code when the layout breaks a rule of the format.
 */
export function parseJellyCrewLayout(definition: JellyCrewLayoutDefinition): JellyCrewLayout {
  const { map, playerCount, rows } = definition;
  const name = `${map}-${String(playerCount)}`;
  const fail = (code: JellyCrewLayoutErrorCode, message: string): never => {
    throw new JellyCrewLayoutError(code, `${name}: ${message}`);
  };
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  if (rows.some((row) => row.length !== width)) fail(JELLY_CREW_LAYOUT_ERROR.Shape, "rows differ");
  if (width < 3 || height < 3 || width > JELLY_CREW_MAX_WIDTH || height > JELLY_CREW_MAX_HEIGHT) {
    fail(JELLY_CREW_LAYOUT_ERROR.Size, `${String(width)} × ${String(height)}`);
  }

  const walls = new Set<number>();
  const plates = new Map<number, JellyCrewGroup>();
  const doors = new Map<number, JellyCrewGroup>();
  const starts = new Map<number, number>();
  const pieces: JellyCrewPiece[] = [];
  rows.forEach((row, y) => {
    Array.from({ length: width }, (_, x) => row.charAt(x)).forEach((symbol, x) => {
      const cell = y * width + x;
      const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      if (edge && symbol !== "#") fail(JELLY_CREW_LAYOUT_ERROR.Border, `open edge at ${x},${y}`);
      if (symbol === "#") walls.add(cell);
      else if (/^[1-4]$/u.test(symbol)) {
        const seat = Number(symbol) - 1;
        if (starts.has(seat)) fail(JELLY_CREW_LAYOUT_ERROR.Starts, `two starts ${symbol}`);
        starts.set(seat, cell);
      } else if (PLATE[symbol] !== undefined) plates.set(cell, PLATE[symbol]);
      else if (DOOR[symbol] !== undefined) doors.set(cell, DOOR[symbol]);
      else if (JELLY[symbol] !== undefined) pieces.push({ cells: [cell], kinds: [JELLY[symbol]] });
      else if (symbol !== ".") fail(JELLY_CREW_LAYOUT_ERROR.Symbol, `"${symbol}" at ${x},${y}`);
    });
  });

  const chars = Array.from({ length: playerCount }, (_, seat) => starts.get(seat));
  if (starts.size !== playerCount || chars.some((cell) => cell === undefined)) {
    fail(JELLY_CREW_LAYOUT_ERROR.Starts, `starts ${[...starts.keys()].join(",")}`);
  }

  const plateGroups = new Set(plates.values());
  const doorGroups = new Set(doors.values());
  for (const group of new Set([...plateGroups, ...doorGroups])) {
    if (!plateGroups.has(group) || !doorGroups.has(group)) {
      fail(JELLY_CREW_LAYOUT_ERROR.Group, `group ${group} without its plate or door`);
    }
  }

  const molds = new Map<number, JellyCrewMoldKind>();
  if (definition.molds.length !== height || definition.molds.some((row) => row.length !== width)) {
    fail(JELLY_CREW_LAYOUT_ERROR.Shape, "molds not the layout's size");
  }
  definition.molds.forEach((row, y) => {
    Array.from({ length: width }, (_, x) => row.charAt(x)).forEach((symbol, x) => {
      if (symbol === ".") return;
      const kind = MOLD[symbol];
      const cell = y * width + x;
      if (kind === undefined) fail(JELLY_CREW_LAYOUT_ERROR.Symbol, `mold "${symbol}"`);
      else if (walls.has(cell) || plates.has(cell) || doors.has(cell)) {
        fail(JELLY_CREW_LAYOUT_ERROR.MoldPlace, `mold on a fixture at ${x},${y}`);
      } else molds.set(cell, kind);
    });
  });
  if (molds.size === 0) fail(JELLY_CREW_LAYOUT_ERROR.NoMolds, "no molds");
  // Each cell is a piece of its own until the layout settles: counting pieces counts cells.
  for (const kind of new Set(molds.values())) {
    const cells = pieces.filter((piece) => piece.kinds[0] === kind).length;
    const wanted = [...molds.values()].filter((moldKind) => moldKind === kind).length;
    if (cells !== wanted) {
      fail(JELLY_CREW_LAYOUT_ERROR.MoldCount, `${String(cells)} ${kind} for ${String(wanted)}`);
    }
  }

  return {
    map,
    playerCount,
    width,
    height,
    walls,
    plates,
    doors,
    molds,
    start: {
      chars: chars.filter((cell) => cell !== undefined),
      pieces: jellyCrewSettle({ width, height, walls }, pieces),
    },
  };
}
