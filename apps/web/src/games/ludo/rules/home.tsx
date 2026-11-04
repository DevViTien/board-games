import type { ReactNode } from "react";

import { RulesArrow } from "@/features/rules/RulesArrow";
import { RulesFigure } from "@/features/rules/RulesFigure";

import type { Point } from "../board-layout";
import { FigureCell, FigureHorse, GateMark } from "./parts";

/** A row: Red's home entry, then its steps 1–6, laid flat (on the board they go down). */
const STEPS = [1, 2, 3, 4, 5, 6] as const;
const ROW_GAP = 1.9;

const at = (cell: number, row: number): Point => ({ x: cell + 0.5, y: row * ROW_GAP + 0.5 });

function HomeRow({ row }: { readonly row: number }) {
  return (
    <g>
      <FigureCell x={0} y={row * ROW_GAP} />
      <GateMark x={0} y={row * ROW_GAP} colour="red" />
      {STEPS.map((step) => (
        <FigureCell key={step} x={step} y={row * ROW_GAP} colour="red" step={step} />
      ))}
    </g>
  );
}

/**
 * Red's home entry and its six steps: a 4 from the home entry goes straight to step 4; from step 4,
 * only a 5 goes on, to step 5; four horses on steps 3–6 win.
 */
export function HomeFigure({
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
      viewBox={`-0.15 -0.9 7.3 ${String(2 * ROW_GAP + 2)}`}
    >
      <HomeRow row={0} />
      <FigureHorse colour="red" at={at(0, 0)} />
      <RulesArrow gap={0.45} width={0.08} from={at(0, 0)} to={at(4, 0)} bend={-1.1} />

      <HomeRow row={1} />
      <FigureHorse colour="red" at={at(4, 1)} />
      <RulesArrow gap={0.45} width={0.08} from={at(4, 1)} to={at(5, 1)} bend={-0.5} />

      <HomeRow row={2} />
      {[3, 4, 5, 6].map((step) => (
        <FigureHorse key={step} colour="red" at={at(step, 2)} />
      ))}
    </RulesFigure>
  );
}
