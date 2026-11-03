"use client";

import type { PlayerIndex } from "@board-games/engine";
import {
  TICTACTOE_SIZE,
  type TicTacToeMove,
  type TicTacToeState,
  WINNING_LINES,
} from "@board-games/games/tictactoe";
import { cn } from "@board-games/ui";
import { useTranslations } from "next-intl";
import { useId } from "react";

import type { BoardProps } from "../types";
import { useTicTacToePlayerLabel } from "./player-label";
import { winningLines } from "./winning-line";

/**
 * X (orange, two thick round-ended strokes) or O (deep purple ring); dashed for a preview. Above
 * the winning line (`z-[2]`), which runs under the marks and over the tiles' faces.
 */
function Mark({ player, preview = false }: { player: PlayerIndex; preview?: boolean }) {
  const dash = preview ? "3 3.2" : undefined;
  return player === 0 ? (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="pointer-events-none relative z-[2] size-3/5 text-game-mark-1"
    >
      <path
        d="M4.5 4.5 19.5 19.5M19.5 4.5 4.5 19.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={preview ? 2.5 : 4}
        strokeDasharray={dash}
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="pointer-events-none relative z-[2] size-3/5 text-game-mark-2"
    >
      <circle
        cx="12"
        cy="12"
        r="7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={preview ? 2.5 : 3.6}
        strokeDasharray={dash}
      />
    </svg>
  );
}

/**
 * Nine "sticker" tiles in a grid; the tile of the last move has a dashed ring inside it and is
 * described as such (the focus ring is drawn outside the tile, so the two never look alike). A
 * tile that cannot be chosen is `aria-disabled` and ignores presses rather than being `disabled`:
 * a disabled button drops keyboard focus to the page body, so the tile just played would lose
 * focus, and marked tiles could no longer be reached with Tab to hear them.
 */
export function TicTacToeBoard({
  state,
  legalMoves,
  onMove,
  disabled,
  result,
  lastEntry,
  layout,
}: BoardProps<TicTacToeState, TicTacToeMove>) {
  const t = useTranslations("Play");
  const tGame = useTranslations("Games.tictactoe");
  const playerLabel = useTicTacToePlayerLabel();
  const lastMoveId = useId();
  const winningId = useId();
  const lastCell = lastEntry?.move.cell;
  // Every line the last move completed: one, or two at once.
  const lines = winningLines(result, state).map((index) => WINNING_LINES[index] ?? []);
  const winning = new Set<number>(lines.flat());
  const describedBy = (cell: number) => {
    const ids = [
      cell === lastCell ? lastMoveId : null,
      winning.has(cell) ? winningId : null,
    ].filter((id) => id !== null);
    return ids.length === 0 ? undefined : ids.join(" ");
  };

  const board = (
    // The tiles' corners and gaps follow the board's size (container units), as on the mockup.
    <div className="@container mx-auto w-[min(var(--board-room,100%),26rem)]">
      {/* Rows as well as columns are fixed thirds (`grid-rows-3` is `minmax(0, 1fr)`): with auto
          rows a mark, sized as a percentage of its tile, would size its own row. */}
      <div
        role="group"
        aria-label={t("board")}
        className="relative grid aspect-square w-full touch-manipulation grid-cols-3 grid-rows-3 gap-[3.4cqw]"
      >
        {/* Describe tiles (the last move, the winning line) without changing the names tiles are
            found by. */}
        <span id={lastMoveId} hidden>
          {t("lastMove")}
        </span>
        <span id={winningId} hidden>
          {tGame("winningCell")}
        </span>
        {state.board.map((mark, cell) => {
          const move = disabled ? undefined : legalMoves.find((legal) => legal.cell === cell);
          return (
            <button
              key={cell}
              type="button"
              aria-disabled={move === undefined}
              aria-describedby={describedBy(cell)}
              aria-label={t("cell", {
                row: Math.floor(cell / TICTACTOE_SIZE) + 1,
                col: (cell % TICTACTOE_SIZE) + 1,
                content: mark === null ? t("cellEmpty") : playerLabel(mark),
              })}
              onClick={() => {
                if (move !== undefined) onMove(move);
              }}
              className={cn(
                "group relative flex min-h-0 min-w-0 items-center justify-center rounded-[6cqw] bg-game-board",
                // Outside the tile, ink and paper: never mistaken for the last move's dashed ring.
                "focus-ring",
                move === undefined ? "cursor-default" : "cursor-pointer",
                // A marked tile sits on a lip, like a sticker.
                mark !== null && "shadow-(--tictactoe-tile-shadow)",
                // A tile that may be chosen has an edge (3:1); an empty one that cannot be chosen
                // (game over, not this device's turn) a faint dashed one on a paler face, so it
                // never looks playable, also on touch screens without hover.
                move !== undefined && "border-2 border-game-line",
                move === undefined &&
                  mark === null &&
                  "border-2 border-dashed border-game-line/50 bg-game-board/55",
                // A tile of the winning line has an ink edge: the win reads by shape, not colour.
                winning.has(cell) && "border-2 border-fg",
              )}
            >
              {mark !== null && <Mark player={mark} />}
              {/* Pointed at (hover only, so never left behind by a tap): the mark it would get. */}
              {move !== undefined && mark === null && (
                <span className="flex size-full items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none">
                  <Mark player={state.toMove} preview />
                </span>
              )}
              {/* The last move: a dashed ring inside the tile, which forced colours keep. */}
              {cell === lastCell && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-1.5 rounded-[4.5cqw] border-2 border-dashed border-game-last-move"
                />
              )}
            </button>
          );
        })}
        {lines.map((cells) => (
          <WinningStroke key={cells.join("-")} cells={cells} />
        ))}
      </div>
    </div>
  );

  return layout({ board, controls: null });
}

