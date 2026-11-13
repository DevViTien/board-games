import { isRedPiece, kindOf, type XiangqiBoard, type XiangqiKind, xOf, yOf } from "./board";

// Vietnamese notation (spec "Ký hiệu nước đi", design §3): the piece's letter, its column counted
// from the right of the side moving, "." forward, "/" back, "-" sideways, then the column it goes
// to or the steps it takes. Two pieces of a kind on one column: "t" (front) and "s" (back) instead
// of the column; three: "t", "g", "s". When that is not enough, the mark is followed by the column:
// soldiers two by two on two columns ("Bt7.1"), or four or more on one, marked by their place from
// the front, 1 up ("B27.1").

export const XIANGQI_LETTER: Readonly<Record<XiangqiKind, string>> = {
  k: "Tg",
  a: "S",
  e: "T",
  h: "M",
  r: "X",
  c: "P",
  p: "B",
};

/** A column of the side `red`, 1–9 from its right. */
export function sideColumn(red: boolean, x: number): number {
  return red ? 9 - x : x + 1;
}

/** Which of several pieces on one column this is, from the front of its side. */
function placeMark(count: number, place: number): string {
  if (count === 2) return place === 0 ? "t" : "s";
  if (count === 3) return ["t", "g", "s"][place] ?? "";
  return String(place + 1);
}

/** The columns holding `piece`, with how many of it each holds. */
function columnsOf(board: XiangqiBoard, piece: string): Map<number, number> {
  const columns = new Map<number, number>();
  board.forEach((other, point) => {
    if (other === piece) columns.set(xOf(point), (columns.get(xOf(point)) ?? 0) + 1);
  });
  return columns;
}

/** The notation of moving the piece on `from` to `to` on `board` (the board before the move). */
export function xiangqiNotation(board: XiangqiBoard, from: number, to: number): string {
  const piece = board[from];
  if (piece == null) throw new Error(`No piece on ${String(from)}`);
  const red = isRedPiece(piece);
  const kind = kindOf(piece);
  const x = xOf(from);
  const y = yOf(from);
  // Forward is towards the other side: up the board for Đỏ.
  const forward = red ? y - yOf(to) : yOf(to) - y;
  const sign = forward > 0 ? "." : forward < 0 ? "/" : "-";
  const straight = kind === "k" || kind === "r" || kind === "c" || kind === "p";
  const end = sign === "-" || !straight ? sideColumn(red, xOf(to)) : Math.abs(forward);

  // The same pieces on this column, from the front of the side moving.
  const same: number[] = [];
  board.forEach((other, point) => {
    if (other === piece && xOf(point) === x) same.push(point);
  });
  same.sort((a, b) => (red ? yOf(a) - yOf(b) : yOf(b) - yOf(a)));
  const column = String(sideColumn(red, x));
  if (same.length < 2) return `${XIANGQI_LETTER[kind]}${column}${sign}${String(end)}`;
  const mark = placeMark(same.length, same.indexOf(from));
  const crowded = [...columnsOf(board, piece)].filter(([, count]) => count > 1).length > 1;
  const where = same.length > 3 || crowded ? `${mark}${column}` : mark;
  return `${XIANGQI_LETTER[kind]}${where}${sign}${String(end)}`;
}
