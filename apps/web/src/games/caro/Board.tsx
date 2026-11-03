"use client";

import type { PlayerIndex } from "@board-games/engine";
import { type CaroMove, type CaroState, caroWinningLine } from "@board-games/games/caro";
import { cn } from "@board-games/ui";
import { useTranslations } from "next-intl";
import {
  type FocusEvent,
  type KeyboardEvent,
  memo,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import type { BoardProps } from "../types";

/**
 * Below this size (in CSS pixels, WCAG 2.2's minimum target), a finger easily hits the next cell,
 * so a tap only selects a cell and a second tap on it places the stone.
 */
const MIN_TOUCH_CELL_PX = 24;

/**
 * A mark drawn like a ballpoint pen: X two slightly curved strokes, O a loop whose end runs a
 * little past where the pen started. Full colour; a preview (a cell selected by a first tap) is the same mark, dashed.
 * The last move gets a dashed circle around its mark.
 */
function Mark({
  player,
  preview = false,
  last = false,
}: {
  player: PlayerIndex | null;
  preview?: boolean;
  last?: boolean;
}) {
  const dash = preview ? "3.4 2.6" : undefined;
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="pointer-events-none relative size-full">
      {player === 0 && (
        <path
          d="M6.4 6.2Q12.2 11.6 17.8 17.9M17.6 6.3Q12 11.8 6.3 17.7"
          fill="none"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray={dash}
          className="stroke-game-mark-1"
        />
      )}
      {player === 1 && (
        <path
          d="M13.6 5.5C8.6 4.8 5.1 8.4 5.4 12.6C5.7 16.8 9.4 19.1 13 18.6C16.8 18.1 19.1 14.7 18.6 10.9C18.2 7.8 15.8 5.6 12.2 5.8"
          fill="none"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray={dash}
          className="stroke-game-mark-2"
        />
      )}
      {last && (
        <circle
          cx="12"
          cy="12"
          r="10.4"
          fill="none"
          strokeWidth="1.2"
          strokeDasharray="2.2 1.8"
          className="stroke-game-last-move"
        />
      )}
    </svg>
  );
}

interface CellProps {
  readonly cell: number;
  readonly stone: PlayerIndex | null;
  readonly label: string;
  readonly playable: boolean;
  readonly tabStop: boolean;
  readonly last: boolean;
  /** One of the winning line's cells: described as such (the line is drawn over the grid). */
  readonly winning: boolean;
  /** The player whose stone is previewed on a cell selected by a first tap, or `null`. */
  readonly preview: PlayerIndex | null;
  /** Whether a first tap can select this cell (small cells), so it is announced as (not) selected. */
  readonly selectable: boolean;
  readonly describedBy: string | undefined;
}

/**
 * One cell: a button inside a grid cell. Only plain values come in (events are handled by the
 * grid), so a move re-renders only the cells that changed. A cell that cannot be chosen is
 * `aria-disabled` rather than `disabled`, so the cell just played keeps the keyboard focus.
 */
const Cell = memo(function Cell({
  cell,
  stone,
  label,
  playable,
  tabStop,
  last,
  winning,
  preview,
  selectable,
  describedBy,
}: CellProps) {
  return (
    <div
      role="gridcell"
      aria-selected={preview !== null ? true : selectable ? false : undefined}
      data-winning={winning || undefined}
      className="relative flex min-w-0 flex-1"
    >
      <button
        type="button"
        data-cell={cell}
        tabIndex={tabStop ? 0 : -1}
        aria-label={label}
        aria-disabled={!playable}
        aria-describedby={describedBy}
        className={cn(
          "relative flex size-full items-center justify-center rounded-sm",
          // Outside the cell, ink and paper, so it is never mistaken for the last move's dashed
          // circle inside it.
          "focus-ring",
          playable ? "cursor-pointer hover:bg-game-line/15" : "cursor-default",
        )}
      >
        {/* Selected by a first tap: the game's hint colour behind the dashed stone, inset so the
            grid lines around the cell stay on the paper (3:1). */}
        {preview !== null && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-[3px] rounded-[2px] bg-game-highlight"
          />
        )}
        {(stone !== null || preview !== null || last) && (
          <Mark player={stone ?? preview} preview={stone === null} last={last} />
        )}
      </button>
    </div>
  );
});

/** The cell a grid event happened in, from the `data-cell` of its button. */
function cellOf(target: EventTarget): number | null {
  if (!(target instanceof Element)) return null;
  const value = target.closest<HTMLElement>("[data-cell]")?.dataset.cell;
  return value === undefined ? null : Number(value);
}

/** The cell a key moves the focus to from `cell`, or `null` for any other key. Stops at the edges. */
function cellAfterKey(key: string, cell: number, size: number): number | null {
  const row = Math.floor(cell / size);
  const col = cell % size;
  const at = (r: number, c: number) =>
    Math.min(Math.max(r, 0), size - 1) * size + Math.min(Math.max(c, 0), size - 1);
  switch (key) {
    case "ArrowUp":
      return at(row - 1, col);
    case "ArrowDown":
      return at(row + 1, col);
    case "ArrowLeft":
      return at(row, col - 1);
    case "ArrowRight":
      return at(row, col + 1);
    case "Home":
      return at(row, 0);
    case "End":
      return at(row, size - 1);
    default:
      return null;
  }
}

