import type { ReactNode } from "react";

import { RulesFigure } from "@/features/rules/RulesFigure";

import type { BoardGeometry } from "../board-layout";
import {
  BadFence,
  ChosenFence,
  Fields,
  Gate,
  GoneFence,
  Hat,
  PreviewFence,
  Wall,
  WayLine,
} from "../pieces";

// The rules' figures, drawn with the board's own pieces. Their fences are real: `Rules.test.tsx`
// checks each against the rules, and the steps in the words are what those rules count.

/** A little board, without a mat. */
function geometryOf(rows: number, columns: number, cell: number, gutter = 0): BoardGeometry {
  return { rows, columns, cell, gutter, turned: false };
}

interface FigureProps {
  readonly label: string;
  readonly caption: ReactNode;
}

/** The figures' positions, for the checks. */
export const GATE_FIGURE = {
  rows: 3,
  columns: 9,
  pawn: { row: 0, col: 1 },
  way: [
    { row: 0, col: 1 },
    { row: 0, col: 2 },
  ],
} as const;

/** The top edge: its gate over five cells, a pawn outside it that has one more step to go. */
export function GateFigure({ label, caption }: FigureProps) {
  const { rows, columns, way, pawn } = GATE_FIGURE;
  const cell = 36;
  const gutter = 18;
  const geometry = geometryOf(rows, columns, cell, gutter);
  return (
    <RulesFigure
      label={label}
      caption={caption}
      viewBox={`${gutter} 0 ${columns * cell} ${rows * cell + gutter}`}
    >
      <Fields geometry={geometry} mat={false} />
      <Gate geometry={geometry} player={0} side="top" active labels={false} />
      <WayLine geometry={geometry} player={0} cells={way} />
      <Hat
        player={0}
        x={gutter + (pawn.col + 0.5) * cell}
        y={gutter + (pawn.row + 0.5) * cell}
        radius={13}
      />
    </RulesFigure>
  );
}

/** A fence on a line; one overlapping another; one crossing another. */
export function PlaceFigure({
  label,
  caption,
  ok,
  overlap,
  cross,
}: FigureProps & { readonly ok: string; readonly overlap: string; readonly cross: string }) {
  const cell = 30;
  const side = cell * 3;
  const geometry = geometryOf(3, 3, cell);
  const standing = { row: 0, col: 0, dir: "h" } as const;
  const places = [0, side + 16, 2 * (side + 16)];
  return (
    <RulesFigure label={label} caption={caption} viewBox={`-6 -2 ${side * 3 + 44} ${side + 30}`}>
      <g transform={`translate(${places[0]} 0)`}>
        <Fields geometry={geometry} mat={false} />
        <PreviewFence geometry={geometry} fence={standing} />
        <Hat player={0} x={cell * 1.5} y={cell * 2.5} radius={cell * 0.36} />
      </g>
      <g transform={`translate(${places[1]} 0)`}>
        <Fields geometry={geometry} mat={false} />
        <Wall geometry={geometry} fence={standing} />
        <BadFence geometry={geometry} fence={{ row: 0, col: 1, dir: "h" }} />
      </g>
      <g transform={`translate(${places[2]} 0)`}>
        <Fields geometry={geometry} mat={false} />
        <Wall geometry={geometry} fence={standing} />
        <BadFence geometry={geometry} fence={{ row: 0, col: 0, dir: "v" }} />
      </g>
      <g fontSize="14" fontWeight="600" fill="currentColor" textAnchor="middle">
        <text x={side / 2} y={side + 20}>
          {ok}
        </text>
        <text x={side * 1.5 + 16} y={side + 20}>
          {overlap}
        </text>
        <text x={side * 2.5 + 32} y={side + 20}>
          {cross}
        </text>
      </g>
    </RulesFigure>
  );
}

/** The position of the figure of a sealed way. */
export const SEALED_FIGURE = {
  rows: 4,
  columns: 5,
  pawn: { row: 1, col: 4 },
  fences: [
    { row: 0, col: 3, dir: "h" },
    { row: 2, col: 3, dir: "h" },
  ],
  forbidden: { row: 1, col: 2, dir: "v" },
  way: [
    { row: 1, col: 4 },
    { row: 2, col: 4 },
    { row: 2, col: 3 },
    { row: 2, col: 2 },
    { row: 3, col: 2 },
  ],
} as const;

