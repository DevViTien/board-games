// The board of Cờ tướng (design §1–§2 of `add-xiangqi-game`): 90 points, index = y * 9 + x, x 0–8
// from Đỏ's left, y 0–9 from Đen's back rank (Đỏ's is y 9). Uppercase pieces are Đỏ's.

/** A piece: Tướng, Sĩ, Tượng, Mã, Xe, Pháo, Tốt; uppercase Đỏ, lowercase Đen. */
export type XiangqiPiece =
  "K" | "A" | "E" | "H" | "R" | "C" | "P" | "k" | "a" | "e" | "h" | "r" | "c" | "p";

/** A piece's kind, the same for both sides. */
export type XiangqiKind = "k" | "a" | "e" | "h" | "r" | "c" | "p";

export type XiangqiBoard = readonly (XiangqiPiece | null)[];

export const XIANGQI_COLUMNS = 9;
export const XIANGQI_ROWS = 10;

/** The standard opening position, row by row from Đen's back rank. */
export const XIANGQI_START_ROWS = [
  "rheakaehr",
  ".........",
  ".c.....c.",
  "p.p.p.p.p",
  ".........",
  ".........",
  "P.P.P.P.P",
  ".C.....C.",
  ".........",
  "RHEAKAEHR",
] as const;

/** A board from rows of 9 characters, `.` for an empty point. */
export function xiangqiBoardFromRows(rows: readonly string[]): XiangqiBoard {
  return rows.flatMap((row) =>
    Array.from({ length: row.length }, (_, index) => {
      const c = row.charAt(index);
      return c === "." ? null : (c as XiangqiPiece);
    }),
  );
}

export const pointOf = (x: number, y: number): number => y * XIANGQI_COLUMNS + x;
export const xOf = (point: number): number => point % XIANGQI_COLUMNS;
export const yOf = (point: number): number => Math.floor(point / XIANGQI_COLUMNS);

export function isRedPiece(piece: XiangqiPiece): boolean {
  return piece === piece.toUpperCase();
}

export function kindOf(piece: XiangqiPiece): XiangqiKind {
  return piece.toLowerCase() as XiangqiKind;
}

/** Seat 0 is Đỏ, seat 1 Đen. */
export function seatOfPiece(piece: XiangqiPiece): 0 | 1 {
  return isRedPiece(piece) ? 0 : 1;
}

const inBoard = (x: number, y: number) =>
  x >= 0 && x < XIANGQI_COLUMNS && y >= 0 && y < XIANGQI_ROWS;
const inPalace = (red: boolean, x: number, y: number) =>
  x >= 3 && x <= 5 && (red ? y >= 7 : y <= 2);
/** Whether `y` is on `red`'s own side of the river. */
const ownSide = (red: boolean, y: number) => (red ? y >= 5 : y <= 4);

const STRAIGHT = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;
const DIAGONAL = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;
/** A horse's step: where it lands, and the point next to it that blocks it (its leg). */
const HORSE = [
  [1, 2, 0, 1],
  [-1, 2, 0, 1],
  [1, -2, 0, -1],
  [-1, -2, 0, -1],
  [2, 1, 1, 0],
  [2, -1, 1, 0],
  [-2, 1, -1, 0],
  [-2, -1, -1, 0],
] as const;

/**
 * Where the piece on `from` may go by its own move, before checks are looked at (spec "Cách đi
 * của quân"): never onto a piece of its side.
 */
