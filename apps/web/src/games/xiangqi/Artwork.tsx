import "./theme.css";

import { cn } from "@board-games/ui";

import type { ArtworkProps } from "../types";

/** A disc of the picture: where it sits, its character, and whose (true: Đỏ). */
const DISCS = [
  { x: 36, y: 74, glyph: "帥", red: true },
  { x: 84, y: 30, glyph: "將", red: false },
  { x: 60, y: 52, glyph: "炮", red: true },
] as const;

/**
 * Cờ tướng on the menu and the setup screen: a corner of the wooden board with its river and
 * palace, Đỏ's general and cannon, Đen's general. Drawn on its own, without the board's code, in
 * the app's Japanese font (it has these three characters). Decorative.
 */
export function XiangqiArtwork({ className }: ArtworkProps) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden className={cn("size-30", className)}>
      <rect width="120" height="120" rx="14" className="fill-game-board" />
      <g strokeWidth="1.4" className="stroke-game-line" fill="none">
        {[12, 36, 60, 84, 108].map((v) => (
          <line key={`v${String(v)}`} x1={v} y1="8" x2={v} y2="112" />
        ))}
        {[8, 30, 74, 96].map((v) => (
          <line key={`h${String(v)}`} x1="8" y1={v} x2="112" y2={v} />
        ))}
        <path d="M36 74 84 112M84 74 36 112" />
      </g>
      <text
        x="60"
        y="52"
        dominantBaseline="central"
        textAnchor="middle"
        fontSize="13"
        fontWeight="800"
        className="fill-game-line [font-family:var(--font-cjk),serif] opacity-60"
      >
        楚河
      </text>
      {DISCS.map(({ x, y, glyph, red }) => (
        <g key={glyph}>
          <circle cx={x} cy={y + 2} r="15" className="fill-(--xiangqi-disc-shadow)" />
          <circle
            cx={x}
            cy={y}
            r="15"
            strokeWidth="1.4"
            className="fill-(--xiangqi-disc) stroke-(--xiangqi-disc-edge)"
          />
          <circle
            cx={x}
            cy={y}
            r="11.5"
            fill="none"
            strokeWidth="1.2"
            className={red ? "stroke-game-mark-1" : "stroke-game-mark-2"}
          />
          <text
            x={x}
            y={y}
            dominantBaseline="central"
            textAnchor="middle"
            fontSize="15"
            fontWeight="800"
            className={cn(
              red ? "fill-game-mark-1" : "fill-game-mark-2",
              "[font-family:var(--font-cjk),serif]",
            )}
          >
            {glyph}
          </text>
        </g>
      ))}
    </svg>
  );
}
