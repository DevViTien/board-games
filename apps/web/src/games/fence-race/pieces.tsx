import type { PlayerIndex } from "@board-games/engine";
import type { Fence, FenceRaceCell, FenceRaceSide } from "@board-games/games/fence-race";
import { cn } from "@board-games/ui";
import type { ReactNode } from "react";

import {
  type BoardGeometry,
  boardHeight,
  boardWidth,
  cellCentre,
  type Point,
} from "./board-geometry";
import {
  edgeCellName,
  fenceFrame,
  fieldRows,
  gatePath,
  gatePost,
  gateTransform,
  hatPlaces,
  labelSize,
  n1,
  plotKind,
  plotTurned,
} from "./board-layout";
import {
  PIECE_FILL,
  PIECE_INK_FILL,
  PIECE_INK_STROKE,
  PIECE_LINE_STROKE,
  PIECE_TINT_FILL,
  seatColour,
} from "./piece-style";

// Cờ rào's drawings: the fields, the village gates of the goal edges, the conical hats that are the
// pawns (seen from above), the inked fences. Every colour is a token. Nothing here decides a rule; a
// board or a figure says what to show. Drawn in pixels of the board at its size on screen.

const FIELD_FILL = ["fill-game-board", "fill-(--fence-race-plot-2)", "fill-(--fence-race-plot-3)"];

/** The fields, in rows and columns with dikes between them, on a mat of paper if `mat`. */
export function Fields({ geometry, mat = true }: { geometry: BoardGeometry; mat?: boolean }) {
  const { rows, columns, cell, gutter } = geometry;
  const width = boardWidth(geometry);
  const height = boardHeight(geometry);
  const dike = Math.max(1.25, cell * 0.045);
  const corner = n1(Math.max(1.5, cell * 0.07));
  const plots: ReactNode[] = [];
  const furrows: string[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const { x, y } = cellCentre(geometry, { row, col });
      const kind = plotKind(row, col, rows);
      plots.push(
        <rect
          key={`${row}:${col}`}
          x={n1(x - cell / 2 + dike / 2)}
          y={n1(y - cell / 2 + dike / 2)}
          width={n1(cell - dike)}
          height={n1(cell - dike)}
          rx={corner}
          className={FIELD_FILL[kind]}
        />,
      );
      furrows.push(fieldRows(kind, plotTurned(row, col, rows), x, y, cell));
    }
  }
  return (
    <>
      {mat && (
        <rect
          x="0.75"
          y="0.75"
          width={n1(width - 1.5)}
          height={n1(height - 1.5)}
          rx={n1(Math.min(14, cell * 0.34))}
          strokeWidth="1.5"
          className="fill-game-tint stroke-(--fence-race-frame)"
        />
      )}
      <rect
        x={gutter}
        y={gutter}
        width={n1(columns * cell)}
        height={n1(rows * cell)}
        className="fill-game-line"
      />
      {plots}
      {/* The rows in the fields, decorative: one path, however many fields. */}
      <path
        d={furrows.join("")}
        fill="none"
        strokeWidth={n1(Math.max(0.8, cell * 0.028))}
        strokeLinecap="round"
        className="stroke-(--fence-race-row)"
      />
    </>
  );
}

/** A seat's symbol, so seats differ without colour: ● ■ ▲ ◆, about `size` across. */
function SeatSymbol({
  player,
  x,
  y,
  size,
  className,
}: {
  player: PlayerIndex;
  x: number;
  y: number;
  size: number;
  className: string;
}) {
  switch (seatColour(player)) {
    case "red":
      return <circle cx={n1(x)} cy={n1(y)} r={n1(size * 0.5)} className={className} />;
    case "blue": {
      const side = size * 0.86;
      return (
        <rect
          x={n1(x - side / 2)}
          y={n1(y - side / 2)}
          width={n1(side)}
          height={n1(side)}
          className={className}
        />
      );
    }
    case "yellow": {
      const half = size * 0.62;
      return (
        <path
          d={`M${n1(x)} ${n1(y - half)}L${n1(x + half * 1.05)} ${n1(y + half * 0.8)}L${n1(x - half * 1.05)} ${n1(y + half * 0.8)}Z`}
          className={className}
        />
      );
    }
    case "green": {
      const half = size * 0.66;
      return (
        <path
          d={`M${n1(x)} ${n1(y - half)}L${n1(x + half)} ${n1(y)}L${n1(x)} ${n1(y + half)}L${n1(x - half)} ${n1(y)}Z`}
          className={className}
        />
      );
    }
  }
}

