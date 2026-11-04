import type { LudoColourName } from "@board-games/games/ludo";
import { cn } from "@board-games/ui";

import type { Point } from "../board-layout";
import { ColourSymbol } from "../ColourSymbol";
import { PIECE_FILL, PIECE_INK_FILL, PIECE_LINE_STROKE, PIECE_TINT } from "../piece-style";

// The pieces of the rules' figures, drawn as on the board (`Board.tsx`), in grid units: a cell is
// 1 × 1, a point is the centre of a cell.

/** A horse as on the board: a disc of its colour, edged, with the colour's symbol in its ink. */
export function FigureHorse({
  colour,
  at,
  leaving = false,
}: {
  readonly colour: LudoColourName;
  readonly at: Point;
  /** Being sent home: a dashed ring around it, as the board marks a horse just sent home. */
  readonly leaving?: boolean;
}) {
  return (
    <g>
      {leaving && (
        <circle
          cx={at.x}
          cy={at.y}
          r="0.5"
          fill="none"
          strokeWidth="0.07"
          strokeDasharray="0.12 0.1"
          className="stroke-fg"
        />
      )}
      <circle
        cx={at.x}
        cy={at.y}
        r="0.38"
        strokeWidth="0.05"
        className={cn(PIECE_FILL[colour], "stroke-piece-edge")}
      />
      <ColourSymbol colour={colour} at={at} size={0.17} className={PIECE_INK_FILL[colour]} />
    </g>
  );
}

/** A cell of the track, or of a colour's home steps (tinted) with its number. */
export function FigureCell({
  x,
  y,
  step,
  colour,
}: {
  readonly x: number;
  readonly y: number;
  /** A home step's number, drawn in it. */
  readonly step?: number | undefined;
  /** The colour of a home step or a start square (tinted). */
  readonly colour?: LudoColourName | undefined;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width="1"
        height="1"
        strokeWidth="0.04"
        className={cn(
          colour === undefined ? "fill-game-board" : PIECE_TINT[colour],
          "stroke-game-line",
        )}
      />
      {step !== undefined && (
        <text
          x={x + 0.5}
          y={y + 0.55}
          fontSize="0.42"
          fontWeight="700"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-fg"
        >
          {step}
        </text>
      )}
    </g>
  );
}

/** A colour's home entry (chân chuồng), on a track cell: a dashed frame of the colour, as on the board. */
export function GateMark({
  x,
  y,
  colour,
}: {
  readonly x: number;
  readonly y: number;
  readonly colour: LudoColourName;
}) {
  return (
    <rect
      x={x + 0.14}
      y={y + 0.14}
      width="0.72"
      height="0.72"
      fill="none"
      strokeWidth="0.08"
      strokeDasharray="0.14 0.1"
      className={PIECE_LINE_STROKE[colour]}
    />
  );
}
