import type { ReactNode } from "react";

import { RulesArrow } from "@/features/rules/RulesArrow";
import { RulesFigure } from "@/features/rules/RulesFigure";

import { FigureCoordinates, FigurePiece, FigureSquare, isLightSquare } from "./parts";

const CELL = 20;
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const LEFT = 12;
/** The top of the rank before castling, and after. */
const BEFORE = 30;
const AFTER = 80;

function Rank({ y }: { readonly y: number }) {
  return (
    <g>
      {FILES.map((file, index) => (
        <FigureSquare
          key={file}
          x={LEFT + index * CELL}
          y={y}
          size={CELL}
          light={isLightSquare(index, 1)}
        />
      ))}
      <FigureCoordinates files={FILES} ranks={[1]} x={LEFT} y={y} size={CELL} />
    </g>
  );
}

const square = (file: number, y: number) => ({ x: LEFT + file * CELL, y });
const centre = (file: number, y: number) => ({ x: LEFT + file * CELL + CELL / 2, y: y + CELL / 2 });

/** White's first rank before and after castling kingside: king e1 → g1, rook h1 → f1. */
export function CastlingFigure({
  label,
  caption,
}: {
  readonly label: string;
  readonly caption: ReactNode;
}) {
  return (
    <RulesFigure label={label} caption={caption} viewBox={`0 0 ${String(LEFT + 8 * CELL + 4)} 114`}>
      <Rank y={BEFORE} />
      <FigurePiece colour="w" type="r" {...square(0, BEFORE)} size={CELL} />
      <FigurePiece colour="w" type="k" {...square(4, BEFORE)} size={CELL} />
      <FigurePiece colour="w" type="r" {...square(7, BEFORE)} size={CELL} />
      <RulesArrow from={centre(4, BEFORE)} to={centre(6, BEFORE)} bend={-36} gap={7} width={1.4} />
      <RulesArrow
        from={centre(7, BEFORE)}
        to={centre(5, BEFORE)}
        bend={-20}
        gap={7}
        width={1.4}
        dashed
      />

      <Rank y={AFTER} />
      <FigurePiece colour="w" type="r" {...square(0, AFTER)} size={CELL} />
      <FigurePiece colour="w" type="r" {...square(5, AFTER)} size={CELL} />
      <FigurePiece colour="w" type="k" {...square(6, AFTER)} size={CELL} />
    </RulesFigure>
  );
}
