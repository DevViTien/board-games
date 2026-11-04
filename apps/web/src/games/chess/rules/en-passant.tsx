import type { ReactNode } from "react";

import { RulesArrow } from "@/features/rules/RulesArrow";
import { RulesFigure } from "@/features/rules/RulesFigure";

import {
  FigureCaptureRing,
  FigureCoordinates,
  FigurePiece,
  FigureSquare,
  isLightSquare,
} from "./parts";

const CELL = 24;
const LEFT = 14;
const TOP = 4;
/** Files c–f (2–5), ranks 7–5, top to bottom. */
const FILES = ["c", "d", "e", "f"] as const;
const FIRST_FILE = 2;
const RANKS = [7, 6, 5] as const;

const square = (file: number, rank: number) => ({
  x: LEFT + (file - FIRST_FILE) * CELL,
  y: TOP + (RANKS[0] - rank) * CELL,
});
const centre = (file: number, rank: number) => {
  const { x, y } = square(file, rank);
  return { x: x + CELL / 2, y: y + CELL / 2 };
};

const D = 3;
const E = 4;

/** Black has just played d7 → d5, beside White's pawn on e5, which takes it by moving to d6. */
export function EnPassantFigure({
  label,
  caption,
}: {
  readonly label: string;
  readonly caption: ReactNode;
}) {
  return (
    <RulesFigure
      label={label}
      caption={caption}
      viewBox={`0 0 ${String(LEFT + 4 * CELL + 4)} ${String(TOP + 3 * CELL + 14)}`}
    >
      {RANKS.map((rank) =>
        FILES.map((file, index) => (
          <FigureSquare
            key={`${file}${String(rank)}`}
            {...square(FIRST_FILE + index, rank)}
            size={CELL}
            light={isLightSquare(FIRST_FILE + index, rank)}
          />
        )),
      )}
      <FigureCoordinates files={FILES} ranks={RANKS} x={LEFT} y={TOP} size={CELL} />
      <FigurePiece colour="b" type="p" {...square(D, 7)} size={CELL} ghost />
      <FigurePiece colour="b" type="p" {...square(D, 5)} size={CELL} />
      <FigureCaptureRing {...square(D, 5)} size={CELL} />
      <FigurePiece colour="w" type="p" {...square(E, 5)} size={CELL} />
      <RulesArrow from={centre(D, 7)} to={centre(D, 5)} bend={-9} gap={8} width={1.5} dashed />
      <RulesArrow from={centre(E, 5)} to={centre(D, 6)} gap={7} width={1.6} />
    </RulesFigure>
  );
}
