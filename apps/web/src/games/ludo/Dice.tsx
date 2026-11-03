import type { LudoColourName } from "@board-games/games/ludo";
import { cn } from "@board-games/ui";

import { PIECE_LINE_BORDER } from "./piece-style";

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
  /** The face shown, or `null` while the die waits for a roll. */
  readonly face: number | null;
  /** The colour of its frame: the player to move, or the roller while it tumbles. */
  readonly colour: LudoColourName;
  /** Tumbling: shows `face` while the animation runs. */
  readonly rolling: boolean;
  /** What a screen reader reads ("Xúc xắc: 5 (Đỏ)", "Xúc xắc: Đỏ sắp gieo"). */
  readonly label: string;
}

/** Every pip place at once, seven, which no face has: faint, they cannot be read as a number. */
const ALL_PIPS: readonly (readonly [number, number])[] = [...(PIPS[6] ?? []), [15, 15]];

/**
 * Waiting for a roll: a dashed outline (at least 3:1 against the die) around faint pips, so the
 * die reads as "waiting to be rolled" rather than as an empty box or a number already rolled.
 */
function WaitingFace() {
  return (
    <>
      <rect
        x="3"
        y="3"
        width="24"
        height="24"
        rx="4"
        fill="none"
        strokeWidth="1.5"
        strokeDasharray="3 2.5"
        className="stroke-fg-muted"
      />
      {ALL_PIPS.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2" className="fill-fg-muted/30" />
      ))}
    </>
  );
}

/** The die: its face drawn with pips, framed in the colour of the player to move. */
export function Dice({ face, colour, rolling, label }: DiceProps) {
  const pips = face === null ? null : (PIPS[face] ?? []);
  return (
    <div
      role="img"
      aria-label={label}
      data-colour={colour}
      data-waiting={pips === null || undefined}
      className={cn(
        "flex size-14 shrink-0 items-center justify-center rounded-control border-4 bg-game-board",
        PIECE_LINE_BORDER[colour],
        rolling && "animate-dice-roll motion-reduce:animate-none",
      )}
    >
      <svg viewBox="0 0 30 30" aria-hidden className="size-full">
        {pips === null ? (
          <WaitingFace />
        ) : (
          pips.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3" className="fill-fg" />)
        )}
      </svg>
    </div>
  );
}