/** The SVG path of the lines between cells on a `size × size` board, in cell units. */
function gridPath(size: number, every5: boolean): string {
  return Array.from({ length: size + 1 }, (_unused, line) => line)
    .filter((line) => (line % 5 === 0) === every5)
    .map((line) => `M0 ${line}H${size}M${line} 0V${size}`)
    .join("");
}

/**
 * The notebook's dots (decorative), on line crossings three lines in from each edge, and in the
 * middle when the board has a crossing there (an even size): symmetric on 15×15 and 19×19.
 */
function starPoints(size: number): readonly { readonly x: number; readonly y: number }[] {
  const near = 3;
  const far = size - near;
  const corners = [
    { x: near, y: near },
    { x: far, y: near },
    { x: near, y: far },
    { x: far, y: far },
  ];
  return size % 2 === 0 ? [...corners, { x: size / 2, y: size / 2 }] : corners;
}

/**
 * A Gomoku board: grid lines drawn in SVG under a grid of buttons, and the winning line drawn over
 * them. The grid is a single Tab stop (roving tabindex): arrows, Home and End move between cells,
 * Enter or Space places a stone. On a touch screen whose cells are smaller than 24 px, a first tap
 * only selects a cell (with a preview and a hint) and a second tap on it places the stone.
 */
