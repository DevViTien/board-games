import {
  gateCell,
  LUDO_COLOUR_NAMES,
  type LudoColour,
  startCell,
  TRACK_LENGTH,
} from "@board-games/games/ludo";
import { cn } from "@board-games/ui";

import { RulesFigure } from "@/features/rules/RulesFigure";

import { GRID, type Point, stableOutline, stepCells, TRACK_CELLS } from "../board-layout";
import { ColourSymbol } from "../ColourSymbol";
import { PIECE_FILL } from "../piece-style";
import { FigureCell, GateMark } from "./parts";

const COLOURS = [0, 1, 2, 3] as const satisfies readonly LudoColour[];
const RED: LudoColour = 0;

const centreOf = ([row, col]: readonly [number, number]): Point => ({ x: col + 0.5, y: row + 0.5 });

/** Red's way, every cell from its start square once round to its home entry, then its steps. */
const RED_WAY: readonly Point[] = [
  ...Array.from({ length: TRACK_LENGTH }, (_, step) =>
    centreOf(TRACK_CELLS[(startCell(RED) + step) % TRACK_LENGTH] ?? [0, 0]),
  ),
  ...stepCells(RED).map(centreOf),
];

/** Where the arrows of the direction stand: on track cells only, every 7 cells of Red's way. */
const ARROW_STEPS = [3, 10, 17, 24, 31, 38, 45, 52] as const;

/** A small chevron on the cell of `step`, pointing to the next cell of Red's way. */
function Chevron({ step }: { readonly step: number }) {
  const at = RED_WAY[step] ?? { x: 0, y: 0 };
  const next = RED_WAY[step + 1] ?? at;
  const dx = next.x - at.x;
  const dy = next.y - at.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const tip = { x: at.x + ux * 0.22, y: at.y + uy * 0.22 };
  const back = { x: at.x - ux * 0.14, y: at.y - uy * 0.14 };
  const n = (value: number) => value.toFixed(3);
  return (
    <path
      d={`M${n(back.x - uy * 0.22)} ${n(back.y + ux * 0.22)}L${n(tip.x)} ${n(tip.y)}L${n(back.x + uy * 0.22)} ${n(back.y - ux * 0.22)}`}
      fill="none"
      strokeWidth="0.11"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="stroke-fg"
    />
  );
}

/**
 * The real board, small (`board-layout.ts`: the same 56 track cells, stables, start squares, home
 * entries and steps): Red's way drawn from its start square once round, clockwise, to its home
 * entry and up its six steps, the direction shown by chevrons on track cells only.
 */
export function PathFigure({
  label,
  caption,
}: {
  readonly label: string;
  readonly caption: string;
}) {
  const [startRow, startCol] = TRACK_CELLS[startCell(RED)] ?? [0, 0];
  const [gateRow, gateCol] = TRACK_CELLS[gateCell(RED)] ?? [0, 0];
  return (
    <RulesFigure
      label={label}
      caption={caption}
      viewBox={`-0.25 -0.25 ${String(GRID + 0.5)} ${String(GRID + 0.5)}`}
    >
      <rect x="0" y="0" width={GRID} height={GRID} rx="0.3" className="fill-game-tint" />
      {COLOURS.map((colour) => {
        const name = LUDO_COLOUR_NAMES[colour];
        return (
          <polygon
            key={`stable-${name}`}
            points={stableOutline(colour, 0.2)
              .map(({ x, y }) => `${String(x)},${String(y)}`)
              .join(" ")}
            className={cn(PIECE_FILL[name], colour !== RED && "opacity-40")}
          />
        );
      })}
      {TRACK_CELLS.map(([row, col], square) => (
        <FigureCell key={`track-${String(square)}`} x={col} y={row} />
      ))}
      {COLOURS.map((colour) =>
        stepCells(colour).map(([row, col], index) => (
          <FigureCell
            key={`step-${String(colour)}-${String(index)}`}
            x={col}
            y={row}
            colour={LUDO_COLOUR_NAMES[colour]}
            step={colour === RED ? index + 1 : undefined}
          />
        )),
      )}
      <polyline
        points={RED_WAY.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ")}
        fill="none"
        strokeWidth="0.14"
        strokeLinejoin="round"
        strokeLinecap="round"
        className="stroke-piece-red-line opacity-60"
      />
      {ARROW_STEPS.map((step) => (
        <Chevron key={step} step={step} />
      ))}
      {/* Red's start square: its symbol, large. */}
      <ColourSymbol
        colour="red"
        at={{ x: startCol + 0.5, y: startRow + 0.5 }}
        size={0.32}
        className="fill-piece-red stroke-piece-edge [stroke-width:0.05]"
      />
      {/* Red's home entry: its dashed frame, and an ink ring. */}
      <GateMark x={gateCol} y={gateRow} colour="red" />
      <circle
        cx={gateCol + 0.5}
        cy={gateRow + 0.5}
        r="0.42"
        fill="none"
        strokeWidth="0.1"
        className="stroke-fg"
      />
    </RulesFigure>
  );
}
