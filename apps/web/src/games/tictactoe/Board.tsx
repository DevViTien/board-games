"use client";

import { TICTACTOE_SIZE, type TicTacToeMove, type TicTacToeState } from "@board-games/games";
import { cn } from "@board-games/ui";
import { useTranslations } from "next-intl";

import type { BoardProps } from "../types";
import { useTicTacToePlayerLabel } from "./player-label";

function Mark({ player }: { player: number }) {
  return player === 0 ? (
    <svg viewBox="0 0 24 24" aria-hidden className="size-3/5 text-accent">
      <path d="M5 5 19 19M19 5 5 19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden className="size-3/5 text-fg">
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

/**
 * Nine buttons in a grid. A cell that cannot be chosen is `aria-disabled` and ignores presses rather
 * than being `disabled`: a disabled button drops keyboard focus to the page body, so the cell just
 * played would lose focus, and marked cells could no longer be reached with Tab to hear them.
 */
export function TicTacToeBoard({
  state,
  legalMoves,
  onMove,
  disabled,
}: BoardProps<TicTacToeState, TicTacToeMove>) {
  const t = useTranslations("Play");
  const playerLabel = useTicTacToePlayerLabel();

  return (
    // Rows as well as columns are fixed thirds (`grid-rows-3` is `minmax(0, 1fr)`): with auto rows a
    // mark, sized as a percentage of its cell, would size its own row and squeeze the others.
    <div
      role="group"
      aria-label={t("board")}
      className="grid aspect-square w-full max-w-sm grid-cols-3 grid-rows-3 gap-2"
    >
      {state.board.map((mark, cell) => {
        const move = disabled ? undefined : legalMoves.find((legal) => legal.cell === cell);
        return (
          <button
            key={cell}
            type="button"
            aria-disabled={move === undefined}
            aria-label={t("cell", {
              row: Math.floor(cell / TICTACTOE_SIZE) + 1,
              col: (cell % TICTACTOE_SIZE) + 1,
              content: mark === null ? t("cellEmpty") : playerLabel(mark),
            })}
            onClick={() => {
              if (move !== undefined) onMove(move);
            }}
            className={cn(
              "flex min-h-0 min-w-0 items-center justify-center rounded-card border border-border bg-surface transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
              move === undefined ? "cursor-default" : "cursor-pointer hover:bg-surface-muted",
              // A marked cell is plainly taken; an empty one that cannot be chosen (game over, or
              // not this device's turn) must not look playable, also on touch screens without hover.
              move === undefined && mark === null && "border-dashed bg-surface-muted",
            )}
          >
            {mark !== null && <Mark player={mark} />}
          </button>
        );
      })}
    </div>
  );
}
