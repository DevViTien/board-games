import type { ForbiddenTriangleState } from "@board-games/games/forbidden-triangle";

import type { SeatMarkProps } from "../types";

/** A seat's line in the players' panel: Đỏ's solid, Xanh's dashed, as on the board. Decorative. */
export function ForbiddenTriangleSeatMark({ player }: SeatMarkProps<ForbiddenTriangleState>) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden className="size-full">
      <path
        d="M6 21 22 7"
        fill="none"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeDasharray={player === 0 ? undefined : "4 3.5"}
        className={player === 0 ? "stroke-game-mark-1" : "stroke-game-mark-2"}
      />
    </svg>
  );
}
