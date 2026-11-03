import "./theme.css";

import { cn } from "@board-games/ui";

import type { ArtworkProps } from "../types";

/** The four stables, in their corners as on the board, each with a horse's place. */
const STABLES = [
  { x: 6, y: 6, fill: "fill-piece-green" },
  { x: 70, y: 6, fill: "fill-piece-red" },
  { x: 6, y: 70, fill: "fill-piece-yellow" },
  { x: 70, y: 70, fill: "fill-piece-blue" },
] as const;

/** Cờ cá ngựa on the menu and the setup screen: four stables around the centre. Decorative. */
export function LudoArtwork({ className }: ArtworkProps) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden className={cn("size-30", className)}>
      {STABLES.map(({ x, y, fill }) => (
        <g key={fill}>
          <rect x={x} y={y} width="44" height="44" rx="10" className={fill} />
          <circle cx={x + 22} cy={y + 22} r="9" className="fill-game-tint" />
        </g>
      ))}
      <path d="M60 50l10 10-10 10-10-10z" className="fill-fg" />
    </svg>
  );
}