/** A pawn: a conical hat seen from above, the seat's symbol at its peak. */
export function Hat({
  player,
  x,
  y,
  radius,
  turn = false,
  small = false,
}: {
  player: PlayerIndex;
  x: number;
  y: number;
  radius: number;
  /** The ring of the seat to move. */
  turn?: boolean;
  /** Without the ribs, the symbol larger: several in one cell. */
  small?: boolean;
}) {
  const colour = seatColour(player);
  const rib = n1(Math.max(0.7, radius * 0.055));
  return (
    <>
      {turn && (
        <>
          <circle
            cx={n1(x)}
            cy={n1(y)}
            r={n1(radius + 3.5)}
            fill="none"
            strokeWidth="5"
            className="stroke-(--fence-race-halo)"
          />
          <circle
            cx={n1(x)}
            cy={n1(y)}
            r={n1(radius + 3.5)}
            fill="none"
            strokeWidth="2.25"
            className="stroke-game-highlight"
          />
        </>
      )}
      <circle
        cx={n1(x)}
        cy={n1(y)}
        r={n1(radius)}
        strokeWidth={n1(Math.max(1.5, radius * 0.12))}
        className={cn(PIECE_FILL[colour], "stroke-piece-edge")}
      />
      {!small &&
        [0.83, 0.62].map((ring) => (
          <circle
            key={ring}
            cx={n1(x)}
            cy={n1(y)}
            r={n1(radius * ring)}
            fill="none"
            strokeOpacity="0.55"
            strokeWidth={rib}
            className={PIECE_INK_STROKE[colour]}
          />
        ))}
      <SeatSymbol
        player={player}
        x={x}
        y={y}
        size={small ? radius * 1.12 : radius * 0.72}
        className={PIECE_INK_FILL[colour]}
      />
    </>
  );
}

/**
 * Every pawn in one cell, each still showing its symbol. Alone, the seat to move has a ring; among
 * others, a ring would hide its neighbours, so the frame around the cell says it (`ShareFrame`).
 */
export function HatsInCell({
  geometry,
  cell,
  players,
  turn,
}: {
  geometry: BoardGeometry;
  cell: FenceRaceCell;
  players: readonly PlayerIndex[];
  turn: PlayerIndex | null;
}) {
  const places = hatPlaces(geometry, cell, players.length);
  return (
    <>
      {players.map((player, index) => {
        const place = places[index];
        if (place === undefined) return null;
        return (
          <g key={player} data-pawn={player}>
            <Hat
              player={player}
              x={place.x}
              y={place.y}
              radius={place.radius}
              turn={players.length === 1 && player === turn}
              small={players.length > 1}
            />
          </g>
        );
      })}
    </>
  );
}

function FenceBody({
  thick,
  length,
  fillClass,
  halo,
}: {
  thick: number;
  length: number;
  fillClass: string;
  halo: boolean;
}) {
  return (
    <>
      {halo && (
        <rect
          x={n1(-length / 2 - 1.5)}
          y={n1(-thick / 2 - 1.5)}
          width={n1(length + 3)}
          height={n1(thick + 3)}
          rx={n1(thick / 2 + 1.5)}
          className="fill-(--fence-race-halo)"
        />
      )}
      <rect
        x={n1(-length / 2)}
        y={n1(-thick / 2)}
        width={n1(length)}
        height={n1(thick)}
        rx={n1(thick / 2)}
        className={fillClass}
      />
      {[-length * 0.25, 0, length * 0.25].map((knot) => (
        <g key={knot}>
          <rect
            x={n1(knot - thick * 0.36)}
            y={n1(-thick / 2 - thick * 0.17)}
            width={n1(thick * 0.72)}
            height={n1(thick * 1.34)}
            rx={n1(thick * 0.26)}
            className={fillClass}
          />
          <line
            x1={n1(knot)}
            y1={n1(-thick * 0.42)}
            x2={n1(knot)}
            y2={n1(thick * 0.42)}
            strokeWidth={n1(Math.max(1, thick * 0.16))}
            className="stroke-(--fence-race-halo)"
          />
        </g>
      ))}
    </>
  );
}

