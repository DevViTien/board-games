"use client";

import type { PlayerIndex } from "@board-games/engine";
import {
  type CaroArea,
  caroInArea,
  type CaroMove,
  type CaroState,
  caroWinningLine,
} from "@board-games/games/caro";
import { Button, cn, LocateFixedIcon, ZoomInIcon, ZoomOutIcon } from "@board-games/ui";
import { useTranslations } from "next-intl";
import {
  type FocusEvent,
  type KeyboardEvent,
  memo,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useId,
  useLayoutEffect,
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

/**
 * The cell a key moves the focus to from `cell`, or `null` for any other key. Stops at the edges of
 * the area: the whole board, or on the board that grows the part stones may go on.
 */
function cellAfterKey(key: string, cell: number, size: number, area: CaroArea): number | null {
  const row = Math.floor(cell / size);
  const col = cell % size;
  const at = (r: number, c: number) =>
    Math.min(Math.max(r, area.top), area.bottom) * size +
    Math.min(Math.max(c, area.left), area.right);
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
      return at(row, area.left);
    case "End":
      return at(row, area.right);
    default:
      return null;
  }
}

/**
 * The SVG path of the lines between the cells of `area`, in cell units from its top left. Every
 * fifth line of the whole board (counted from its top left) is in the heavy path, so the heavy
 * lines stay put as the board that grows widens.
 */
