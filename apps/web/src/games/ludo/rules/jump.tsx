import { gateCell, type LudoColour, startCell } from "@board-games/games/ludo";
import type { ReactNode } from "react";

import { RulesArrow } from "@/features/rules/RulesArrow";
import { RulesFigure } from "@/features/rules/RulesFigure";

import { type Point, stepCells, TRACK_CELLS } from "../board-layout";
import { FigureCell, FigureHorse, GateMark } from "./parts";

const BLUE: LudoColour = 1;
/** The right arm of the real board: columns 9–14, rows 6–8. */
const ARM = { left: 9, top: 6, width: 6, height: 3 } as const;
/** How far down the second copy of the arm is drawn. */
const SECOND = 3.9;

const inArm = ([row, col]: readonly [number, number]) =>
  col >= ARM.left && col < ARM.left + ARM.width && row >= ARM.top && row < ARM.top + ARM.height;
const centreOf = (track: number): Point => {
  const [row, col] = TRACK_CELLS[track] ?? [0, 0];
  return { x: col + 0.5, y: row + 0.5 };
};
const below = ({ x, y }: Point): Point => ({ x, y: y + SECOND });

/** Track squares of Red's way on this arm (Red's start square is track 0). */
const RED_AT = 8;
const BLOCKER_AT = 10;
const GATE = gateCell(BLUE);

/** The arm's cells: its track cells, Blue's start square and home entry, Blue's steps. */
function Arm({ dy }: { readonly dy: number }) {
  const [gateRow, gateCol] = TRACK_CELLS[GATE] ?? [0, 0];
  const [startRow, startCol] = TRACK_CELLS[startCell(BLUE)] ?? [0, 0];
  return (
    <g transform={`translate(0 ${String(dy)})`}>
      {TRACK_CELLS.filter(inArm).map(([row, col]) => (
        <FigureCell
          key={`${String(row)}-${String(col)}`}
          x={col}
          y={row}
          colour={row === startRow && col === startCol ? "blue" : undefined}
        />
      ))}
      {stepCells(BLUE)
        .filter(inArm)
        .map(([row, col], index) => (
          <FigureCell key={`step-${String(index)}`} x={col} y={row} colour="blue" />
        ))}
      <GateMark x={gateCol} y={gateRow} colour="blue" />
    </g>
  );
}

/**
 * Rolling a 1, on the right arm of the real board (`board-layout.ts`): above, the way to the next
 * home entry is clear, so the Red horse jumps there and sends the Yellow horse on it home; below, a
 * Blue horse is in the way, so the Red horse only moves one square.
 */
export function JumpFigure({
  label,
  caption,
}: {
  readonly label: string;
  readonly caption: ReactNode;
}) {
  const red = centreOf(RED_AT);
  const gate = centreOf(GATE);
  return (
    <RulesFigure
      label={label}
      caption={caption}
      viewBox={`${String(ARM.left - 0.15)} ${String(ARM.top - 0.95)} ${String(ARM.width + 0.3)} ${String(ARM.height + SECOND + 1.1)}`}
    >
      <Arm dy={0} />
      <FigureHorse colour="yellow" at={gate} leaving />
      <FigureHorse colour="red" at={red} />
      <RulesArrow gap={0.45} width={0.08} from={red} to={gate} bend={-1.3} />

      <Arm dy={SECOND} />
      <FigureHorse colour="blue" at={below(centreOf(BLOCKER_AT))} />
      <FigureHorse colour="red" at={below(red)} />
      <RulesArrow
        gap={0.45}
        width={0.08}
        from={below(red)}
        to={below(centreOf(RED_AT + 1))}
        bend={-0.5}
      />
    </RulesFigure>
  );
}
