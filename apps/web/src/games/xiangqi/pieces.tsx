import type { XiangqiPiece as Piece } from "@board-games/games/xiangqi";
import { cn } from "@board-games/ui";

/** The character on each piece: Đỏ's (uppercase) and Đen's differ but for none. */
const XIANGQI_GLYPH: Readonly<Record<Piece, string>> = {
  K: "帥",
  A: "仕",
  E: "相",
  H: "傌",
  R: "俥",
  C: "炮",
  P: "兵",
  k: "將",
  a: "士",
  e: "象",
  h: "馬",
  r: "車",
  c: "砲",
  p: "卒",
};

interface PieceProps {
  readonly piece: Piece;
  readonly className?: string | undefined;
}

/**
 * A piece (design §6): a round disc with a shadow under it, a ring and its Chinese character in
 * its side's ink (red or black). Decorative: a point names its piece in words.
 */
export function XiangqiPieceDisc({ piece, className }: PieceProps) {
  const red = piece === piece.toUpperCase();
  // A class beats an SVG attribute: the ring only strokes and the character only fills, or the
  // ring would be painted over in the character's ink.
  const ring = red ? "stroke-game-mark-1" : "stroke-game-mark-2";
  const ink = red ? "fill-game-mark-1" : "fill-game-mark-2";
  return (
    <svg aria-hidden viewBox="0 0 100 100" className={className}>
      <circle cx="50" cy="54" r="44" className="fill-(--xiangqi-disc-shadow)" />
      <circle
        cx="50"
        cy="50"
        r="44"
        strokeWidth="3"
        className="fill-(--xiangqi-disc) stroke-(--xiangqi-disc-edge)"
      />
      <circle cx="50" cy="50" r="35" strokeWidth="3" className={cn("fill-none", ring)} />
      <text
        x="50"
        y="51"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize="48"
        fontWeight="900"
        className={cn(ink, "[font-family:var(--font-xiangqi),var(--font-cjk),serif]")}
      >
        {XIANGQI_GLYPH[piece]}
      </text>
    </svg>
  );
}
