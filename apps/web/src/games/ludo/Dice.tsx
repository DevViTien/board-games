import type { LudoColourName } from "@board-games/games/ludo";
import { cn } from "@board-games/ui";

import { PIECE_BORDER } from "./piece-style";

/** Pip centres of each face, on a 30 × 30 die. */
const PIPS: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
  1: [[15, 15]],
  2: [
    [8, 8],
    [22, 22],
  ],
  3: [
    [8, 8],
    [15, 15],
    [22, 22],
  ],
  4: [
    [8, 8],
    [22, 8],
    [8, 22],
    [22, 22],
  ],
  5: [
    [8, 8],
    [22, 8],
    [15, 15],
    [8, 22],
    [22, 22],
  ],
  6: [
    [8, 8],
    [22, 8],
    [8, 15],
    [22, 15],
    [8, 22],
    [22, 22],
  ],
};

interface DiceProps {
  /** The face shown, or `null` before the first roll. */
  readonly face: number | null;
  /** The colour of whoever rolled it. */
  readonly colour: LudoColourName | null;
  /** Tumbling: shows `face` while the animation runs. */
  readonly rolling: boolean;
  /** What a screen reader reads ("Xúc xắc: 5 (Đỏ)"). */
  readonly label: string;
}

/** The die: its face drawn with pips, framed in the colour of whoever rolled it. */
export function Dice({ face, colour, rolling, label }: DiceProps) {
  return (
    <div
      role="img"
      aria-label={label}
      data-colour={colour ?? undefined}
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-lg border-4 bg-surface",
        colour === null ? "border-border" : PIECE_BORDER[colour],
        rolling && "animate-dice-roll motion-reduce:animate-none",
      )}
    >
      <svg viewBox="0 0 30 30" aria-hidden className="size-full">
        {(face === null ? [] : (PIPS[face] ?? [])).map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3" className="fill-fg" />
        ))}
      </svg>
    </div>
  );
}