/** A fence that stands. `just`: the one just placed, in a dashed frame. */
export function Wall({
  geometry,
  fence,
  just = false,
}: {
  geometry: BoardGeometry;
  fence: Fence;
  just?: boolean;
}) {
  const { thick, length, transform } = fenceFrame(geometry, fence);
  const pad = thick * 0.95;
  const frame = {
    x: n1(-length / 2 - pad),
    y: n1(-thick / 2 - pad),
    width: n1(length + 2 * pad),
    height: n1(thick + 2 * pad),
    rx: n1(thick / 2 + pad),
  };
  return (
    <g
      transform={transform}
      data-wall={`${fence.dir}:${fence.row}:${fence.col}`}
      data-just={just || undefined}
    >
      <FenceBody thick={thick} length={length} fillClass="fill-(--fence-race-wall)" halo />
      {just && (
        <>
          <rect {...frame} fill="none" strokeWidth="3.5" className="stroke-(--fence-race-halo)" />
          <rect
            {...frame}
            fill="none"
            strokeWidth="1.75"
            strokeDasharray="5 3.5"
            className="stroke-game-last-move"
          />
        </>
      )}
    </g>
  );
}

/** The fence being tried: the accent, whole, with a round handle at each end. */
export function PreviewFence({ geometry, fence }: { geometry: BoardGeometry; fence: Fence }) {
  const { thick, length, transform } = fenceFrame(geometry, fence);
  return (
    <g transform={transform} data-preview="ok">
      <rect
        x={n1(-length / 2 - 2)}
        y={n1(-thick / 2 - 2)}
        width={n1(length + 4)}
        height={n1(thick + 4)}
        rx={n1(thick / 2 + 2)}
        className="fill-(--fence-race-halo)"
      />
      <rect
        x={n1(-length / 2)}
        y={n1(-thick / 2)}
        width={n1(length)}
        height={n1(thick)}
        rx={n1(thick / 2)}
        className="fill-(--fence-race-preview)"
      />
      {[-length / 2, length / 2].map((end) => (
        <circle
          key={end}
          cx={n1(end)}
          cy="0"
          r={n1(thick * 0.82)}
          strokeWidth={n1(Math.max(2, thick * 0.36))}
          className="fill-(--fence-race-halo) stroke-(--fence-race-preview)"
        />
      ))}
    </g>
  );
}

/** A fence that may not go there: another shape. Hollow, broken in two, crossed out in the middle. */
export function BadFence({ geometry, fence }: { geometry: BoardGeometry; fence: Fence }) {
  const { thick, length, transform, along } = fenceFrame(geometry, fence);
  const gap = thick * 1.5;
  const part = length / 2 - gap;
  const radius = thick * 1.05;
  const arm = radius * 0.46;
  return (
    <g transform={transform} data-preview="bad">
      {[-length / 2, gap].map((start) => (
        <rect
          key={start}
          x={n1(start)}
          y={n1(-thick / 2)}
          width={n1(part)}
          height={n1(thick)}
          rx={n1(thick / 2)}
          strokeWidth="2"
          strokeDasharray="3.5 2.5"
          className="fill-(--fence-race-halo) stroke-(--fence-race-bad)"
        />
      ))}
      <circle r={n1(radius + 1.5)} className="fill-(--fence-race-halo)" />
      <circle r={n1(radius)} className="fill-(--fence-race-bad)" />
      <path
        transform={along ? undefined : "rotate(-90)"}
        d={`M${n1(-arm)} ${n1(-arm)}L${n1(arm)} ${n1(arm)}M${n1(arm)} ${n1(-arm)}L${n1(-arm)} ${n1(arm)}`}
        strokeWidth={n1(Math.max(1.75, thick * 0.32))}
        strokeLinecap="round"
        className="stroke-(--fence-race-bad-ink)"
      />
    </g>
  );
}

