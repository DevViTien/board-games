"use client";

import {
  chess,
  CHESS_COLOR,
  CHESS_PIECE,
  chessBoard,
  type ChessColor,
  chessKingInCheck,
  type ChessMove,
  type ChessPieceMove,
  type ChessPieceType,
  type ChessPromotionPiece,
  type ChessSquare,
  chessSquareAt,
  type ChessState,
  isChessDrawClaim,
} from "@board-games/games/chess";
import { ArrowUpDownIcon, Badge, Button, cn } from "@board-games/ui";
import { useFormatter, useTranslations } from "next-intl";
import {
  type KeyboardEvent,
  memo,
  type MouseEvent,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

import type { BoardProps } from "../types";
import { MoveSheet } from "./MoveSheet";
import { ChessPiece } from "./pieces";
import { colourOfSeat, seatOfColour, useChessPlayerLabel } from "./player-label";
import { PromotionPicker, type PromotionRequest } from "./PromotionPicker";
import {
  focusSquare,
  placeOfSquare,
  squareAtPlace,
  squareOf,
  useRovingFocus,
} from "./use-roving-focus";
import { positionKey, useSelection } from "./use-selection";

/** A moved piece slides this long (design §11): within the AI's and the room's pacing (300 ms). */
const CHESS_SLIDE_MS = 180;

const PLACES = Array.from({ length: 8 }, (_unused, index) => index);

function otherColour(colour: ChessColor): ChessColor {
  return colour === CHESS_COLOR.White ? CHESS_COLOR.Black : CHESS_COLOR.White;
}

/** The index of a square in `chessBoard` (a1 = 0 … h8 = 63). */
function indexOfSquare(square: ChessSquare): number {
  return (Number(square[1]) - 1) * 8 + (square.charCodeAt(0) - "a".charCodeAt(0));
}

/** a1 is dark: a square is light when its file and rank (from 0) add up to an odd number. */
function isLightSquare(square: ChessSquare): boolean {
  const index = indexOfSquare(square);
  return ((index % 8) + Math.floor(index / 8)) % 2 === 1;
}

/** Where a target square stands: a quiet move to it, or a capture (en passant included). */
type Target = "quiet" | "capture";

/** The rook's squares when the king castles to `kingTo` (`g1`, `c8`…), or `null`. */
function castlingRook(kingTo: ChessSquare): { from: ChessSquare; to: ChessSquare } | null {
  const rank = kingTo[1] ?? "1";
  if (kingTo.startsWith("g"))
    return { from: `h${rank}` as ChessSquare, to: `f${rank}` as ChessSquare };
  if (kingTo.startsWith("c"))
    return { from: `a${rank}` as ChessSquare, to: `d${rank}` as ChessSquare };
  return null;
}

interface SquareProps {
  readonly square: ChessSquare;
  readonly light: boolean;
  /** The piece on the square, as plain values (a new object per position would re-render it). */
  readonly pieceType: ChessPieceType | null;
  readonly pieceColour: ChessColor | null;
  readonly label: string;
  readonly tabStop: boolean;
  /** `true` on the selected square, `false` on the others while a piece is selected, else `undefined`. */
  readonly selected: boolean | undefined;
  readonly target: Target | null;
  readonly last: boolean;
  readonly inCheck: boolean;
  /** The rank shown in the square's top left (left column), or `null`. */
  readonly rank: string | null;
  /** The file shown in the square's bottom right (bottom row), or `null`. */
  readonly file: string | null;
  readonly describedBy: string | undefined;
  readonly locked: boolean;
}

/**
 * One square: a button inside a grid cell. Only plain values come in (events are handled by the
 * grid), so a move re-renders only the squares that changed. Every mark is a shape and never a
 * colour alone (design §7): the selection a solid frame inside the square, the last move a dashed
 * one, a target a dot, a capture four corners, a king in check a red glow and a ring; the focus is
 * the shared ring outside the square.
 */
const Square = memo(function Square({
  square,
  light,
  pieceType,
  pieceColour,
  label,
  tabStop,
  selected,
  target,
  last,
  inCheck,
  rank,
  file,
  describedBy,
  locked,
}: SquareProps) {
  const tinted = selected === true || last;
  return (
    <div role="gridcell" aria-selected={selected} className="relative flex min-w-0 flex-1">
      <button
        type="button"
        data-square={square}
        tabIndex={tabStop ? 0 : -1}
        aria-label={label}
        aria-disabled={locked || undefined}
        aria-describedby={describedBy}
        className={cn(
          "focus-ring relative block size-full",
          tinted
            ? light
              ? "bg-(--chess-mark-light)"
              : "bg-(--chess-mark-dark)"
            : light
              ? "bg-game-board"
              : "bg-(--chess-square-dark)",
          // Hover as a faint ink layer under the piece, not a `filter`: a filter makes a stacking
          // context that would hide a piece sliding in from another square.
          locked
            ? "cursor-default"
            : "cursor-pointer hover:before:absolute hover:before:inset-0 hover:before:bg-game-highlight/10",
        )}
      >
        {last && (
          <span
            data-mark="last"
            aria-hidden
            className="pointer-events-none absolute inset-[9%] rounded-[2px] border-[2.5px] border-dashed border-game-last-move shadow-[0_0_0_1.5px_var(--chess-paper),inset_0_0_0_1.5px_var(--chess-paper)]"
          />
        )}
        {inCheck && (
          <span
            data-mark="check"
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_52%,var(--chess-check)_0,color-mix(in_srgb,var(--chess-check)_60%,transparent)_45%,transparent_70%)]"
          />
        )}
        {pieceType !== null && pieceColour !== null && (
          // 92 % of the square: the coordinates in the edge squares' corners stay clear of it.
          <span data-piece="" aria-hidden className="pointer-events-none absolute inset-[4%]">
            <ChessPiece type={pieceType} look={pieceColour} className="size-full" />
          </span>
        )}
        {(target !== null || inCheck) && (
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            className="pointer-events-none absolute inset-0 size-full"
          >
            {target === "quiet" && (
              <circle
                data-mark="target"
                cx="50"
                cy="50"
                r="13"
                strokeWidth="3"
                className="fill-game-highlight stroke-(--chess-paper)"
              />
            )}
            {target === "capture" && (
              <g
                data-mark="capture"
                strokeWidth="2.5"
                strokeLinejoin="round"
                className="fill-game-highlight stroke-(--chess-paper)"
              >
                <path d="M3 3H25L3 25Z" />
                <path d="M97 3H75L97 25Z" />
                <path d="M3 97H25L3 75Z" />
                <path d="M97 97H75L97 75Z" />
              </g>
            )}
            {inCheck && (
              <>
                <circle
                  cx="50"
                  cy="52"
                  r="44"
                  strokeWidth="6"
                  fill="none"
                  className="stroke-(--chess-paper)"
                />
                <circle
                  cx="50"
                  cy="52"
                  r="44"
                  strokeWidth="2.5"
                  fill="none"
                  className="stroke-game-highlight"
                />
              </>
            )}
          </svg>
        )}
        {selected === true && (
          <span
            data-mark="selected"
            aria-hidden
            className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_2px_var(--chess-paper),inset_0_0_0_5px_var(--game-highlight)]"
          />
        )}
      </button>
      {/* HTML, not SVG text: never smaller than 10 px, whatever the size of the board. Beside the
        button, not in it: the square's name is its own ("Ô a6 trống"), and a visible "6" inside
        it would not be part of that name (WCAG 2.5.3). Over the button, letting presses through. */}
      {rank !== null && (
        <span
          data-coordinate="rank"
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-[3px] left-1 text-[max(10px,2cqw)] leading-none font-bold",
            light || tinted ? "text-(--chess-coord)" : "text-(--chess-coord-on-dark)",
          )}
        >
          {rank}
        </span>
      )}
      {file !== null && (
        <span
          data-coordinate="file"
          aria-hidden
          className={cn(
            "pointer-events-none absolute right-1 bottom-[3px] text-[max(10px,2cqw)] leading-none font-bold",
            light || tinted ? "text-(--chess-coord)" : "text-(--chess-coord-on-dark)",
          )}
        >
          {file}
        </span>
      )}
    </div>
  );
});

