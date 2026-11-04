import type { ReactNode } from "react";

import { RulesFigure } from "@/features/rules/RulesFigure";

import { CaroCellMark, CaroWinStroke } from "./strip";

const CELL = 20;
const COLS = 10;
const ROWS = 7;
/** Five X on a diagonal, from column 2, row 1. */
const XS = [0, 1, 2, 3, 4].map((step) => [2 + step, 1 + step] as const);
const OS = [
  [1, 4],
  [3, 6],
  [5, 3],
  [7, 2],
] as const;

const at = (index: number) => 5 + index * CELL;

/** A corner of the board: five X in a row on a diagonal, which wins. */
export function FiveFigure({
  label,
  caption,
}: {
  readonly label: string;
  readonly caption: ReactNode;
}) {
  return (
    <RulesFigure label={label} caption={caption} viewBox="0 0 210 150">
      {Array.from({ length: ROWS }, (_, row) =>
        Array.from({ length: COLS }, (_unused, col) => (
          <rect
            key={`${String(row)}-${String(col)}`}
            x={at(col)}
            y={at(row)}
            width={CELL}
            height={CELL}
            strokeWidth="1"
            className="fill-game-board stroke-game-line"
          />
        )),
      )}
      {XS.map(([col, row]) => (
        <CaroCellMark key={`x${String(col)}`} mark="x" x={at(col)} y={at(row)} size={CELL} />
      ))}
      {OS.map(([col, row]) => (
        <CaroCellMark key={`o${String(col)}`} mark="o" x={at(col)} y={at(row)} size={CELL} />
      ))}
      <CaroWinStroke from={[at(2) + 3, at(1) + 3]} to={[at(7) - 3, at(6) - 3]} />
    </RulesFigure>
  );
}