export function CaroBoard({
  state,
  legalMoves,
  onMove,
  disabled,
  lastEntry,
  layout,
}: BoardProps<CaroState, CaroMove>) {
  const t = useTranslations("Play");
  const tCaro = useTranslations("Games.caro");
  const lastMoveId = useId();
  const winningId = useId();
  const { size, board } = state;
  const lastCell = lastEntry?.move.cell ?? null;
  const winningLine = caroWinningLine(state);

  // The moves that may be chosen, by cell, built once per render instead of searched per cell.
  const playable = useMemo(
    () => new Map(disabled ? [] : legalMoves.map((move) => [move.cell, move])),
    [disabled, legalMoves],
  );
  const winning = useMemo(() => new Set(winningLine ?? []), [winningLine]);

  const [focused, setFocused] = useState<number | null>(null);
  const middle = Math.floor(size / 2) * size + Math.floor(size / 2);
  const tabStop = focused !== null && focused < board.length ? focused : (lastCell ?? middle);

  // A cell selected by a first tap belongs to the position it was tapped on: a move by anyone,
  // undo, redo, a new game, a stone on that cell or a locked board drops it. Compared by content,
  // not by object: online, the state is rebuilt from the room's record on every update of the room
  // (a name, a seat, a reconnection) without the board changing. Adjusted during render.
  const position = { filled: state.filled, toMove: state.toMove, lastCell };
  const [selected, setSelected] = useState<{ readonly cell: number } & typeof position>();
  const selectionHolds =
    selected !== undefined &&
    !disabled &&
    selected.filled === position.filled &&
    selected.toMove === position.toMove &&
    selected.lastCell === position.lastCell &&
    board[selected.cell] === null;
  if (selected !== undefined && !selectionHolds) setSelected(undefined);
  const selectedCell = selectionHolds ? selected.cell : null;

  // Whether cells are too small for a finger, measured on the board itself.
  const frameRef = useRef<HTMLDivElement>(null);
  const [smallCells, setSmallCells] = useState(false);
  useEffect(() => {
    const frame = frameRef.current;
    if (frame === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) setSmallCells(entry.contentRect.width / size < MIN_TOUCH_CELL_PX);
    });
    observer.observe(frame);
    return () => {
      observer.disconnect();
    };
  }, [size]);

  // The pointer of the press that leads to the next click; cleared by every click.
  const pointerType = useRef<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const cell = cellOf(event.target);
    const pointer = pointerType.current;
    pointerType.current = null;
    if (cell === null) return;
    const move = playable.get(cell);
    if (move === undefined) return;
    // A click from the keyboard (Enter, Space) has no pointer behind it: it always places.
    const fromKeyboard = event.detail === 0;
    if (!fromKeyboard && pointer === "touch" && smallCells && selectedCell !== cell) {
      setSelected({ cell, ...position });
      return;
    }
    setSelected(undefined);
    onMove(move);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const cell = cellOf(event.target);
    if (cell === null) return;
    const next = cellAfterKey(event.key, cell, size);
    if (next === null) return;
    event.preventDefault();
    setFocused(next);
    gridRef.current?.querySelector<HTMLElement>(`[data-cell="${next}"]`)?.focus();
  }

  function handleFocus(event: FocusEvent<HTMLDivElement>) {
    const cell = cellOf(event.target);
    if (cell !== null) setFocused(cell);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    pointerType.current = event.pointerType;
  }

  // Every cell's name, rebuilt only when a stone is placed or removed.
  const labels = useMemo(
    () =>
      board.map((stone, cell) =>
        t("cell", {
          row: Math.floor(cell / size) + 1,
          col: (cell % size) + 1,
          content: stone === null ? t("cellEmpty") : tCaro(stone === 0 ? "players.x" : "players.o"),
        }),
      ),
    [board, size, t, tCaro],
  );
  const describedBy = (cell: number) => {
    const ids = [
      cell === lastCell ? lastMoveId : null,
      winning.has(cell) ? winningId : null,
    ].filter((id) => id !== null);
    return ids.length === 0 ? undefined : ids.join(" ");
  };
  const firstWinning = winningLine?.[0];
  const lastWinning = winningLine?.at(-1);
  const centreOf = (cell: number) => ({ x: (cell % size) + 0.5, y: Math.floor(cell / size) + 0.5 });
  const winner = firstWinning === undefined ? null : (board[firstWinning] ?? null);

  const boardPart = (
    // The play screen gives the room (`--board-room`); a laptop never needs more than 37.5rem.
    <div className="mx-auto w-[min(var(--board-room,100%),37.5rem)]">
      {/* Describe cells without changing the names they are found by. */}
      <span id={lastMoveId} hidden>
        {t("lastMove")}
      </span>
      <span id={winningId} hidden>
        {tCaro("winningCell")}
      </span>
      {/* A page of a school notebook: a strip of paper with the red margin line, then the grid.
          Not `overflow-hidden`: the focus ring of a cell on the edge is drawn outside the page. */}
      <div className="flex rounded-sm border border-game-line bg-game-board shadow-card">
        <div aria-hidden className="relative w-[5%] shrink-0">
          <span className="absolute inset-y-0 left-1/2 w-0.5 bg-(--caro-margin)" />
        </div>
        <div ref={frameRef} className="relative aspect-square min-w-0 flex-1">
          <svg
            aria-hidden
            viewBox={`0 0 ${size} ${size}`}
            preserveAspectRatio="none"
            className="absolute inset-0 size-full"
          >
            <path
              d={gridPath(size, false)}
              fill="none"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              className="stroke-game-line"
            />
            {/* Every fifth line a little heavier, to count cells by. */}
            <path
              d={gridPath(size, true)}
              fill="none"
              strokeWidth="1.6"
              vectorEffect="non-scaling-stroke"
              className="stroke-game-line"
            />
            {starPoints(size).map(({ x, y }) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="0.08" className="fill-game-line" />
            ))}
          </svg>
          {/* Events are handled here for every cell, so the cells take plain values only. */}
          <div
            ref={gridRef}
            role="grid"
            aria-label={t("board")}
            // No double-tap zoom on the cells (a second tap places a stone); pinch zoom still works.
            className="absolute inset-0 flex touch-manipulation flex-col"
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onPointerDown={handlePointerDown}
          >
            {Array.from({ length: size }, (_unused, row) => (
              <div key={row} role="row" className="flex min-h-0 flex-1">
                {Array.from({ length: size }, (_cellUnused, col) => {
                  const cell = row * size + col;
                  const stone = board[cell] ?? null;
                  return (
                    <Cell
                      key={cell}
                      cell={cell}
                      stone={stone}
                      label={labels[cell] ?? ""}
                      playable={playable.has(cell)}
                      tabStop={cell === tabStop}
                      last={cell === lastCell}
                      winning={winning.has(cell)}
                      preview={cell === selectedCell ? state.toMove : null}
                      selectable={smallCells && playable.has(cell)}
                      describedBy={describedBy(cell)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          {firstWinning !== undefined && lastWinning !== undefined && (
            <WinningLine
              size={size}
              from={centreOf(firstWinning)}
              to={centreOf(lastWinning)}
              winner={winner}
            />
          )}
        </div>
      </div>
    </div>
  );

  return layout({
    board: boardPart,
    // Not a status: the play screen's turn line is the one status of the page.
    controls: (
      // Room kept on a phone, where a tap selects; a laptop's cells are large enough to place at once.
      <p
        aria-live="polite"
        className="min-h-5 text-center text-small text-fg-muted lg:min-h-0 lg:text-left"
      >
        {selectedCell === null ? "" : tCaro("boardHint")}
      </p>
    ),
  });
}

/**
 * The winning line, as on paper: a stroke of the winner's pen through the centres of its cells,
 * circled by a loop of the celebration colour.
 */
function WinningLine({
  size,
  from,
  to,
  winner,
}: {
  size: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  winner: PlayerIndex | null;
}) {
  const centre = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  return (
    <svg
      aria-hidden
      data-winning-line=""
      viewBox={`0 0 ${size} ${size}`}
      preserveAspectRatio="none"
      // The loop around a line along an edge goes past the grid, onto the frame.
      className="pointer-events-none absolute inset-0 size-full overflow-visible"
    >
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        strokeWidth="0.16"
        strokeLinecap="round"
        className={winner === 1 ? "stroke-game-mark-2" : "stroke-game-mark-1"}
      />
      <ellipse
        cx={centre.x}
        cy={centre.y}
        rx={length / 2 + 0.85}
        ry="0.78"
        transform={`rotate(${angle} ${centre.x} ${centre.y})`}
        fill="none"
        strokeWidth="0.1"
        className="stroke-game-win"
      />
    </svg>
  );
}