/** A pawn with one way out, and the fence that may not close it. */
export function SealedFigure({ label, caption }: FigureProps) {
  const { rows, columns, pawn, fences, forbidden, way } = SEALED_FIGURE;
  const cell = 34;
  const geometry = geometryOf(rows, columns, cell);
  return (
    <RulesFigure label={label} caption={caption} viewBox="-4 -4 178 144">
      <Fields geometry={geometry} mat={false} />
      <WayLine geometry={geometry} player={1} cells={way} />
      {fences.map((fence) => (
        <Wall key={`${fence.row}:${fence.col}`} geometry={geometry} fence={fence} />
      ))}
      <BadFence geometry={geometry} fence={forbidden} />
      <Hat
        player={1}
        x={(pawn.col + 0.5) * cell}
        y={(pawn.row + 0.5) * cell}
        radius={cell * 0.36}
      />
    </RulesFigure>
  );
}

/** The position of the figure of a break, before and after. */
export const BREAK_FIGURE = {
  rows: 5,
  columns: 5,
  pawn: { row: 4, col: 2 },
  broken: { row: 1, col: 1, dir: "h" },
  others: [
    { row: 1, col: 3, dir: "h" },
    { row: 3, col: 0, dir: "v" },
  ],
  wayBefore: [
    { row: 4, col: 2 },
    { row: 3, col: 2 },
    { row: 2, col: 2 },
    { row: 2, col: 1 },
    { row: 2, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: 0 },
  ],
  wayAfter: [
    { row: 4, col: 2 },
    { row: 3, col: 2 },
    { row: 2, col: 2 },
    { row: 1, col: 2 },
    { row: 0, col: 2 },
  ],
} as const;

/** The steps of the two ways, for the words of the rules. */
export const BREAK_STEPS = {
  before: BREAK_FIGURE.wayBefore.length - 1,
  after: BREAK_FIGURE.wayAfter.length - 1,
} as const;

/** A fence chosen and the way around it; the same board with it gone, and the shorter way. */
export function BreakFigure({
  label,
  caption,
  stepsBefore,
  stepsAfter,
}: FigureProps & { readonly stepsBefore: string; readonly stepsAfter: string }) {
  const { rows, columns, pawn, broken, others, wayBefore, wayAfter } = BREAK_FIGURE;
  const cell = 28;
  const side = cell * columns;
  const geometry = geometryOf(rows, columns, cell);
  const hat = (
    <Hat player={0} x={(pawn.col + 0.5) * cell} y={(pawn.row + 0.5) * cell} radius={cell * 0.36} />
  );
  return (
    <RulesFigure label={label} caption={caption} viewBox={`0 0 ${side * 2 + 44} ${side + 28}`}>
      <Fields geometry={geometry} mat={false} />
      <WayLine geometry={geometry} player={0} cells={wayBefore} />
      {others.map((fence) => (
        <Wall key={`${fence.row}:${fence.col}`} geometry={geometry} fence={fence} />
      ))}
      <ChosenFence geometry={geometry} fence={broken} />
      {hat}
      <path
        d={`M${side + 10} ${side / 2}H${side + 32}M${side + 26} ${side / 2 - 7}l7 7-7 7`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g transform={`translate(${side + 44} 0)`}>
        <Fields geometry={geometry} mat={false} />
        <WayLine geometry={geometry} player={0} cells={wayAfter} />
        {others.map((fence) => (
          <Wall key={`${fence.row}:${fence.col}`} geometry={geometry} fence={fence} />
        ))}
        <GoneFence geometry={geometry} fence={broken} />
        {hat}
      </g>
      <g fontSize="14" fontWeight="600" fill="currentColor" textAnchor="middle">
        <text x={side / 2} y={side + 20}>
          {stepsBefore}
        </text>
        <text x={side * 1.5 + 44} y={side + 20}>
          {stepsAfter}
        </text>
      </g>
    </RulesFigure>
  );
}