/** The fence chosen to break: still inked, ringed in the accent, a crack across its middle. */
export function ChosenFence({ geometry, fence }: { geometry: BoardGeometry; fence: Fence }) {
  const { thick, length, transform } = fenceFrame(geometry, fence);
  const pad = thick * 0.8;
  const frame = {
    x: n1(-length / 2 - pad),
    y: n1(-thick / 2 - pad),
    width: n1(length + 2 * pad),
    height: n1(thick + 2 * pad),
    rx: n1(thick / 2 + pad),
  };
  const crack = thick * 0.95;
  return (
    <g transform={transform} data-chosen="">
      <rect {...frame} className="fill-(--fence-race-halo)" />
      <FenceBody thick={thick} length={length} fillClass="fill-(--fence-race-wall)" halo={false} />
      <path
        d={`M${n1(-thick * 0.2)} ${n1(-crack)}L${n1(thick * 0.26)} ${n1(-crack * 0.3)}L${n1(-thick * 0.26)} ${n1(crack * 0.3)}L${n1(thick * 0.2)} ${n1(crack)}`}
        fill="none"
        strokeWidth={n1(thick * 0.55)}
        strokeLinejoin="round"
        className="stroke-(--fence-race-halo)"
      />
      <rect {...frame} fill="none" strokeWidth="2.5" className="stroke-(--fence-race-preview)" />
    </g>
  );
}

/** Where a fence was just broken: its outline, dashed, and nothing inside. */
export function GoneFence({ geometry, fence }: { geometry: BoardGeometry; fence: Fence }) {
  const { thick, length, transform } = fenceFrame(geometry, fence);
  const box = {
    x: n1(-length / 2),
    y: n1(-thick / 2),
    width: n1(length),
    height: n1(thick),
    rx: n1(thick / 2),
  };
  return (
    <g transform={transform} data-gone="">
      <rect
        {...box}
        strokeWidth="3"
        className="fill-(--fence-race-halo) stroke-(--fence-race-halo)"
      />
      <rect
        {...box}
        fill="none"
        strokeWidth="1.75"
        strokeDasharray="4 3"
        className="stroke-game-last-move"
      />
    </g>
  );
}

/** A cell the pawn can step to: a dot, or, on another pawn, a frame around the cell. */
export function TargetMark({
  geometry,
  cell,
  occupied,
}: {
  geometry: BoardGeometry;
  cell: FenceRaceCell;
  occupied: boolean;
}) {
  const { x, y } = cellCentre(geometry, cell);
  const size = geometry.cell;
  if (occupied) {
    const half = size * 0.43;
    const box = {
      x: n1(x - half),
      y: n1(y - half),
      width: n1(half * 2),
      height: n1(half * 2),
      rx: n1(size * 0.12),
    };
    return (
      <g data-target="">
        <rect {...box} fill="none" strokeWidth="4" className="stroke-(--fence-race-halo)" />
        <rect {...box} fill="none" strokeWidth="2" className="stroke-game-highlight" />
      </g>
    );
  }
  const radius = Math.max(4, size * 0.155);
  return (
    <g data-target="">
      <circle cx={n1(x)} cy={n1(y)} r={n1(radius + 2)} className="fill-(--fence-race-halo)" />
      <circle cx={n1(x)} cy={n1(y)} r={n1(radius)} className="fill-game-highlight" />
    </g>
  );
}

function CellFrame({
  at,
  half,
  corner,
  halo,
  stroke,
  dash,
  width,
}: {
  at: Point;
  half: number;
  corner: number;
  halo: number;
  stroke: string;
  dash?: string;
  width: number;
}) {
  const box = {
    x: n1(at.x - half),
    y: n1(at.y - half),
    width: n1(half * 2),
    height: n1(half * 2),
    rx: n1(corner),
  };
  return (
    <>
      <rect {...box} fill="none" strokeWidth={halo} className="stroke-(--fence-race-halo)" />
      <rect {...box} fill="none" strokeWidth={width} strokeDasharray={dash} className={stroke} />
    </>
  );
}

