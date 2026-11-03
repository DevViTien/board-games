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

function Mark({ player, preview = false }: { player: PlayerIndex; preview?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn(
        "pointer-events-none size-3/4",
        player === 0 ? "text-accent" : "text-fg",
        preview && "opacity-40",
      )}
    >
      {player === 0 ? (
        <path
          d="M5 5 19 19M19 5 5 19"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      ) : (
        <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="3.5" />
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
          "flex size-full items-center justify-center rounded-sm",
          "focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring",
          playable ? "cursor-pointer hover:bg-surface-muted" : "cursor-default",
          winning && "bg-accent/20",
          // The last move stands out by a border too, which forced colours keep.
          last && "border-2 border-accent",
          preview !== null && "border-2 border-dashed border-fg-muted",
        )}
      >
        {stone !== null && <Mark player={stone} />}
        {stone === null && preview !== null && <Mark player={preview} preview />}
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
function gridPath(size: number): string {
  return Array.from(
    { length: size + 1 },
    (_unused, line) => `M0 ${line}H${size}M${line} 0V${size}`,
  ).join("");
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

  return (
    <div className="flex w-full max-w-[40rem] flex-col items-center gap-2">
      {/* Describe cells without changing the names they are found by. */}
      <span id={lastMoveId} hidden>
        {t("lastMove")}
      </span>
      <span id={winningId} hidden>
        {tCaro("winningCell")}
      </span>
      <div
        ref={frameRef}
        className="relative aspect-square w-full overflow-hidden rounded-sm border border-fg-muted/60 bg-surface"
      >
        <svg
          aria-hidden
          viewBox={`0 0 ${size} ${size}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
        >
          <path
            d={gridPath(size)}
            fill="none"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            className="stroke-fg-muted/40"
          />
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
          <svg
            aria-hidden
            viewBox={`0 0 ${size} ${size}`}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 size-full"
          >
            <line
              x1={centreOf(firstWinning).x}
              y1={centreOf(firstWinning).y}
              x2={centreOf(lastWinning).x}
              y2={centreOf(lastWinning).y}
              strokeWidth="0.18"
              strokeLinecap="round"
              className="stroke-fg/70"
            />
          </svg>
        )}
      </div>
      {/* Not a status: the play screen's turn line is the one status of the page. */}
      <p aria-live="polite" className="min-h-5 text-sm text-fg-muted">
        {selectedCell === null ? "" : tCaro("boardHint")}
      </p>
    </div>
  );
}