/** The centre of a tile, in hundredths of the board's side: tiles are 3.4% apart (`gap`). */
function centreOf(cell: number): { x: number; y: number } {
  const tile = (100 - 2 * 3.4) / 3;
  const at = (index: number) => index * (tile + 3.4) + tile / 2;
  return { x: at(cell % TICTACTOE_SIZE), y: at(Math.floor(cell / TICTACTOE_SIZE)) };
}

/**
 * A winning line, as a stroke of a marker pen in ink across the three tiles, a little curved and
 * reaching into the end tiles: over the tiles' faces, under the marks (`z-[1]`), so it never cuts
 * a mark. Drawn from one end to the other (300 ms, within the AI's shortest delay); with reduced
 * motion it shows whole at once.
 */
function WinningStroke({ cells }: { cells: readonly number[] }) {
  const first = cells[0];
  const last = cells.at(-1);
  if (first === undefined || last === undefined) return null;
  const from = centreOf(first);
  const to = centreOf(last);
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const unit = { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
  const reach = 10;
  const start = { x: from.x - unit.x * reach, y: from.y - unit.y * reach };
  const end = { x: to.x + unit.x * reach, y: to.y + unit.y * reach };
  // The middle of the stroke bows a little to one side, as a hand draws it.
  const bend = { x: (start.x + end.x) / 2 + unit.y * 1.6, y: (start.y + end.y) / 2 - unit.x * 1.6 };
  const path = `M${start.x} ${start.y}Q${bend.x} ${bend.y} ${end.x} ${end.y}`;
  return (
    <svg
      aria-hidden
      data-winning-line=""
      viewBox="0 0 100 100"
      className="pointer-events-none absolute inset-0 z-[1] size-full overflow-visible"
    >
      <path
        d={path}
        pathLength={1}
        fill="none"
        strokeWidth="2.4"
        strokeLinecap="round"
        className="animate-draw-line stroke-game-win [stroke-dasharray:1] motion-reduce:animate-none"
      />
    </svg>
  );
}
