import type { ReactNode } from "react";

import { RulesFigure } from "@/features/rules/RulesFigure";

import { CaroStrip, CaroWinStroke } from "./strip";

const CELL = 28;
const LEFT = 16;

/** Five X against the board's edge, an O at the other end: a win, the edge does not block. */
export function EdgeFigure({
  label,
  caption,
}: {
  readonly label: string;
  readonly caption: ReactNode;
}) {
  return (
    <RulesFigure label={label} caption={caption} viewBox="0 0 210 56">
      {/* The board's edge: a thick ink bar, with nothing beyond it. */}
      <rect x="6" y="6" width="8" height="44" rx="1" className="fill-fg" />
      <CaroStrip marks={["x", "x", "x", "x", "x", "o"]} x={LEFT} y={14} size={CELL} />
      <CaroWinStroke from={[LEFT + 6, 14 + CELL / 2]} to={[LEFT + 5 * CELL - 6, 14 + CELL / 2]} />
    </RulesFigure>
  );
}
