import type { ChessPieceType } from "@board-games/games/chess";
import type { ReactNode } from "react";

import { RulesArrow } from "@/features/rules/RulesArrow";
import { RulesFigure } from "@/features/rules/RulesFigure";

import { FigureCoordinates, FigurePiece, FigureSquare, isLightSquare } from "./parts";

const CELL = 24;
const LEFT = 14;
const TOP = 4;
/** Files d–f (3–5), ranks 8–7. */
const FILES = ["d", "e", "f"] as const;
const FIRST_FILE = 3;
const RANKS = [8, 7] as const;
const E = 4;
/** The four pieces a pawn may become, as the promotion picker offers them. */
const CHOICES: readonly ChessPieceType[] = ["q", "r", "b", "n"];
const CHOICE = 24;
const CHOICES_LEFT = LEFT + 3 * CELL + 18;

const square = (file: number, rank: number) => ({
  x: LEFT + (file - FIRST_FILE) * CELL,
  y: TOP + (RANKS[0] - rank) * CELL,
});
const centre = (file: number, rank: number) => {
  const { x, y } = square(file, rank);
  return { x: x + CELL / 2, y: y + CELL / 2 };
};

/** White's pawn e7 → e8, and the four pieces it may become. */
export function PromotionFigure({
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
      viewBox={`0 0 ${String(CHOICES_LEFT + 2 * CHOICE + 8)} ${String(TOP + 2 * CELL + 14)}`}
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
      <FigurePiece colour="w" type="p" {...square(E, 7)} size={CELL} />
      <RulesArrow from={centre(E, 7)} to={centre(E, 8)} bend={-10} gap={6} width={1.5} />
      {/* The choices, as tiles of the paper. */}
      {CHOICES.map((type, index) => {
        const x = CHOICES_LEFT + (index % 2) * (CHOICE + 4);
        const y = TOP + Math.floor(index / 2) * (CHOICE + 4) - 2;
        return (
          <g key={type}>
            <rect
              x={x}
              y={y}
              width={CHOICE}
              height={CHOICE}
              rx="4"
              strokeWidth="1"
              className="fill-surface stroke-border-control"
            />
            <FigurePiece colour="w" type={type} x={x + 1} y={y + 1} size={CHOICE - 2} />
          </g>
        );
      })}
      <RulesArrow
        from={{ x: LEFT + 3 * CELL - 2, y: TOP + CELL / 2 }}
        to={{ x: CHOICES_LEFT - 2, y: TOP + CELL / 2 }}
        gap={2}
        width={1.2}
        dashed
      />
    </RulesFigure>
  );
}