/** The cell a pawn just left: a dashed square. */
export function LeftMark({ geometry, cell }: { geometry: BoardGeometry; cell: FenceRaceCell }) {
  return (
    <g data-left="">
      <CellFrame
        at={cellCentre(geometry, cell)}
        half={geometry.cell * 0.34}
        corner={geometry.cell * 0.1}
        halo={3.5}
        stroke="stroke-game-last-move"
        width={1.75}
        dash="4 3"
      />
    </g>
  );
}

/** The seat to move among pawns sharing a cell: a square frame, as a ring would cover a neighbour. */
export function ShareFrame({ geometry, cell }: { geometry: BoardGeometry; cell: FenceRaceCell }) {
  return (
    <g data-share="">
      <CellFrame
        at={cellCentre(geometry, cell)}
        half={geometry.cell * 0.485}
        corner={geometry.cell * 0.1}
        halo={4}
        stroke="stroke-game-highlight"
        width={2}
      />
    </g>
  );
}

/** The cell a winner reached: a thick frame in the win colour on a paper edge, four stars. */
export function GoalMark({ geometry, cell }: { geometry: BoardGeometry; cell: FenceRaceCell }) {
  const { x, y } = cellCentre(geometry, cell);
  const half = geometry.cell * 0.47;
  const box = {
    x: n1(x - half),
    y: n1(y - half),
    width: n1(half * 2),
    height: n1(half * 2),
    rx: n1(geometry.cell * 0.1),
  };
  const size = geometry.cell * 0.2;
  const star = (cx: number, cy: number) =>
    `M${n1(cx)} ${n1(cy - size)}L${n1(cx + size * 0.3)} ${n1(cy - size * 0.3)}L${n1(cx + size)} ${n1(cy)}L${n1(cx + size * 0.3)} ${n1(cy + size * 0.3)}L${n1(cx)} ${n1(cy + size)}L${n1(cx - size * 0.3)} ${n1(cy + size * 0.3)}L${n1(cx - size)} ${n1(cy)}L${n1(cx - size * 0.3)} ${n1(cy - size * 0.3)}Z`;
  return (
    <g data-goal="">
      <rect {...box} strokeWidth="6" className="fill-celebration-soft stroke-(--fence-race-halo)" />
      <rect {...box} fill="none" strokeWidth="3" className="stroke-game-win" />
      {[
        [x - half, y - half],
        [x + half, y - half],
        [x - half, y + half],
        [x + half, y + half],
      ].map(([cx = 0, cy = 0]) => (
        <path
          key={`${cx}:${cy}`}
          d={star(cx, cy)}
          strokeWidth="1"
          className="fill-game-win stroke-(--fence-race-halo)"
        />
      ))}
    </g>
  );
}

/** A shortest way, as a dotted line of the seat's colour on a paper edge. */
export function WayLine({
  geometry,
  player,
  cells,
}: {
  geometry: BoardGeometry;
  player: PlayerIndex;
  cells: readonly FenceRaceCell[];
}) {
  if (cells.length < 2) return null;
  const points = cells
    .map((cell) => {
      const { x, y } = cellCentre(geometry, cell);
      return `${n1(x)} ${n1(y)}`;
    })
    .join("L");
  const width = Math.max(2.5, geometry.cell * 0.09);
  const dash = `0.1 ${n1(width * 2.4)}`;
  const line = {
    d: `M${points}`,
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeDasharray: dash,
  } as const;
  return (
    <g data-way={player}>
      <path {...line} strokeWidth={n1(width + 2.5)} className="stroke-(--fence-race-halo)" />
      <path {...line} strokeWidth={n1(width)} className={PIECE_LINE_STROKE[seatColour(player)]} />
    </g>
  );
}

/** The cell at `index` along an edge of the screen, and a place across its mat. */
function edgePoint(
  geometry: BoardGeometry,
  side: FenceRaceSide,
  along: number,
  across: number,
): Point {
  const width = boardWidth(geometry);
  const height = boardHeight(geometry);
  switch (side) {
    case "top":
      return { x: along, y: across };
    case "bottom":
      return { x: along, y: height - across };
    case "left":
      return { x: across, y: along };
    case "right":
      return { x: width - across, y: along };
  }
}

