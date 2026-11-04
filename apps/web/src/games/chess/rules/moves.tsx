import type { ChessPieceType } from "@board-games/games/chess";
import type { ReactNode } from "react";

import { RulesFigure } from "@/features/rules/RulesFigure";

import { FigureCaptureRing, FigureDot, FigurePiece, FigureSquare } from "./parts";

const CELL = 12;
const SIZE = 5;
const GAP = 10;

type Square = readonly [col: number, row: number];

const inside = ([col, row]: Square) => col >= 0 && col < SIZE && row >= 0 && row < SIZE;

/** Every square along `directions` from the centre, to the edge of the 5 × 5 board. */
function slide(directions: readonly Square[]): readonly Square[] {
  return directions.flatMap(([dc, dr]) =>
    [1, 2].map((step): Square => [2 + dc * step, 2 + dr * step]).filter(inside),
  );
}

const STRAIGHT: readonly Square[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const DIAGONAL: readonly Square[] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

interface PieceBoard {
  readonly type: ChessPieceType;
  readonly at: Square;
  readonly dots: readonly Square[];
  /** Black pieces it may capture. */
  readonly captures?: readonly Square[];
}

/** King, queen, rook; bishop, knight, pawn (the order of the caption). */
const BOARDS: readonly PieceBoard[] = [
  {
    type: "k",
    at: [2, 2],
    dots: [...STRAIGHT, ...DIAGONAL].map(([dc, dr]): Square => [2 + dc, 2 + dr]),
  },
  { type: "q", at: [2, 2], dots: slide([...STRAIGHT, ...DIAGONAL]) },
  { type: "r", at: [2, 2], dots: slide(STRAIGHT) },
  { type: "b", at: [2, 2], dots: slide(DIAGONAL) },
  {
    type: "n",
    at: [2, 2],
    dots: [
      [1, 0],
      [3, 0],
      [0, 1],
      [4, 1],
      [0, 3],
      [4, 3],
      [1, 4],
      [3, 4],
    ],
  },
  {
    // On its starting row: one or two squares forward, and a capture on either diagonal.
    type: "p",
    at: [2, 4],
    dots: [
      [2, 3],
      [2, 2],
    ],
    captures: [
      [1, 3],
      [3, 3],
    ],
  },
];

function MiniBoard({
  board,
  x,
  y,
}: {
  readonly board: PieceBoard;
  readonly x: number;
  readonly y: number;
}) {
  const square = ([col, row]: Square) => ({ x: x + col * CELL, y: y + row * CELL });
  return (
    <g>
      {Array.from({ length: SIZE * SIZE }, (_, index) => {
        const col = index % SIZE;
        const row = Math.floor(index / SIZE);
        return (
          <FigureSquare
            key={index}
            {...square([col, row])}
            size={CELL}
            light={(col + row) % 2 === 0}
          />
        );
      })}
      <FigurePiece colour="w" type={board.type} {...square(board.at)} size={CELL} />
      {board.captures?.map((at) => (
        <g key={`${String(at[0])}-${String(at[1])}`}>
          <FigurePiece colour="b" type="p" {...square(at)} size={CELL} />
          <FigureCaptureRing {...square(at)} size={CELL} />
        </g>
      ))}
      {board.dots.map((at) => (
        <FigureDot key={`${String(at[0])}-${String(at[1])}`} {...square(at)} size={CELL} />
      ))}
    </g>
  );
}

/** Six small boards, a piece on each and a dot on every square it can reach. */
export function MovesFigure({
  label,
  caption,
}: {
  readonly label: string;
  readonly caption: ReactNode;
}) {
  const span = SIZE * CELL;
  return (
    <RulesFigure
      label={label}
      caption={caption}
      viewBox={`0 0 ${String(3 * span + 2 * GAP)} ${String(2 * span + GAP)}`}
    >
      {BOARDS.map((board, index) => (
        <MiniBoard
          key={board.type}
          board={board}
          x={(index % 3) * (span + GAP)}
          y={Math.floor(index / 3) * (span + GAP)}
        />
      ))}
    </RulesFigure>
  );
}
