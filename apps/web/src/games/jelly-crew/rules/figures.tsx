import type { JellyCrewGroup, JellyCrewKind, JellyCrewPiece } from "@board-games/games/jelly-crew";
import type { ReactNode } from "react";

import { RulesFigure } from "@/features/rules/RulesFigure";

import { CELL, Character, Door, MoldUnder, PieceShape, Plate, r1, Wall } from "../pieces";

// The rules' figures: little boards drawn with the board's own pieces.

/** A little board: what never moves, and where everything stands. */
export interface Scene {
  readonly width: number;
  readonly height: number;
  readonly walls: readonly number[];
  readonly plates: readonly (readonly [number, JellyCrewGroup])[];
  /** Each door with whether it is drawn open. */
  readonly doors: readonly (readonly [number, JellyCrewGroup, boolean])[];
  readonly molds: readonly (readonly [number, JellyCrewKind])[];
  readonly chars: readonly number[];
  readonly pieces: readonly JellyCrewPiece[];
  /** The seat whose turn it is, ringed. */
  readonly now: number;
}

/**
 * Pink (seat 2) on plate ●, door ● open in a wall; Blue (seat 1) pushes strawberry jelly into the
 * door, towards a strawberry mold.
 */
export const HOLD_SCENE: Scene = {
  width: 7,
  height: 3,
  walls: [3, 17],
  plates: [[0, "circle"]],
  doors: [[10, "circle", true]],
  molds: [[12, "strawberry"]],
  chars: [9, 0],
  pieces: [{ cells: [10], kinds: ["strawberry"] }],
  now: 0,
};

/** Blue (seat 1) would push mango jelly right, but Pink (seat 2) stands just past it. */
export const BLOCKED_SCENE: Scene = {
  width: 5,
  height: 1,
  walls: [],
  plates: [],
  doors: [],
  molds: [],
  chars: [1, 3],
  pieces: [{ cells: [2], kinds: ["mango"] }],
  now: 0,
};

const NOTHING_SLID: ReadonlySet<number> = new Set();

function SceneLayers({ scene }: { scene: Scene }) {
  const { width, height } = scene;
  const xy = (at: number) => [(at % width) * CELL, Math.floor(at / width) * CELL] as const;
  const held = new Set([...scene.chars, ...scene.pieces.flatMap((piece) => piece.cells)]);
  return (
    <>
      <rect
        width={width * CELL}
        height={height * CELL}
        rx={CELL * 0.3}
        className="fill-game-board"
      />
      {scene.walls.map((at) => {
        const [x, y] = xy(at);
        return <Wall key={`w${at}`} x={x} y={y} />;
      })}
      {scene.molds.map(([at, kind]) => {
        const [x, y] = xy(at);
        return <MoldUnder key={`m${at}`} x={x} y={y} kind={kind} />;
      })}
      {scene.plates.map(([at, group]) => {
        const [x, y] = xy(at);
        return <Plate key={`p${at}`} x={x} y={y} group={group} held={held.has(at)} />;
      })}
      {scene.doors.map(([at, group, open]) => {
        const [x, y] = xy(at);
        return <Door key={`d${at}`} x={x} y={y} group={group} open={open} />;
      })}
      {scene.pieces.map((piece) => (
        <PieceShape key={piece.cells[0]} piece={piece} width={width} slid={NOTHING_SLID} />
      ))}
      {scene.chars.map((at, seat) => {
        const [x, y] = xy(at);
        const plate = scene.plates.find(([cell]) => cell === at)?.[1];
        return (
          <Character
            key={seat}
            cx={r1(x + CELL / 2)}
            cy={r1(y + CELL / 2)}
            seat={seat}
            now={seat === scene.now}
            plate={plate}
          />
        );
      })}
    </>
  );
}

interface FigureProps {
  readonly label: string;
  readonly caption: ReactNode;
}

function SceneFigure({ scene, label, caption }: FigureProps & { scene: Scene }) {
  return (
    <RulesFigure
      label={label}
      caption={caption}
      viewBox={`0 0 ${scene.width * CELL} ${scene.height * CELL}`}
    >
      <SceneLayers scene={scene} />
    </RulesFigure>
  );
}

export function HoldFigure(props: FigureProps) {
  return <SceneFigure scene={HOLD_SCENE} {...props} />;
}

export function BlockedFigure(props: FigureProps) {
  return <SceneFigure scene={BLOCKED_SCENE} {...props} />;
}
