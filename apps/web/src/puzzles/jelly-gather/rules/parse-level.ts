import { settle } from "./step";
import {
  type Hint,
  JELLY_KIND,
  type JellyKind,
  type Level,
  type LevelId,
  type Piece,
} from "./types";

/** A level as written in `levels.ts`: one string a row. */
export interface LevelDefinition {
  readonly id: LevelId;
  readonly version: number;
  readonly minMoves: number;
  readonly hint?: Hint;
  readonly rows: readonly string[];
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

  const grid = { width, height, walls };
  return {
    id,
    chapter: Number(match[1]),
    version: definition.version,
    width,
    height,
    walls,
    start: settle(grid, player, pieces).board,
    minMoves: definition.minMoves,
    ...(definition.hint && { hint: definition.hint }),
  };
}