/**
 * One village gate over cells of an edge of the screen: two posts carrying the seat's symbol, and a
 * long roof between them. The seat to move (`active`) has it in full colour, the others in a tint.
 */
export function Gate({
  geometry,
  player,
  side,
  active,
  labels = true,
  first = 2,
  count = 5,
}: {
  geometry: BoardGeometry;
  player: PlayerIndex;
  side: FenceRaceSide;
  active: boolean;
  labels?: boolean;
  first?: number;
  count?: number;
}) {
  const colour = seatColour(player);
  const { cell, gutter } = geometry;
  const post = gatePost(cell, gutter);
  const start = gutter + first * cell - post;
  const end = gutter + (first + count) * cell + post;
  const width = boardWidth(geometry);
  const height = boardHeight(geometry);
  const textClass = active ? PIECE_INK_FILL[colour] : "fill-fg";
  const lineClass = active ? PIECE_INK_STROKE[colour] : PIECE_LINE_STROKE[colour];
  const size = labelSize(gutter);
  const symbolSize = Math.max(7.5, Math.min(gutter * 0.52, post * 0.72));
  return (
    <>
      <g
        transform={gateTransform(side, width, height)}
        data-gate={player}
        data-active={active || undefined}
      >
        <path
          d={gatePath(start, end, gutter, post, cell)}
          strokeWidth="1.25"
          strokeLinejoin="round"
          className={cn(
            active ? PIECE_FILL[colour] : PIECE_TINT_FILL[colour],
            PIECE_LINE_STROKE[colour],
          )}
        />
        {Array.from({ length: count + 1 }, (_unused, index) => {
          const x = gutter + (first + index) * cell;
          return (
            <line
              key={index}
              x1={n1(x)}
              y1={n1(gutter * 0.55)}
              x2={n1(x)}
              y2={n1(gutter)}
              strokeOpacity="0.45"
              strokeWidth="1"
              className={lineClass}
            />
          );
        })}
      </g>
      {labels &&
        Array.from({ length: count }, (_unused, index) => {
          const at = edgePoint(
            geometry,
            side,
            gutter + (first + index + 0.5) * cell,
            gutter * 0.64,
          );
          return (
            <text
              key={index}
              x={n1(at.x)}
              y={n1(at.y)}
              fontSize={n1(size)}
              fontWeight="700"
              textAnchor="middle"
              dominantBaseline="central"
              className={textClass}
            >
              {edgeCellName(geometry, side, first + index)}
            </text>
          );
        })}
      {[start + post / 2, end - post / 2].map((along) => {
        const at = edgePoint(geometry, side, along, gutter * 0.5);
        return (
          <SeatSymbol
            key={along}
            player={player}
            x={at.x}
            y={at.y}
            size={symbolSize}
            className={textClass}
          />
        );
      })}
    </>
  );
}

/**
 * The names along an edge outside any gate: on the paper, like a margin. `gated`: the 5 middle cells
 * are a gate's, and its neighbours step aside from its posts where a cell is small.
 */
export function EdgeNames({
  geometry,
  side,
  gated,
}: {
  geometry: BoardGeometry;
  side: FenceRaceSide;
  gated: boolean;
}) {
  const { rows, columns, cell, gutter } = geometry;
  const count = side === "top" || side === "bottom" ? columns : rows;
  const size = labelSize(gutter);
  return (
    <>
      {Array.from({ length: count }, (_unused, index) => {
        if (gated && index >= 2 && index <= 6) return null;
        let along = gutter + (index + 0.5) * cell;
        if (gated && (index === 1 || index === 7)) {
          const room = gatePost(cell, gutter) + size * 0.35 + 1 - cell / 2;
          if (room > 0) along += index === 1 ? -room : room;
        }
        const at = edgePoint(geometry, side, along, gutter * 0.5);
        return (
          <text
            key={index}
            x={n1(at.x)}
            y={n1(at.y)}
            fontSize={n1(size)}
            fontWeight="700"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-fg-muted"
          >
            {edgeCellName(geometry, side, index)}
          </text>
        );
      })}
    </>
  );
}
