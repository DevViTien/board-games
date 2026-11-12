import { settle } from "./step";
import {
  type Hint,
  JELLY_KIND,
  type JellyKind,
  type Level,
  type LevelId,
  type MoldKind,
  type Piece,
} from "./types";

/** A level as written in `levels.ts`: one string a row. */
export interface LevelDefinition {
  readonly id: LevelId;
  readonly version: number;
  readonly minMoves: number;
  readonly hint?: Hint;
  readonly rows: readonly string[];
  /**
   * Molds, a layer as large as `rows`: `.` none, or the kind a mold asks for (`R G Y P C` the
   * colours, `I` ice). A separate layer, as a mold may start under a piece or the player.
   */
  readonly molds?: readonly string[];
}

/** The largest grid, walls included: 10 columns fit a 360 px phone at 32 px a cell. */
const MAX_SIDE = 10;

const SYMBOL: Readonly<Record<string, JellyKind>> = {
  r: JELLY_KIND.Strawberry,
  g: JELLY_KIND.Pandan,
  y: JELLY_KIND.Mango,
  p: JELLY_KIND.Taro,
  c: JELLY_KIND.Coconut,
  b: JELLY_KIND.Grass,
  i: JELLY_KIND.Ice,
};

export const LEVEL_ERROR = {
  Shape: "shape",
  Size: "size",
  Border: "border",
  Player: "player",
  Symbol: "symbol",
  Id: "id",
  Mold: "mold",
} as const;
export type LevelErrorCode = (typeof LEVEL_ERROR)[keyof typeof LEVEL_ERROR];

/** A level written wrong: caught by the levels' tests, never by a player. */
export class LevelError extends Error {
  readonly code: LevelErrorCode;

  constructor(code: LevelErrorCode, message: string) {
    super(message);
    this.name = "LevelError";
    this.code = code;
  }
}

const MOLD_SYMBOL: Readonly<Record<string, MoldKind>> = {
  R: JELLY_KIND.Strawberry,
  G: JELLY_KIND.Pandan,
  Y: JELLY_KIND.Mango,
  P: JELLY_KIND.Taro,
  C: JELLY_KIND.Coconut,
  I: JELLY_KIND.Ice,
};

/**
 * The molds of a level (design §2 of add-jelly-gather-molds): as large as the level, never on a
 * wall, and each moulded kind with as many cells on the board as molds, or it could never fit.
 */
function parseMolds(
  definition: LevelDefinition,
  width: number,
  height: number,
  walls: ReadonlySet<number>,
  pieces: readonly Piece[],
): ReadonlyMap<number, MoldKind> {
  const molds = new Map<number, MoldKind>();
  const rows = definition.molds;
  if (rows === undefined) return molds;
  const { id } = definition;
  if (rows.length !== height || rows.some((row) => row.length !== width)) {
    throw new LevelError(LEVEL_ERROR.Mold, `${id}: molds not the level's size`);
  }
  rows.forEach((row, y) => {
    Array.from({ length: width }, (_, x) => row.charAt(x)).forEach((symbol, x) => {
      if (symbol === ".") return;
      const kind = MOLD_SYMBOL[symbol];
      const cell = y * width + x;
      if (kind === undefined) throw new LevelError(LEVEL_ERROR.Mold, `${id}: mold "${symbol}"`);
      if (walls.has(cell)) {
        throw new LevelError(LEVEL_ERROR.Mold, `${id}: mold on a wall at ${x},${y}`);
      }
      molds.set(cell, kind);
    });
  });
  // Each cell is a piece of its own until the level settles: counting pieces counts cells.
  for (const kind of new Set(molds.values())) {
    const cells = pieces.filter((piece) => piece.kinds[0] === kind).length;
    const wanted = [...molds.values()].filter((moldKind) => moldKind === kind).length;
    if (cells !== wanted) {
      throw new LevelError(
        LEVEL_ERROR.Mold,
        `${id}: ${cells} cells of ${kind} for ${wanted} molds`,
      );
    }
  }
  return molds;
}

/**
 * Reads a level (design §3): `#` wall, `.` floor, `@` the player, `r g y p` strawberry, pandan,
 * mango, taro, `c` coconut, `b` grass jelly, `i` ice. Every jelly cell starts as a piece of its own
 * and what touches sticks at once, so two touching cells of one colour are always one piece.
 */
export function parseLevel(definition: LevelDefinition): Level {
  const { id, rows } = definition;
  const match = /^(\d+)-(\d+)$/.exec(id);
  if (match === null) throw new LevelError(LEVEL_ERROR.Id, `${id}: not <chapter>-<level>`);
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  if (rows.some((row) => row.length !== width)) {
    throw new LevelError(LEVEL_ERROR.Shape, `${id}: rows of different lengths`);
  }
  if (width < 3 || height < 3 || width > MAX_SIDE || height > MAX_SIDE) {
    throw new LevelError(LEVEL_ERROR.Size, `${id}: ${width} × ${height}`);
  }

  const walls = new Set<number>();
  const pieces: Piece[] = [];
  const players: number[] = [];
  rows.forEach((row, y) => {
    // Levels are written in ASCII: one character a cell.
    Array.from({ length: width }, (_, x) => row.charAt(x)).forEach((symbol, x) => {
      const cell = y * width + x;
      const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      if (edge && symbol !== "#") {
        throw new LevelError(LEVEL_ERROR.Border, `${id}: open edge at ${x},${y}`);
      }
      if (symbol === "#") walls.add(cell);
      else if (symbol === "@") players.push(cell);
      else if (symbol !== ".") {
        const kind = SYMBOL[symbol];
        if (kind === undefined) throw new LevelError(LEVEL_ERROR.Symbol, `${id}: "${symbol}"`);
        pieces.push({ cells: [cell], kinds: [kind], fixed: false });
      }
    });
  });
  const [player] = players;
  if (player === undefined || players.length !== 1) {
    throw new LevelError(LEVEL_ERROR.Player, `${id}: ${players.length} players`);
  }

  const molds = parseMolds(definition, width, height, walls, pieces);
  const grid = { width, height, walls };
  return {
    id,
    chapter: Number(match[1]),
    version: definition.version,
    width,
    height,
    walls,
    molds,
    start: settle(grid, player, pieces).board,
    minMoves: definition.minMoves,
    ...(definition.hint && { hint: definition.hint }),
  };
}