function pieceTargets(board: XiangqiBoard, from: number): number[] {
  const piece = board[from];
  if (piece == null) return [];
  const red = isRedPiece(piece);
  const x = xOf(from);
  const y = yOf(from);
  const out: number[] = [];
  const at = (px: number, py: number) => board[pointOf(px, py)] ?? null;
  const own = (other: XiangqiPiece | null) => other !== null && isRedPiece(other) === red;
  const add = (px: number, py: number) => {
    if (inBoard(px, py) && !own(at(px, py))) out.push(pointOf(px, py));
  };
  switch (kindOf(piece)) {
    case "k":
      for (const [dx, dy] of STRAIGHT) if (inPalace(red, x + dx, y + dy)) add(x + dx, y + dy);
      break;
    case "a":
      for (const [dx, dy] of DIAGONAL) if (inPalace(red, x + dx, y + dy)) add(x + dx, y + dy);
      break;
    case "e":
      for (const [dx, dy] of DIAGONAL) {
        const nx = x + 2 * dx;
        const ny = y + 2 * dy;
        if (!inBoard(nx, ny) || !ownSide(red, ny)) continue;
        if (at(x + dx, y + dy) === null) add(nx, ny);
      }
      break;
    case "h":
      for (const [dx, dy, lx, ly] of HORSE) {
        if (inBoard(x + lx, y + ly) && at(x + lx, y + ly) === null) add(x + dx, y + dy);
      }
      break;
    case "r":
    case "c": {
      const cannon = kindOf(piece) === "c";
      for (const [dx, dy] of STRAIGHT) {
        let nx = x + dx;
        let ny = y + dy;
        let screened = false;
        while (inBoard(nx, ny)) {
          const other = at(nx, ny);
          if (!screened) {
            if (other === null) out.push(pointOf(nx, ny));
            else if (cannon) screened = true;
            else {
              if (!own(other)) out.push(pointOf(nx, ny));
              break;
            }
          } else if (other !== null) {
            if (!own(other)) out.push(pointOf(nx, ny));
            break;
          }
          nx += dx;
          ny += dy;
        }
      }
      break;
    }
    case "p": {
      const ahead = red ? -1 : 1;
      add(x, y + ahead);
      if (!ownSide(red, y)) {
        add(x + 1, y);
        add(x - 1, y);
      }
      break;
    }
  }
  return out;
}

function generalPoint(board: XiangqiBoard, red: boolean): number {
  return board.indexOf(red ? "K" : "k");
}

/** Whether the two generals stand on one column with nothing between them. */
function generalsFace(board: XiangqiBoard): boolean {
  const red = generalPoint(board, true);
  const black = generalPoint(board, false);
  if (red === -1 || black === -1 || xOf(red) !== xOf(black)) return false;
  for (let point = black + XIANGQI_COLUMNS; point < red; point += XIANGQI_COLUMNS) {
    if (board[point] != null) return false;
  }
  return true;
}

/**
 * Whether `red`'s general is attacked, looking out from it (design §2): rooks and the other
 * general along lines, cannons over exactly one screen, horses whose leg is free, soldiers ahead
 * of it or beside it.
 */
export function generalInCheck(board: XiangqiBoard, red: boolean): boolean {
  const point = generalPoint(board, red);
  if (point === -1) return false;
  const x = xOf(point);
  const y = yOf(point);
  const at = (px: number, py: number) =>
    inBoard(px, py) ? (board[pointOf(px, py)] ?? null) : null;
  const enemy = (piece: XiangqiPiece | null, kind: XiangqiKind) =>
    piece !== null && isRedPiece(piece) !== red && kindOf(piece) === kind;
  for (const [dx, dy] of STRAIGHT) {
    let nx = x + dx;
    let ny = y + dy;
    let screens = 0;
    while (inBoard(nx, ny)) {
      const piece = at(nx, ny);
      if (piece !== null) {
        if (screens === 0 && (enemy(piece, "r") || (dx === 0 && enemy(piece, "k")))) return true;
        if (screens === 1 && enemy(piece, "c")) return true;
        screens += 1;
        if (screens > 1) break;
      }
      nx += dx;
      ny += dy;
    }
  }
  // A horse at (x + dx, y + dy) steps here when its own leg, next to it towards here, is free.
  for (const [dx, dy, lx, ly] of HORSE) {
    if (!enemy(at(x - dx, y - dy), "h")) continue;
    if (at(x - dx + lx, y - dy + ly) === null) return true;
  }
  // An enemy soldier one step towards the enemy's side, or beside once it crossed (it always has
  // when it stands in this palace).
  const towards = red ? -1 : 1;
  if (enemy(at(x, y + towards), "p")) return true;
  if (enemy(at(x - 1, y), "p") || enemy(at(x + 1, y), "p")) return true;
  return false;
}

/** The board after moving the piece on `from` to `to`. */
export function boardAfter(board: XiangqiBoard, from: number, to: number): XiangqiBoard {
  const next = board.slice();
  next[to] = next[from] ?? null;
  next[from] = null;
  return next;
}

/** `red`'s legal moves (spec "Tướng không đối mặt và không tự để bị chiếu"). */
export function legalMovesOf(
  board: XiangqiBoard,
  red: boolean,
): { readonly from: number; readonly to: number }[] {
  const moves: { from: number; to: number }[] = [];
  board.forEach((piece, from) => {
    if (piece == null || isRedPiece(piece) !== red) return;
    for (const to of pieceTargets(board, from)) {
      const after = boardAfter(board, from, to);
      if (!generalsFace(after) && !generalInCheck(after, red)) moves.push({ from, to });
    }
  });
  return moves;
}