function gridPath(area: CaroArea, heavy: boolean): string {
  const cols = area.right - area.left + 1;
  const rows = area.bottom - area.top + 1;
  const vertical = Array.from({ length: cols + 1 }, (_unused, line) => line)
    .filter((line) => ((area.left + line) % 5 === 0) === heavy)
    .map((line) => `M${line} 0V${rows}`);
  const horizontal = Array.from({ length: rows + 1 }, (_unused, line) => line)
    .filter((line) => ((area.top + line) % 5 === 0) === heavy)
    .map((line) => `M0 ${line}H${cols}`);
  return [...horizontal, ...vertical].join("");
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

/** How many columns the frame of the board that grows shows, from zoomed out to zoomed in. */
const ZOOM_STEPS = [25, 19, 15, 11] as const;
/** 15 columns: the area a game starts with fills the frame, as a 15×15 board does. */
const DEFAULT_ZOOM = 2;
/** A press of the mouse that moves this far is a drag of the board, not a click on a cell. */
const DRAG_START_PX = 4;

function reducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Scrolls the frame of the board that grows so `cell` is in view: just enough ("nearest") or in
 * the middle ("centre"). On the frame itself, never the page around it, as `scrollIntoView` would.
 */
function scrollToCell(
  frame: HTMLElement,
  { size, area }: Pick<CaroState, "size" | "area">,
  cell: number,
  how: "nearest" | "centre",
) {
  const content = frame.firstElementChild;
  if (!(content instanceof HTMLElement) || typeof frame.scrollTo !== "function") return;
  const px = content.offsetWidth / (area.right - area.left + 1);
  if (!(px > 0)) return;
  const x = content.offsetLeft + ((cell % size) - area.left) * px;
  const y = content.offsetTop + (Math.floor(cell / size) - area.top) * px;
  const { clientWidth: width, clientHeight: height, scrollLeft, scrollTop } = frame;
  const place = (start: number, scrolled: number, room: number) => {
    if (how === "centre") return start + px / 2 - room / 2;
    if (start < scrolled) return start;
    return start + px > scrolled + room ? start + px - room : scrolled;
  };
  const left = place(x, scrollLeft, width);
  const top = place(y, scrollTop, height);
  if (Math.abs(left - scrollLeft) < 1 && Math.abs(top - scrollTop) < 1) return;
  frame.scrollTo({ left, top, behavior: reducedMotion() ? "auto" : "smooth" });
}

function sameArea(a: CaroArea, b: CaroArea): boolean {
  return a.top === b.top && a.left === b.left && a.bottom === b.bottom && a.right === b.right;
}

/**
 * A Gomoku board: grid lines drawn in SVG under a grid of buttons, and the winning line drawn over
 * them. The grid is a single Tab stop (roving tabindex): arrows, Home and End move between cells,
 * Enter or Space places a stone. On a touch screen whose cells are smaller than 24 px, a first tap
 * only selects a cell (with a preview and a hint) and a second tap on it places the stone.
 *
 * The board that grows shows its area in a frame of the same size, which scrolls (wheel, finger,
 * scroll bars, or dragging with the mouse) once the area is larger than it, with zoom buttons and
 * "go to the last move". The cells in view stay put as the area widens above or to the left, and a
 * move outside the view (the other player's, the AI's) is scrolled to.
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
  const zoomOutReasonId = useId();
  const zoomInReasonId = useId();
  const lastMoveReasonId = useId();
  const { size, board, area, infinite } = state;
  const cols = area.right - area.left + 1;
  const rows = area.bottom - area.top + 1;
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
  // Undo shrinks the board that grows: a focused cell left outside it no longer takes the Tab stop.
  const tabStop =
    focused !== null && focused < board.length && caroInArea(area, size, focused)
      ? focused
      : (lastCell ?? middle);

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

  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  // The columns across the frame: the whole board, or the zoom level of the board that grows.
  const columns = infinite ? (ZOOM_STEPS[zoom] ?? ZOOM_STEPS[DEFAULT_ZOOM]) : size;

  // Whether cells are too small for a finger, measured on the board itself.
  const frameRef = useRef<HTMLDivElement>(null);
  const [smallCells, setSmallCells] = useState(false);
  useEffect(() => {
    const frame = frameRef.current;
    if (frame === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) setSmallCells(entry.contentRect.width / columns < MIN_TOUCH_CELL_PX);
    });
    observer.observe(frame);
    return () => {
      observer.disconnect();
    };
  }, [columns]);

  // The board that grows: keep the cells in view where they are when the area widens above or to
  // the left (or shrinks, on undo), then bring a new move into view. Before the browser paints.
  const shownArea = useRef(area);
  const shownLast = useRef(lastCell);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const before = shownArea.current;
    const lastBefore = shownLast.current;
    shownArea.current = area;
    shownLast.current = lastCell;
    if (!infinite || frame === null) return;
    const content = frame.firstElementChild;
    if (!sameArea(before, area) && content instanceof HTMLElement) {
      const px = content.offsetWidth / cols;
      frame.scrollTop += (before.top - area.top) * px;
      frame.scrollLeft += (before.left - area.left) * px;
    }
    if (lastCell !== null && lastCell !== lastBefore) {
      scrollToCell(frame, { size, area }, lastCell, "nearest");
    }
  }, [infinite, area, cols, lastCell, columns, size]);

  // Opening a game of the board that grows already under way: its last move in the middle.
  const opened = useRef(false);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (opened.current || !infinite || frame === null) return;
    opened.current = true;
    scrollToCell(frame, { size, area }, lastCell ?? middle, "centre");
  }, [infinite, size, area, columns, lastCell, middle]);

  // Zooming keeps the cell in the middle of the frame where it is.
  const zoomAnchor = useRef<{ readonly x: number; readonly y: number } | null>(null);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const anchor = zoomAnchor.current;
    zoomAnchor.current = null;
    const content = frame?.firstElementChild;
    if (frame === null || anchor === null || !(content instanceof HTMLElement)) return;
    const px = content.offsetWidth / cols;
    frame.scrollLeft = content.offsetLeft + anchor.x * px - frame.clientWidth / 2;
    frame.scrollTop = content.offsetTop + anchor.y * px - frame.clientHeight / 2;
  }, [columns, cols]);

  function zoomTo(next: number) {
    const frame = frameRef.current;
    const content = frame?.firstElementChild;
    if (frame !== null && content instanceof HTMLElement && content.offsetWidth > 0) {
      const px = content.offsetWidth / cols;
      zoomAnchor.current = {
        x: (frame.scrollLeft + frame.clientWidth / 2 - content.offsetLeft) / px,
        y: (frame.scrollTop + frame.clientHeight / 2 - content.offsetTop) / px,
      };
    }
    setZoom(next);
  }

  // The pointer of the press that leads to the next click; cleared by every click.
  const pointerType = useRef<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Dragging the board that grows with the mouse (a finger scrolls it natively). A press that moves
  // past `DRAG_START_PX` scrolls the frame, and the click that ends it places nothing.
  const drag = useRef<{
    readonly x: number;
    readonly y: number;
    readonly left: number;
    readonly top: number;
    moved: boolean;
  } | null>(null);
  const dragged = useRef(false);
  const [dragging, setDragging] = useState(false);

  function handleFramePointerDown(event: PointerEvent<HTMLDivElement>) {
    dragged.current = false;
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const frame = event.currentTarget;
    // A press on the frame's own scroll bars is the browser's to handle.
    const box = frame.getBoundingClientRect();
    const onScrollBar =
      frame.clientWidth > 0 &&
      (event.clientX - box.left >= frame.clientLeft + frame.clientWidth ||
        event.clientY - box.top >= frame.clientTop + frame.clientHeight);
    if (onScrollBar) return;
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      left: frame.scrollLeft,
      top: frame.scrollTop,
      moved: false,
    };
  }

  function handleFramePointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (current === null) return;
    if ((event.buttons & 1) === 0) {
      drag.current = null;
      setDragging(false);
      return;
    }
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.moved && Math.hypot(dx, dy) > DRAG_START_PX) {
      current.moved = true;
      setDragging(true);
      // The drag goes on past the edge of the frame (not in every DOM, whatever the types say).
      const frame: Partial<Pick<HTMLElement, "setPointerCapture">> = event.currentTarget;
      frame.setPointerCapture?.(event.pointerId);
    }
    if (!current.moved) return;
    event.currentTarget.scrollLeft = current.left - dx;
    event.currentTarget.scrollTop = current.top - dy;
  }

  function handleFramePointerEnd() {
    if (drag.current?.moved === true) dragged.current = true;
    drag.current = null;
    setDragging(false);
  }

  function handleFrameClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!dragged.current) return;
    dragged.current = false;
    pointerType.current = null;
    event.stopPropagation();
    event.preventDefault();
  }

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
    const next = cellAfterKey(event.key, cell, size, area);
    if (next === null) return;
    event.preventDefault();
    setFocused(next);
    const button = gridRef.current?.querySelector<HTMLElement>(`[data-cell="${next}"]`);
    const frame = frameRef.current;
    if (!infinite || frame === null) {
      button?.focus();
      return;
    }
    // The frame scrolls just enough, the page not at all.
    button?.focus({ preventScroll: true });
    scrollToCell(frame, { size, area }, next, "nearest");
  }

  function handleFocus(event: FocusEvent<HTMLDivElement>) {
    const cell = cellOf(event.target);
    if (cell !== null) setFocused(cell);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    pointerType.current = event.pointerType;
  }

  // The name of every cell in the area, rebuilt only when a stone is placed or the area changes.
  const labels = useMemo(() => {
    const named = new Map<number, string>();
    for (let row = area.top; row <= area.bottom; row += 1) {
      for (let col = area.left; col <= area.right; col += 1) {
        const stone = board[row * size + col] ?? null;
        named.set(
          row * size + col,
          t("cell", {
            row: row + 1,
            col: col + 1,
            content:
              stone === null ? t("cellEmpty") : tCaro(stone === 0 ? "players.x" : "players.o"),
          }),
        );
      }
    }
    return named;
  }, [board, size, area, t, tCaro]);
  const describedBy = (cell: number) => {
    const ids = [
      cell === lastCell ? lastMoveId : null,
      winning.has(cell) ? winningId : null,
    ].filter((id) => id !== null);
    return ids.length === 0 ? undefined : ids.join(" ");
  };
  const firstWinning = winningLine?.[0];
  const lastWinning = winningLine?.at(-1);
  // A cell's centre, in cells from the top left of the area.
  const centreOf = (cell: number) => ({
    x: (cell % size) - area.left + 0.5,
    y: Math.floor(cell / size) - area.top + 0.5,
  });
  const winner = firstWinning === undefined ? null : (board[firstWinning] ?? null);

  const lines = (
    <svg
      aria-hidden
      viewBox={`0 0 ${cols} ${rows}`}
      preserveAspectRatio="none"
      // The board that grows has no frame right around its area: its edge lines are drawn whole.
      className={cn("absolute inset-0 size-full", infinite && "overflow-visible")}
    >
      <path
        d={gridPath(area, false)}
        fill="none"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        className="stroke-game-line"
      />
      {/* Every fifth line a little heavier, to count cells by. */}
      <path
        d={gridPath(area, true)}
        fill="none"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
        className="stroke-game-line"
      />
      {/* On the board that grows, dots placed from its edges would move with them. */}
      {!infinite &&
        starPoints(size).map(({ x, y }) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="0.08" className="fill-game-line" />
        ))}
    </svg>
  );

  const grid = (
    // Events are handled here for every cell, so the cells take plain values only.
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
      {Array.from({ length: rows }, (_unused, rowIndex) => (
        <div key={area.top + rowIndex} role="row" className="flex min-h-0 flex-1">
          {Array.from({ length: cols }, (_cellUnused, colIndex) => {
            const cell = (area.top + rowIndex) * size + area.left + colIndex;
            const stone = board[cell] ?? null;
            return (
              <Cell
                key={cell}
                cell={cell}
                stone={stone}
                label={labels.get(cell) ?? ""}
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
  );

  const winningLineDrawing = firstWinning !== undefined && lastWinning !== undefined && (
    <WinningLine
      cols={cols}
      rows={rows}
      from={centreOf(firstWinning)}
      to={centreOf(lastWinning)}
      winner={winner}
    />
  );

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
        {infinite ? (
          // A frame that scrolls, holding the whole area at the zoom's size of cell (in units of
          // the frame's width, so it is right before anything is measured), in the middle while
          // it is smaller. Room around it for the focus ring of a cell on its edge. Dragging
          // sideways at the end of the board does not scroll the page; up and down still reach it.
          <div
            ref={frameRef}
            data-caro-frame=""
            className={cn(
              "@container relative flex aspect-square min-w-0 flex-1 [scrollbar-width:thin] overflow-auto overscroll-x-contain p-0.75",
              dragging && "cursor-grabbing select-none",
            )}
            onPointerDown={handleFramePointerDown}
            onPointerMove={handleFramePointerMove}
            onPointerUp={handleFramePointerEnd}
            onPointerCancel={handleFramePointerEnd}
            onClickCapture={handleFrameClickCapture}
          >
            <div
              className="relative m-auto shrink-0"
              style={{
                width: `calc(100cqw * ${cols} / ${columns})`,
                height: `calc(100cqw * ${rows} / ${columns})`,
              }}
            >
              {lines}
              {grid}
              {winningLineDrawing}
            </div>
          </div>
        ) : (
          <div ref={frameRef} className="relative aspect-square min-w-0 flex-1">
            {lines}
            {grid}
            {winningLineDrawing}
          </div>
        )}
      </div>
    </div>
  );

  const hint = (
    // Room kept on a phone, where a tap selects; a laptop's cells are large enough to place at once.
    <p
      aria-live="polite"
      className="min-h-5 text-center text-small text-fg-muted lg:min-h-0 lg:text-left short-landscape:text-left"
    >
      {selectedCell === null ? "" : tCaro("boardHint")}
    </p>
  );

  const zoomedOut = zoom === 0;
  const zoomedIn = zoom === ZOOM_STEPS.length - 1;

  return layout({
    board: boardPart,
    // Not a status: the play screen's turn line is the one status of the page.
    controls: infinite ? (
      <div className="flex flex-col gap-2">
        <div
          role="group"
          aria-label={tCaro("view")}
          className="flex flex-wrap justify-center gap-2 lg:justify-start short-landscape:justify-start"
        >
          <Button
            variant="secondary"
            size="icon"
            aria-label={tCaro("zoomOut")}
            aria-disabled={zoomedOut}
            aria-describedby={zoomedOut ? zoomOutReasonId : undefined}
            onClick={() => {
              zoomTo(zoom - 1);
            }}
          >
            <ZoomOutIcon aria-hidden className="size-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            aria-label={tCaro("zoomIn")}
            aria-disabled={zoomedIn}
            aria-describedby={zoomedIn ? zoomInReasonId : undefined}
            onClick={() => {
              zoomTo(zoom + 1);
            }}
          >
            <ZoomInIcon aria-hidden className="size-5" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-11"
            aria-disabled={lastCell === null}
            aria-describedby={lastCell === null ? lastMoveReasonId : undefined}
            onClick={() => {
              const frame = frameRef.current;
              if (frame !== null && lastCell !== null) {
                scrollToCell(frame, { size, area }, lastCell, "centre");
              }
            }}
          >
            <LocateFixedIcon aria-hidden className="size-4" />
            {tCaro("toLastMove")}
          </Button>
          <span id={zoomOutReasonId} hidden>
            {tCaro("zoomMin")}
          </span>
          <span id={zoomInReasonId} hidden>
            {tCaro("zoomMax")}
          </span>
          <span id={lastMoveReasonId} hidden>
            {tCaro("noMoveYet")}
          </span>
        </div>
        {hint}
      </div>
    ) : (
      hint
    ),
  });
}

/**
 * The winning line, as on paper: a stroke of the winner's pen through the centres of its cells,
 * circled by a loop of the celebration colour. In cells of the area shown.
 */
function WinningLine({
  cols,
  rows,
  from,
  to,
  winner,
}: {
  cols: number;
  rows: number;
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
      viewBox={`0 0 ${cols} ${rows}`}
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
