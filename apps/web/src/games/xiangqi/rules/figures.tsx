import type { XiangqiPiece } from "@board-games/games/xiangqi";

import { RulesFigure } from "@/features/rules/RulesFigure";

import { XiangqiPieceDisc } from "../pieces";

const CELL = 20;
const centre = (index: number) => 10 + index * CELL;

/** A few points of the board: lines, the pieces on some points, dots and crosses on others. */
function MiniBoard({
  columns,
  rows,
  pieces,
  dots,
  crosses = [],
  captures = [],
}: {
  readonly columns: number;
  readonly rows: number;
  readonly pieces: readonly (readonly [number, number, XiangqiPiece])[];
  readonly dots: readonly (readonly [number, number])[];
  readonly crosses?: readonly (readonly [number, number])[];
  readonly captures?: readonly (readonly [number, number])[];
}) {
  const width = columns * CELL;
  const height = rows * CELL;
  return (
    <>
      <rect width={width} height={height} rx="4" className="fill-game-board" />
      <g strokeWidth="0.8" className="stroke-game-line">
        {Array.from({ length: columns }, (_unused, x) => (
          <line key={`c${String(x)}`} x1={centre(x)} y1={10} x2={centre(x)} y2={height - 10} />
        ))}
        {Array.from({ length: rows }, (_unused, y) => (
          <line key={`r${String(y)}`} x1={10} y1={centre(y)} x2={width - 10} y2={centre(y)} />
        ))}
      </g>
      {pieces.map(([x, y, piece]) => (
        <svg
          key={`p${String(x)}-${String(y)}`}
          x={centre(x) - 9}
          y={centre(y) - 9}
          width="18"
          height="18"
        >
          <XiangqiPieceDisc piece={piece} className="size-full" />
        </svg>
      ))}
      {dots.map(([x, y]) => (
        <circle
          key={`d${String(x)}-${String(y)}`}
          cx={centre(x)}
          cy={centre(y)}
          r="3.2"
          strokeWidth="1.2"
          className="fill-(--xiangqi-target) stroke-(--xiangqi-halo)"
        />
      ))}
      {crosses.map(([x, y]) => (
        <path
          key={`x${String(x)}-${String(y)}`}
          d={`M${String(centre(x) - 4)} ${String(centre(y) - 4)}l8 8m0 -8l-8 8`}
          strokeWidth="2"
          strokeLinecap="round"
          className="stroke-(--xiangqi-check)"
        />
      ))}
      {captures.map(([x, y]) => (
        <path
          key={`k${String(x)}-${String(y)}`}
          // Inside the point's 20 × 20 square, so the corners of an edge point are not cut off.
          d={`M${String(centre(x) - 9)} ${String(centre(y) - 4)}v-5h5M${String(centre(x) + 4)} ${String(centre(y) - 9)}h5v5M${String(centre(x) + 9)} ${String(centre(y) + 4)}v5h-5M${String(centre(x) - 4)} ${String(centre(y) + 9)}h-5v-5`}
          fill="none"
          strokeWidth="1.6"
          strokeLinecap="round"
          className="stroke-(--xiangqi-target)"
        />
      ))}
    </>
  );
}

/** A horse in the middle, a piece on the point above it: the two points beyond it are blocked. */
export function HorseFigure({
  label,
  caption,
}: {
  readonly label: string;
  readonly caption: string;
}) {
  return (
    <RulesFigure label={label} caption={caption} viewBox="0 0 100 100">
      <MiniBoard
        columns={5}
        rows={5}
        pieces={[
          [2, 2, "H"],
          [2, 1, "P"],
        ]}
        dots={[
          [0, 1],
          [0, 3],
          [4, 1],
          [4, 3],
          [1, 4],
          [3, 4],
        ]}
        crosses={[
          [1, 0],
          [3, 0],
        ]}
      />
    </RulesFigure>
  );
}

/** A cannon, a screen, and the piece beyond it that it takes; the points beyond the screen are not moves. */
export function CannonFigure({
  label,
  caption,
}: {
  readonly label: string;
  readonly caption: string;
}) {
  return (
    <RulesFigure label={label} caption={caption} viewBox="0 0 120 60">
      <MiniBoard
        columns={6}
        rows={3}
        pieces={[
          [0, 1, "C"],
          [2, 1, "p"],
          [5, 1, "r"],
        ]}
        dots={[[1, 1]]}
        crosses={[
          [3, 1],
          [4, 1],
        ]}
        captures={[[5, 1]]}
      />
    </RulesFigure>
  );
}
