"use client";

import {
  generalInCheck,
  isRedPiece,
  kindOf,
  pointOf,
  XIANGQI_COLUMNS,
  XIANGQI_ROWS,
  type XiangqiMove,
  type XiangqiPiece,
  type XiangqiState,
  xOf,
  yOf,
} from "@board-games/games/xiangqi";
import { ArrowUpDownIcon, Badge, Button, cn } from "@board-games/ui";
import { useFormatter, useTranslations } from "next-intl";
import {
  type FocusEvent,
  type KeyboardEvent,
  memo,
  type MouseEvent,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import type { BoardProps } from "../types";
import { BoardLines } from "./board-lines";
import { XiangqiMoveSheet } from "./MoveSheet";
import { XiangqiPieceDisc } from "./pieces";
import { useXiangqiPlayerLabel } from "./words";

const COLUMNS = Array.from({ length: XIANGQI_COLUMNS }, (_unused, index) => index);
const ROWS = Array.from({ length: XIANGQI_ROWS }, (_unused, index) => index);

/** The point shown at a place on screen (row 0 at the top), with `redBelow` or Đen below. */
function pointAtPlace(row: number, col: number, redBelow: boolean): number {
  return redBelow ? pointOf(col, row) : pointOf(XIANGQI_COLUMNS - 1 - col, XIANGQI_ROWS - 1 - row);
}

/** Where a point is shown. */
function placeOfPoint(point: number, redBelow: boolean): { row: number; col: number } {
  return redBelow
    ? { row: yOf(point), col: xOf(point) }
    : { row: XIANGQI_ROWS - 1 - yOf(point), col: XIANGQI_COLUMNS - 1 - xOf(point) };
}

/** Đỏ's column of a point (1 on Đỏ's right) and its row from Đỏ's side (1–10): how points are named. */
function pointWords(point: number): { col: number; row: number } {
  return { col: XIANGQI_COLUMNS - xOf(point), row: XIANGQI_ROWS - yOf(point) };
}

function pointOfTarget(target: EventTarget): number | null {
  if (!(target instanceof Element)) return null;
  const value = target.closest<HTMLElement>("[data-point]")?.dataset.point;
  return value === undefined ? null : Number(value);
}

/** What a point the chosen piece may go to is: an empty point, or a piece to take. */
type Target = "quiet" | "capture";

interface PointProps {
  readonly point: number;
  readonly piece: XiangqiPiece | null;
  readonly label: string;
  readonly tabStop: boolean;
  readonly selected: boolean | undefined;
  readonly target: Target | null;
  readonly lastFrom: boolean;
  readonly lastTo: boolean;
  readonly inCheck: boolean;
  readonly describedBy: string | undefined;
  readonly locked: boolean;
}

/**
 * One point: a button the size of a cell around the intersection. Plain values only (events go to
 * the grid), so a move re-renders only the points that changed. Every mark is a shape, never a
 * colour alone: the choice a thick ring, a target a dot, a piece to take four corners, the last
 * move dashed rings, a general in check a glow and a ring.
 */
const Point = memo(function Point({
  point,
  piece,
  label,
  tabStop,
  selected,
  target,
  lastFrom,
  lastTo,
  inCheck,
  describedBy,
  locked,
}: PointProps) {
  return (
    <div role="gridcell" aria-selected={selected} className="relative flex min-w-0 flex-1">
      <button
        type="button"
        data-point={point}
        tabIndex={tabStop ? 0 : -1}
        aria-label={label}
        aria-disabled={locked || undefined}
        aria-describedby={describedBy}
        className={cn(
          "focus-ring relative block size-full rounded-full",
          locked
            ? "cursor-default"
            : "cursor-pointer hover:before:absolute hover:before:inset-[6%] hover:before:rounded-full hover:before:bg-game-highlight/10",
        )}
      >
        {inCheck && (
          <span
            data-mark="check"
            aria-hidden
            className="pointer-events-none absolute inset-[2%] rounded-full bg-[radial-gradient(circle,var(--xiangqi-check)_0,color-mix(in_srgb,var(--xiangqi-check)_45%,transparent)_55%,transparent_72%)]"
          />
        )}
        {piece !== null && (
          <span data-piece={piece} aria-hidden className="pointer-events-none absolute inset-[6%]">
            <XiangqiPieceDisc piece={piece} className="size-full" />
          </span>
        )}
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          className="pointer-events-none absolute inset-0 size-full overflow-visible"
        >
          {lastFrom && (
            <circle
              data-mark="last"
              cx="50"
              cy="50"
              r="16"
              fill="none"
              strokeWidth="5"
              strokeDasharray="7 6"
              className="stroke-game-last-move"
            />
          )}
          {lastTo && (
            <circle
              data-mark="last"
              cx="50"
              cy="50"
              r="47"
              fill="none"
              strokeWidth="5"
              strokeDasharray="9 7"
              className="stroke-game-last-move"
            />
          )}
          {selected === true && (
            <>
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                strokeWidth="11"
                className="stroke-(--xiangqi-halo)"
              />
              <circle
                data-mark="selected"
                cx="50"
                cy="50"
                r="46"
                fill="none"
                strokeWidth="6"
                className="stroke-game-highlight"
              />
            </>
          )}
          {target === "quiet" && (
            <circle
              data-mark="target"
              cx="50"
              cy="50"
              r="13"
              strokeWidth="4"
              className="fill-(--xiangqi-target) stroke-(--xiangqi-halo)"
            />
          )}
          {target === "capture" && (
            <g
              data-mark="capture"
              fill="none"
              strokeWidth="7"
              strokeLinecap="round"
              className="stroke-(--xiangqi-target)"
            >
              <path d="M4 26V4H26M74 4H96V26M96 74V96H74M26 96H4V74" />
            </g>
          )}
          {inCheck && (
            <circle
              cx="50"
              cy="50"
              r="47"
              fill="none"
              strokeWidth="5"
              className="stroke-(--xiangqi-check)"
            />
          )}
        </svg>
      </button>
    </div>
  );
});

/**
 * The board of Cờ tướng (design §6 of `add-xiangqi-game`): 90 points as buttons in the order shown
 * (top row first), over a drawing of its lines, river and palaces; Đỏ below on a shared device, the
 * player's own side online, flipped on request. A press chooses a piece, then a point; the keyboard
 * moves on one Tab stop. Its notes say the choice and a check; its controls are the score sheet and
 * "Lật bàn". The two seats sit above and below it (`seatOrder`).
 */
export function XiangqiBoard({
  state,
  legalMoves,
  onMove,
  disabled,
  result,
  lastEntry,
  viewer,
  layout,
}: BoardProps<XiangqiState, XiangqiMove>) {
  const t = useTranslations("Games.xiangqi");
  const tPlay = useTranslations("Play");
  const format = useFormatter();
  const playerLabel = useXiangqiPlayerLabel();
  const targetId = useId();
  const captureId = useId();
  const lastMoveId = useId();
  const inCheckId = useId();
  const gridRef = useRef<HTMLDivElement>(null);

  // Who is below: the viewer's side (Đỏ on a shared device), unless flipped; a flip belongs to the
  // side it was made from, so a new game online with the sides swapped shows the player's own.
  const base = viewer !== 1;
  const [flip, setFlip] = useState({ base, flipped: false });
  if (flip.base !== base) setFlip({ base, flipped: false });
  const flipped = flip.base === base && flip.flipped;
  const redBelow = flipped ? !base : base;

  const { board } = state;
  // A position is its pieces, the side to move and how many moves led there: compared by content,
  // since online the state is rebuilt on every update of the room.
  const key = `${String(state.notes.length)}|${state.steps.at(-1)?.key ?? ""}`;
  const movesFrom = useMemo(() => {
    const grouped = new Map<number, XiangqiMove[]>();
    for (const move of legalMoves) {
      const moves = grouped.get(move.from);
      if (moves === undefined) grouped.set(move.from, [move]);
      else moves.push(move);
    }
    return grouped;
  }, [legalMoves]);

  const [chosen, setChosen] = useState<{ readonly key: string; readonly from: number } | null>(
    null,
  );
  const [noMoves, setNoMoves] = useState<{ readonly key: string; readonly point: number } | null>(
    null,
  );
  // A choice holds in its own position on an open board, while its piece may still move.
  const holds = chosen !== null && !disabled && chosen.key === key && movesFrom.has(chosen.from);
  if (chosen !== null && !holds) setChosen(null);
  const from = holds ? chosen.from : null;
  const noMovesHolds = noMoves !== null && noMoves.key === key && !disabled && from === null;
  if (noMoves !== null && !noMovesHolds) setNoMoves(null);

  const targets = useMemo(() => {
    const found = new Map<number, Target>();
    if (from === null) return found;
    for (const move of movesFrom.get(from) ?? []) {
      found.set(move.to, board[move.to] == null ? "quiet" : "capture");
    }
    return found;
  }, [board, from, movesFrom]);

  const toMoveRed = state.toMove === 0;
  // The general in check stays marked once mated, as in Cờ vua; the "Chiếu!" line is for play.
  const inCheck = generalInCheck(board, toMoveRed);
  const checkPoint = inCheck ? board.indexOf(toMoveRed ? "K" : "k") : -1;
  const checked = inCheck && result === null;
  const last = lastEntry?.move ?? null;

  // The roving Tab stop: the point focused last, else the last move's, else the general below.
  const [focused, setFocused] = useState<number | null>(null);
  const tabStop = focused ?? last?.to ?? board.indexOf(redBelow ? "K" : "k");

  function focusPoint(point: number) {
    gridRef.current?.querySelector<HTMLElement>(`[data-point="${String(point)}"]`)?.focus();
  }

  function press(point: number) {
    if (disabled) return;
    if (from !== null) {
      const move = (movesFrom.get(from) ?? []).find((candidate) => candidate.to === point);
      if (move !== undefined) {
        setChosen(null);
        setNoMoves(null);
        onMove(move);
        return;
      }
    }
    const piece = board[point] ?? null;
    if (piece !== null && isRedPiece(piece) === toMoveRed && point !== from) {
      if (movesFrom.has(point)) {
        setChosen({ key, from: point });
        setNoMoves(null);
      } else {
        setChosen(null);
        setNoMoves({ key, point });
      }
      return;
    }
    setChosen(null);
    setNoMoves(null);
  }

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const point = pointOfTarget(event.target);
    if (point !== null) press(point);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !event.repeat) {
      if (from !== null || noMovesHolds) event.preventDefault();
      setChosen(null);
      setNoMoves(null);
      return;
    }
    // A held Enter or Space would choose a piece and then play it: only the first press counts.
    // Held arrows go on moving, and a held Tab still leaves the board.
    if (event.repeat && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      return;
    }
    const point = pointOfTarget(event.target);
    if (point === null) return;
    const { row, col } = placeOfPoint(point, redBelow);
    const clampRow = (r: number) => Math.min(Math.max(r, 0), XIANGQI_ROWS - 1);
    const clampCol = (c: number) => Math.min(Math.max(c, 0), XIANGQI_COLUMNS - 1);
    const places: Readonly<Record<string, readonly [number, number]>> = {
      ArrowUp: [clampRow(row - 1), col],
      ArrowDown: [clampRow(row + 1), col],
      ArrowLeft: [row, clampCol(col - 1)],
      ArrowRight: [row, clampCol(col + 1)],
      Home: [row, 0],
      End: [row, XIANGQI_COLUMNS - 1],
    };
    const place = places[event.key];
    if (place === undefined) return;
    event.preventDefault();
    const next = pointAtPlace(place[0], place[1], redBelow);
    setFocused(next);
    focusPoint(next);
  }

  function handleFocus(event: FocusEvent<HTMLDivElement>) {
    const point = pointOfTarget(event.target);
    if (point !== null) setFocused(point);
  }

  const pieceWords = (piece: XiangqiPiece) => ({
    piece: t(`pieces.${kindOf(piece)}`),
    colour: t(isRedPiece(piece) ? "colour.red" : "colour.black"),
  });

  // Every point's name, rebuilt only when a piece moves (or the language changes).
  const labels = useMemo(
    () =>
      board.map((piece, point) =>
        piece == null
          ? t("point.empty", pointWords(point))
          : t("point.piece", { ...pieceWords(piece), ...pointWords(point) }),
      ),
    // `pieceWords` reads only `t`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board, t],
  );

  const describedBy = (point: number) => {
    const target = targets.get(point);
    const ids = [
      target === "quiet" ? targetId : target === "capture" ? captureId : null,
      point === last?.from || point === last?.to ? lastMoveId : null,
      point === checkPoint ? inCheckId : null,
    ].filter((id) => id !== null);
    return ids.length === 0 ? undefined : ids.join(" ");
  };

  let hint = "";
  if (from !== null) {
    const piece = board[from];
    const quiet = [...targets.values()].filter((kind) => kind === "quiet").length;
    const takes = [...targets]
      .filter(([, kind]) => kind === "capture")
      .map(([point]) => {
        const taken = board[point];
        return taken == null ? "" : t(`pieces.${kindOf(taken)}`);
      });
    const moves = [
      quiet > 0 ? t("selection.quiet", { count: quiet }) : null,
      takes.length > 0 ? t("selection.capture", { pieces: format.list(takes) }) : null,
    ].filter((part) => part !== null);
    if (piece != null) {
      hint = t("selection.chosen", {
        ...pieceWords(piece),
        ...pointWords(from),
        moves: format.list(moves, { type: "unit", style: "short" }),
      });
    }
  } else if (noMovesHolds) {
    const piece = board[noMoves.point];
    if (piece != null)
      hint = t("selection.noMoves", { ...pieceWords(piece), ...pointWords(noMoves.point) });
  }

  // The column numbers: the side above counts from its right (1 on the left as seen), the side
  // below from its own (9 on the left), whichever is below.
  const numbers = (below: boolean) =>
    COLUMNS.map((col) => (below ? XIANGQI_COLUMNS - col : col + 1));

  const boardPart = (
    <div className="mx-auto w-[min(var(--board-room,100%),34rem)]">
      <span id={targetId} hidden>
        {t("point.target")}
      </span>
      <span id={captureId} hidden>
        {t("point.capture")}
      </span>
      <span id={lastMoveId} hidden>
        {tPlay("lastMove")}
      </span>
      <span id={inCheckId} hidden>
        {t("point.inCheck")}
      </span>
      <div
        data-xiangqi-board=""
        className={cn(
          "@container rounded-[2.5cqw] border-[0.8cqw] border-(--xiangqi-disc-edge) bg-game-board px-[1cqw]",
        )}
      >
        <div
          aria-hidden
          className="flex text-[max(10px,2.6cqw)] leading-[1.6] font-bold text-game-line"
        >
          {numbers(false).map((number) => (
            <span key={number} className="flex-1 text-center tabular-nums">
              {number}
            </span>
          ))}
        </div>
        <div className="relative">
          <BoardLines />
          <div
            ref={gridRef}
            role="grid"
            aria-label={tPlay("board")}
            className="relative flex aspect-[9/10] touch-manipulation flex-col"
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
          >
            {ROWS.map((row) => (
              <div key={row} role="row" className="flex min-h-0 flex-1">
                {COLUMNS.map((col) => {
                  const point = pointAtPlace(row, col, redBelow);
                  return (
                    <Point
                      key={point}
                      point={point}
                      piece={board[point] ?? null}
                      label={labels[point] ?? ""}
                      tabStop={point === tabStop}
                      selected={from === null ? undefined : point === from}
                      target={targets.get(point) ?? null}
                      lastFrom={point === last?.from}
                      lastTo={point === last?.to}
                      inCheck={point === checkPoint}
                      describedBy={describedBy(point)}
                      locked={disabled}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div
          aria-hidden
          className="flex text-[max(10px,2.6cqw)] leading-[1.6] font-bold text-game-line"
        >
          {numbers(true).map((number) => (
            <span key={number} className="flex-1 text-center tabular-nums">
              {number}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const notes = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 lg:flex-col lg:items-start lg:gap-1">
      <p aria-live="polite" className="text-small text-fg-muted lg:min-h-5">
        {hint}
      </p>
      <p
        aria-live={viewer === null ? "polite" : "off"}
        className="flex flex-wrap items-center gap-x-2 text-small font-semibold lg:min-h-7"
      >
        {checked && (
          <>
            <Badge variant="danger">{t("check.badge")}</Badge>{" "}
            <span>{t("check.line", { player: playerLabel(state.toMove) })}</span>
          </>
        )}
      </p>
    </div>
  );

  const controls = (
    <div className="flex items-center gap-2 lg:flex-col lg:items-start lg:gap-3">
      <XiangqiMoveSheet
        notes={state.notes}
        result={result}
        className="flex-1 max-lg:min-w-0 lg:w-full"
      />
      <Button
        variant="secondary"
        aria-pressed={flipped}
        onClick={() => {
          setFlip({ base, flipped: !flipped });
        }}
        className="shrink-0 max-lg:size-11 max-lg:px-0"
      >
        <ArrowUpDownIcon aria-hidden className="size-5 lg:hidden" />
        <span className="max-lg:sr-only">{t("flip")}</span>
      </Button>
    </div>
  );

  return layout({
    board: boardPart,
    controls,
    notes,
    seatOrder: redBelow ? [1, 0] : [0, 1],
  });
}
