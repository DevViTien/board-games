import type { ChessColor, ChessPieceType } from "@board-games/games/chess";
import { cn } from "@board-games/ui";

import { pieceSrc } from "../pieces";

// The pieces of the rules' figures, drawn as on the board (`Board.tsx`): cream and green squares,
// the "staunty" pieces (public/pieces/staunty, unmodified), ink marks with a light halo.

/** A square, light or dark as on the board. */
export function FigureSquare({
  x,
  y,
  size,
  light,
}: {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly light: boolean;
}) {
  return (
    <rect
      x={x}
      y={y}
      width={size}
      height={size}
      className={light ? "fill-game-board" : "fill-(--chess-square-dark)"}
    />
  );
}

/** A piece standing on the square whose top-left corner is (x, y); a ghost where it was. */
export function FigurePiece({
  colour,
  type,
  x,
  y,
  size,
  ghost = false,
}: {
  readonly colour: ChessColor;
  readonly type: ChessPieceType;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly ghost?: boolean;
}) {
  return (
    <image
      href={pieceSrc(colour, type)}
      x={x}
      y={y}
      width={size}
      height={size}
      className={cn(ghost && "opacity-35")}
    />
  );
}

/** A square a piece can go to: an ink dot with a light halo, readable on both squares. */
export function FigureDot({
  x,
  y,
  size,
}: {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}) {
  return (
    <circle
      cx={x + size / 2}
      cy={y + size / 2}
      r={size * 0.16}
      strokeWidth={size * 0.06}
      className="fill-game-highlight stroke-(--chess-paper)"
    />
  );
}

/** A piece that can be captured: an ink ring with a light halo around its square. */
export function FigureCaptureRing({
  x,
  y,
  size,
}: {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}) {
  return (
    <g fill="none">
      <circle
        cx={x + size / 2}
        cy={y + size / 2}
        r={size * 0.45}
        strokeWidth={size * 0.12}
        className="stroke-(--chess-paper)"
      />
      <circle
        cx={x + size / 2}
        cy={y + size / 2}
        r={size * 0.45}
        strokeWidth={size * 0.06}
        className="stroke-game-highlight"
      />
    </g>
  );
}

/** The files a–h and the ranks 1–8, under and left of a crop of the board. */
export function FigureCoordinates({
  files,
  ranks,
  x,
  y,
  size,
}: {
  /** The files of the crop's columns, left to right ("c", "d"…). */
  readonly files: readonly string[];
  /** The ranks of the crop's rows, top to bottom (7, 6, 5). */
  readonly ranks: readonly number[];
  readonly x: number;
  readonly y: number;
  readonly size: number;
}) {
  const fontSize = size * 0.28;
  return (
    <g fontSize={fontSize} fontWeight="600" className="fill-fg-muted">
      {files.map((file, index) => (
        <text
          key={file}
          x={x + index * size + size / 2}
          y={y + ranks.length * size + fontSize * 1.1}
          textAnchor="middle"
        >
          {file}
        </text>
      ))}
      {ranks.map((rank, index) => (
        <text
          key={rank}
          x={x - fontSize * 0.5}
          y={y + index * size + size / 2}
          textAnchor="end"
          dominantBaseline="middle"
        >
          {rank}
        </text>
      ))}
    </g>
  );
}

/** Whether a square is light: h1 is light, a1 dark. `file` counts from 0 (a), `rank` from 1. */
export const isLightSquare = (file: number, rank: number) => (file + rank) % 2 === 0;