/**
 * The Chess board (design §5–§8): an 8 × 8 grid of buttons in the order it is shown (top row
 * first, so reading and arrows match the screen), the player's side at the bottom (White on a shared
 * device, the player's own online, flipped on request); a tap or a click selects a piece and then
 * its square; the keyboard moves on one Tab stop; a pawn's promotion asks for its piece. Its
 * controls: the selection's words (the board's only live region), check, "Claim a draw", the score
 * sheet and "Flip board". The two seats sit above and below it (`seatOrder`).
 */
export function ChessBoard({
  state,
  legalMoves,
  onMove,
  disabled,
  result,
  lastEntry,
  viewer,
  layout,
}: BoardProps<ChessState, ChessMove>) {
  const t = useTranslations("Games.chess");
  const tPlay = useTranslations("Play");
  const format = useFormatter();
  const playerLabel = useChessPlayerLabel();
  const targetId = useId();
  const captureId = useId();
  const lastMoveId = useId();
  const inCheckId = useId();
  const claimReasonId = useId();
  const gridRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Who is at the bottom: the viewer's side (White on a shared device), unless flipped. A flip
  // belongs to the side it was made from: when the viewer's side changes (a rematch online), the
  // board is back to its own side. Adjusted during render.
  const base = viewer === 1 ? CHESS_COLOR.Black : CHESS_COLOR.White;
  const [flip, setFlip] = useState<{ readonly base: ChessColor; readonly flipped: boolean }>({
    base,
    flipped: false,
  });
  if (flip.base !== base) setFlip({ base, flipped: false });
  const flipped = flip.base === base && flip.flipped;
  const bottom = flipped ? otherColour(base) : base;

  // By the position, not the state object: online, the state is rebuilt on every update of the
  // room, and both read only the position.
  const { fen } = state;
  const board = useMemo(() => chessBoard({ fen, positions: [], san: [], drawClaim: null }), [fen]);
  const checkSquare = useMemo(
    () => chessKingInCheck({ fen, positions: [], san: [], drawClaim: null }),
    [fen],
  );
  const toMove = colourOfSeat(chess.currentPlayer(state));
  const key = positionKey(state);
  const selection = useSelection(state, legalMoves, disabled);
  const selectedFrom = selection.from;
  const pieceAt = (square: ChessSquare) => board[indexOfSquare(square)] ?? null;

  // "This piece has no move": said until the next press, in the same position.
  const [noMoves, setNoMoves] = useState<{
    readonly key: string;
    readonly square: ChessSquare;
  } | null>(null);
  const noMovesHolds =
    noMoves !== null && noMoves.key === key && !disabled && selectedFrom === null;
  if (noMoves !== null && !noMovesHolds) setNoMoves(null);

  // The squares the selected piece may go to: a capture when an enemy piece is there, or a pawn
  // going sideways to an empty square (en passant).
  const targets = useMemo(() => {
    const found = new Map<ChessSquare, Target>();
    if (selectedFrom === null) return found;
    const moving = board[indexOfSquare(selectedFrom)];
    for (const move of selection.movesFrom.get(selectedFrom) ?? []) {
      // A pawn changing file captures, onto an empty square too (en passant).
      const sideways =
        moving?.type === CHESS_PIECE.Pawn && !move.to.startsWith(move.from.charAt(0));
      const taken = board[indexOfSquare(move.to)] ?? null;
      found.set(move.to, taken !== null || sideways ? "capture" : "quiet");
    }
    return found;
  }, [board, selection.movesFrom, selectedFrom]);

  const lastMove = lastEntry === null || isChessDrawClaim(lastEntry.move) ? null : lastEntry.move;
  const kingSquare = (() => {
    const index = board.findIndex(
      (piece) => piece?.type === CHESS_PIECE.King && piece.color === bottom,
    );
    return index === -1 ? ("e1" as ChessSquare) : chessSquareAt(index);
  })();
  const roving = useRovingFocus(gridRef, bottom, lastMove?.to ?? kingSquare);

  // The promotion picker gives the focus back to the square the pawn was going to.
  const promotionTo = useRef<ChessSquare | null>(null);
  const handlePromotionClosed = useCallback(() => {
    if (promotionTo.current !== null) focusSquare(gridRef.current, promotionTo.current);
  }, []);

  // The piece just moved slides from its square (the rook too, when castling). Only for one more
  // move than shown before: never on undo, a reload, a new game, nor an update of the room.
  const plies = state.san.length;
  const shownPlies = useRef(plies);
  const lastSan = state.san.at(-1) ?? "";
  const lastFrom = lastMove?.from ?? null;
  const lastTo = lastMove?.to ?? null;
  useLayoutEffect(() => {
    const before = shownPlies.current;
    shownPlies.current = plies;
    if (plies !== before + 1 || reducedMotion || lastFrom === null || lastTo === null) return;
    const grid = gridRef.current;
    const slide = (from: ChessSquare, to: ChessSquare) => {
      const start = grid?.querySelector(`[data-square="${from}"]`);
      const end = grid?.querySelector(`[data-square="${to}"]`);
      const piece = end?.querySelector<HTMLElement>("[data-piece]");
      if (start == null || end == null || piece == null || typeof piece.animate !== "function")
        return;
      const a = start.getBoundingClientRect();
      const b = end.getBoundingClientRect();
      piece.animate(
        [
          { transform: `translate(${a.left - b.left}px, ${a.top - b.top}px)`, zIndex: 20 },
          { transform: "translate(0, 0)", zIndex: 20 },
        ],
        { duration: CHESS_SLIDE_MS, easing: "ease-out" },
      );
    };
    slide(lastFrom, lastTo);
    const rook = lastSan.startsWith("O-O") ? castlingRook(lastTo) : null;
    if (rook !== null) slide(rook.from, rook.to);
  }, [plies, reducedMotion, lastFrom, lastTo, lastSan]);

  function play(move: ChessPieceMove) {
    selection.clear();
    setNoMoves(null);
    onMove(move);
  }

  function press(square: ChessSquare) {
    if (disabled) return;
    if (selectedFrom !== null) {
      const moves = (selection.movesFrom.get(selectedFrom) ?? []).filter(
        (move) => move.to === square,
      );
      const [only] = moves;
      if (moves.length === 1 && only !== undefined) {
        play(only);
        return;
      }
      if (moves.length > 1) {
        // A promotion: four moves to the same square, one per piece. Never the first one alone.
        promotionTo.current = square;
        selection.askPromotion(square);
        return;
      }
    }
    const piece = pieceAt(square);
    if (piece?.color === toMove && square !== selectedFrom) {
      if (selection.movesFrom.has(square)) {
        selection.select(square);
        setNoMoves(null);
      } else {
        selection.clear();
        setNoMoves({ key, square });
      }
      return;
    }
    selection.clear();
    setNoMoves(null);
  }

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const square = squareOf(event.target);
    if (square !== null) press(square);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !event.repeat) {
      // Drops the selection; the focus stays on its square.
      if (selectedFrom !== null || noMovesHolds) event.preventDefault();
      selection.clear();
      setNoMoves(null);
      return;
    }
    roving.onKeyDown(event);
  }

  function choosePromotion(piece: ChessPromotionPiece) {
    const pending = selection.promotion;
    if (pending === null) return;
    const move = (selection.movesFrom.get(pending.from) ?? []).find(
      (candidate) => candidate.to === pending.to && candidate.promotion === piece,
    );
    if (move !== undefined) play(move);
  }

  // Every square's name, rebuilt only when a piece moves (or the language changes).
  const labels = useMemo(
    () =>
      board.map((piece, index) => {
        const square = chessSquareAt(index);
        return piece === null
          ? t("square.empty", { square })
          : t("square.piece", {
              piece: t(`pieces.${piece.type}`),
              colour: t(`colour.${piece.color}`),
              square,
            });
      }),
    [board, t],
  );

  const describedBy = (square: ChessSquare) => {
    const target = targets.get(square);
    const ids = [
      target === "quiet" ? targetId : target === "capture" ? captureId : null,
      square === lastMove?.from || square === lastMove?.to ? lastMoveId : null,
      square === checkSquare ? inCheckId : null,
    ].filter((id) => id !== null);
    return ids.length === 0 ? undefined : ids.join(" ");
  };

  const squareWords = (square: ChessSquare) => {
    const piece = pieceAt(square);
    return { piece: piece === null ? "" : t(`pieces.${piece.type}`), square };
  };
  let hint = "";
  if (selectedFrom !== null) {
    const quiet = [...targets].filter(([, kind]) => kind === "quiet").map(([square]) => square);
    const captures = [...targets]
      .filter(([, kind]) => kind === "capture")
      .map(([square]) => square);
    const list = (squares: readonly string[]) =>
      format.list(squares, { type: "unit", style: "short" });
    const moves = [
      quiet.length > 0 ? t("selection.quiet", { squares: list(quiet) }) : null,
      captures.length > 0 ? t("selection.capture", { squares: list(captures) }) : null,
    ].filter((part) => part !== null);
    hint = t("selection.chosen", { ...squareWords(selectedFrom), moves: list(moves) });
  } else if (noMovesHolds) {
    hint = t("selection.noMoves", squareWords(noMoves.square));
  }

  const checked = checkSquare === null ? null : (pieceAt(checkSquare)?.color ?? null);
  const claimable = !disabled && legalMoves.some(isChessDrawClaim);
  const claimReason = useMemo(
    () => (claimable ? chess.applyMove(state, { type: "claim-draw" }).drawClaim : null),
    [claimable, state],
  );

  const promotionRequest: PromotionRequest | null =
    selection.promotion === null ? null : { ...selection.promotion, colour: toMove };

  const boardPart = (
    // The play screen gives the room (`--board-room`); a laptop never needs more than 37rem.
    <div className="mx-auto w-[min(var(--board-room,100%),37rem)]">
      {/* Describe squares without changing the names they are found by. */}
      <span id={targetId} hidden>
        {t("square.target")}
      </span>
      <span id={captureId} hidden>
        {t("square.capture")}
      </span>
      <span id={lastMoveId} hidden>
        {tPlay("lastMove")}
      </span>
      <span id={inCheckId} hidden>
        {t("square.inCheck")}
      </span>
      {/* Events are handled here for every square, so the squares take plain values only. The
          ring around the board is a shadow outside the grid: it takes no room from the squares. */}
      <div
        ref={gridRef}
        role="grid"
        aria-label={tPlay("board")}
        className="@container flex aspect-square touch-manipulation flex-col shadow-[0_0_0_2px_var(--game-line)]"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onFocus={roving.onFocus}
      >
        {PLACES.map((row) => (
          <div key={row} role="row" className="flex min-h-0 flex-1">
            {PLACES.map((col) => {
              const square = squareAtPlace({ row, col }, bottom);
              const { row: shownRow, col: shownCol } = placeOfSquare(square, bottom);
              return (
                <Square
                  key={square}
                  square={square}
                  light={isLightSquare(square)}
                  pieceType={pieceAt(square)?.type ?? null}
                  pieceColour={pieceAt(square)?.color ?? null}
                  label={labels[indexOfSquare(square)] ?? square}
                  tabStop={square === roving.tabStop}
                  selected={selectedFrom === null ? undefined : square === selectedFrom}
                  target={targets.get(square) ?? null}
                  last={square === lastMove?.from || square === lastMove?.to}
                  inCheck={square === checkSquare}
                  rank={shownCol === 0 ? (square[1] ?? null) : null}
                  file={shownRow === 7 ? (square[0] ?? null) : null}
                  describedBy={describedBy(square)}
                  locked={disabled}
                />
              );
            })}
          </div>
        ))}
      </div>
      <PromotionPicker
        request={promotionRequest}
        onChoose={choosePromotion}
        onCancel={selection.cancelPromotion}
        onClosed={handlePromotionClosed}
      />
    </div>
  );

  const controls = (
    <div className="flex flex-col gap-2 lg:gap-3">
      {/* No room kept on a phone, where height is short: the words (wrapping next to each other)
          push the buttons below down a line while a piece is chosen, never the board. Two reserved
          lines beside the board. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 lg:flex-col lg:items-start lg:gap-1">
        {/* The board's one live region: what the selection is, in words (also on screen). */}
        <p aria-live="polite" className="text-small text-fg-muted lg:min-h-5">
          {hint}
        </p>
        {/* Read out on a shared device, whose turn line never tells the move just played; with
            one player here, the opponent's move is told by the turn line, "check" included. */}
        <p
          aria-live={viewer === null ? "polite" : "off"}
          className="flex flex-wrap items-center gap-x-2 text-small font-semibold lg:min-h-7"
        >
          {checked !== null && result === null && (
            <>
              <Badge variant="danger">{t("check.badge")}</Badge>{" "}
              <span>{t("check.line", { player: playerLabel(seatOfColour(checked)) })}</span>
            </>
          )}
        </p>
      </div>
      {claimReason !== null && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Button
            variant="secondary"
            aria-describedby={claimReasonId}
            onClick={() => {
              onMove({ type: "claim-draw" });
            }}
          >
            {t("claim.button")}
          </Button>
          <span id={claimReasonId} className="text-small text-fg-muted">
            {t(claimReason === "fifty-move-claim" ? "claim.fifty" : "claim.threefold")}
          </span>
        </div>
      )}
      {/* One row on a phone: the sheet, and "Lật bàn" as its icon alone (named all the same). */}
      <div className="flex items-center gap-2 lg:flex-col lg:items-start lg:gap-3">
        <MoveSheet san={state.san} result={result} className="flex-1 max-lg:min-w-0 lg:w-full" />
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
    </div>
  );

  return layout({
    board: boardPart,
    controls,
    seatOrder: bottom === CHESS_COLOR.White ? [1, 0] : [0, 1],
  });
}
