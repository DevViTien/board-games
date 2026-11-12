import {
  type JellyCrewBoard,
  type JellyCrewLayout,
  jellyCrewOpenDoors,
  type JellyCrewTrail,
} from "@board-games/games/jelly-crew";
import { cn } from "@board-games/ui";
import type { Ref } from "react";

import {
  CELL,
  Character,
  Door,
  MoldOver,
  MoldUnder,
  PieceShape,
  Plate,
  r1,
  SEAT_FILL,
  Wall,
} from "./pieces";

/** What the static board needs of a layout: what never moves. */
type CrewGrid = Pick<JellyCrewLayout, "width" | "height" | "walls" | "plates" | "doors" | "molds">;

interface CrewBoardLayersProps {
  readonly grid: CrewGrid;
  readonly board: JellyCrewBoard;
  /** The seat whose turn it is, ringed; `null` once the game is over. */
  readonly now: number | null;
  /** Where the latest turn's character walked, dotted in its colour. */
  readonly trail?: JellyCrewTrail | null;
  /** Cells of jelly that slid in the move shown, and whether the mover's character did. */
  readonly slid?: ReadonlySet<number>;
  readonly moverSlid?: number | null;
}

interface CrewBoardSvgProps extends CrewBoardLayersProps {
  readonly svgRef?: Ref<SVGSVGElement>;
  readonly className?: string;
}

/** The board as one SVG (see `CrewBoardLayers`), as wide as its room. */
export function CrewBoardSvg({ svgRef, className, ...layers }: CrewBoardSvgProps) {
  const { width, height } = layers.grid;
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width * CELL} ${height * CELL}`}
      aria-hidden
      data-crew-board=""
      className={cn("block h-auto w-full select-none", className)}
    >
      <CrewBoardLayers {...layers} />
    </svg>
  );
}

/**
 * The whole map in drawing units (`CELL` a cell), decorative (the board's description and the move announcements say the
 * same): floor and grid, walls, molds, plates and doors, the trail, the jellies, a mold's outline
 * over what lies on it, the characters. Layers from the bottom, as design §6 lists them.
 */
function CrewBoardLayers({
  grid,
  board,
  now,
  trail = null,
  slid = new Set(),
  moverSlid = null,
}: CrewBoardLayersProps) {
  const { width, height } = grid;
  const viewWidth = width * CELL;
  const viewHeight = height * CELL;
  const xy = (at: number) => [(at % width) * CELL, Math.floor(at / width) * CELL] as const;
  const open = jellyCrewOpenDoors(grid, board);
  const held = new Set(board.chars);
  const kindAt = new Map<number, string>();
  for (const piece of board.pieces) {
    piece.cells.forEach((at, index) => {
      held.add(at);
      kindAt.set(at, piece.kinds[index] ?? "");
    });
  }

  return (
    <>
      <rect width={viewWidth} height={viewHeight} rx={CELL * 0.3} className="fill-game-board" />
      {Array.from({ length: height - 1 }, (_, row) => (
        <path
          key={`h${row}`}
          d={`M0 ${(row + 1) * CELL}H${viewWidth}`}
          strokeWidth={1}
          className="stroke-(--jelly-crew-grid)"
        />
      ))}
      {Array.from({ length: width - 1 }, (_, col) => (
        <path
          key={`v${col}`}
          d={`M${(col + 1) * CELL} 0V${viewHeight}`}
          strokeWidth={1}
          className="stroke-(--jelly-crew-grid)"
        />
      ))}
      {[...grid.walls].map((at) => {
        const [x, y] = xy(at);
        return <Wall key={`w${at}`} x={x} y={y} />;
      })}
      {[...grid.molds].map(([at, kind]) => {
        const [x, y] = xy(at);
        return <MoldUnder key={`m${at}`} x={x} y={y} kind={kind} />;
      })}
      {[...grid.plates].map(([at, group]) => {
        const [x, y] = xy(at);
        return <Plate key={`p${at}`} x={x} y={y} group={group} held={held.has(at)} />;
      })}
      {[...grid.doors].map(([at, group]) => {
        const [x, y] = xy(at);
        return <Door key={`d${at}`} x={x} y={y} group={group} open={open.has(at)} />;
      })}
      {(trail?.cells ?? []).slice(0, -1).map((at, index) => {
        const [x, y] = xy(at);
        return (
          <circle
            key={`t${index}:${at}`}
            data-trail=""
            cx={r1(x + CELL / 2)}
            cy={r1(y + CELL / 2)}
            r={r1(CELL * 0.1)}
            opacity={0.7}
            className={SEAT_FILL[trail?.seat ?? 0] ?? SEAT_FILL[0]}
          />
        );
      })}
      {board.pieces.map((piece) => (
        <g
          key={piece.cells[0] ?? 0}
          data-piece={piece.kinds.join(" ")}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        >
          <PieceShape piece={piece} width={width} slid={slid} />
        </g>
      ))}
      {[...grid.molds].map(([at, kind]) => {
        const on = kindAt.get(at);
        if (on === undefined) return null;
        const [x, y] = xy(at);
        return <MoldOver key={`o${at}`} x={x} y={y} fitted={on === kind} />;
      })}
      {board.chars.map((at, seat) => {
        const [x, y] = xy(at);
        return (
          <g
            key={`c${seat}`}
            data-char={seat + 1}
            {...(seat === now && { "data-now": "" })}
            {...(moverSlid === seat && { "data-slide": "" })}
          >
            <Character
              cx={r1(x + CELL / 2)}
              cy={r1(y + CELL / 2)}
              seat={seat}
              now={seat === now}
              plate={grid.plates.get(at)}
            />
          </g>
        );
      })}
    </>
  );
}
