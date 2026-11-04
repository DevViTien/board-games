import type { ReactNode } from "react";

import { RulesFigure } from "@/features/rules/RulesFigure";

import { CaroStrip, CaroWinStroke } from "./strip";

const CELL = 28;

/**
 * The "blocked ends" rule: five X with an O at both ends (no win), above five X blocked at one end
 * only (a win, struck through).
 */
export function BlockedFigure({
  label,
  caption,
}: {
  readonly label: string;
  readonly caption: ReactNode;
}) {
  return (
    <RulesFigure label={label} caption={caption} viewBox="0 0 210 104">
      <CaroStrip marks={["o", "x", "x", "x", "x", "x", "o"]} x={7} y={8} size={CELL} />
      <CaroStrip marks={["o", "x", "x", "x", "x", "x", ""]} x={7} y={64} size={CELL} />
      <CaroWinStroke from={[7 + CELL + 6, 64 + CELL / 2]} to={[7 + 6 * CELL - 6, 64 + CELL / 2]} />
    </RulesFigure>
  );
}
