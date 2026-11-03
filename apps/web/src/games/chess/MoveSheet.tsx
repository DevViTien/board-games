"use client";

import type { GameResult } from "@board-games/engine";
import { CHESS_PIECE, type ChessPieceType } from "@board-games/games/chess";
import { cn } from "@board-games/ui";
import { useTranslations } from "next-intl";
import { Fragment, useEffect, useRef } from "react";

import { ChessPiece } from "./pieces";
import { useDescribeSan } from "./san";

const FIGURINE: Readonly<Record<string, ChessPieceType>> = {
  K: CHESS_PIECE.King,
  Q: CHESS_PIECE.Queen,
  R: CHESS_PIECE.Rook,
  B: CHESS_PIECE.Bishop,
  N: CHESS_PIECE.Knight,
};

/**
 * A move in figurine notation: each piece letter of its notation (`N` of `Nf3`, `Q` of `e8=Q`)
 * drawn as the piece, one stroke in the colour of the text for both sides, as a printed chess book
 * does (the column says whose move it is). Decorative: read out by its words beside it.
 */
function Figurine({ san }: { readonly san: string }) {
  // "Nf3" → "", "N", "f3"; "e8=Q+" → "e8=", "Q", "+". The notation is ASCII.
  const parts = san.split(/([KQRBN])/).filter((part) => part !== "");
  return (
    <span aria-hidden className="inline-flex items-center whitespace-nowrap">
      {parts.map((part, index) => {
        const piece = FIGURINE[part];
        // The parts of one move never change place: their index is their identity.
        const key = `${String(index)}${part}`;
        return piece === undefined ? (
          <Fragment key={key}>{part}</Fragment>
        ) : (
          <ChessPiece key={key} type={piece} look="ink" className="size-[1.45em] shrink-0" />
        );
      })}
    </span>
  );
}

interface MoveProps {
  readonly san: string;
  readonly current: boolean;
  readonly words: string;
}

function Move({ san, current, words }: MoveProps) {
  return (
    <span
      aria-current={current ? "true" : undefined}
      className={cn(
        "inline-flex min-h-7 items-center justify-self-start rounded-[6px] px-1.5",
        current && "bg-(--chess-sheet-current) font-bold shadow-[inset_0_-2px_0_var(--fg)]",
      )}
    >
      <Figurine san={san} />
      <span className="sr-only">{words}</span>
    </span>
  );
}

interface MoveSheetProps {
  /** The moves in effect, in algebraic notation (`state.san`). */
  readonly san: readonly string[];
  readonly result: GameResult | null;
  readonly className?: string | undefined;
}

/** The score of a finished game, as written under its moves, and as read out. */
function scoreOf(result: GameResult): {
  readonly shown: string;
  readonly words: "white" | "black" | "draw";
} {
  if (result.kind === "draw") return { shown: "½–½", words: "draw" };
  return result.winners.includes(0)
    ? { shown: "1–0", words: "white" }
    : { shown: "0–1", words: "black" };
}

/**
 * The score sheet (design §8): the moves in effect, numbered in pairs (White, then Black), the
 * newest marked and scrolled to, then the score once the game is over. A scrolling frame named
 * "Sổ ghi" that takes the keyboard focus (to scroll it with the keys); never a live region: the turn
 * line tells moves. A column on a laptop, a one-line strip on a phone.
 */
export function MoveSheet({ san, result, className }: MoveSheetProps) {
  const t = useTranslations("Games.chess.sheet");
  const describe = useDescribeSan();
  const frameRef = useRef<HTMLDivElement>(null);
  const finished = result !== null;

  // To the newest move, by scrolling the frame itself: `scrollIntoView` would scroll the page too,
  // and moves the focus in some browsers. Down on a laptop, right on a phone's strip.
  useEffect(() => {
    const frame = frameRef.current;
    if (frame === null) return;
    frame.scrollTop = frame.scrollHeight;
    frame.scrollLeft = frame.scrollWidth;
  }, [san.length, finished]);

  const rows = Array.from({ length: Math.ceil(san.length / 2) }, (_unused, index) => ({
    number: index + 1,
    white: san[index * 2] ?? "",
    black: san[index * 2 + 1],
  }));
  const last = san.length - 1;
  const score = result === null ? null : scoreOf(result);

  return (
    <div
      className={cn(
        "min-w-0 rounded-card border border-(--chess-sheet-line) bg-(--chess-sheet) px-1.5 py-1 lg:px-3 lg:pt-2.5 lg:pb-2",
        className,
      )}
    >
      <h2 className="mb-1.5 text-caption font-bold text-fg-muted max-lg:sr-only">{t("title")}</h2>
      <div
        ref={frameRef}
        role="region"
        aria-label={t("title")}
        tabIndex={0}
        // Algebraic notation: never machine-translated.
        translate="no"
        className={cn(
          // Relative: the words read out (`sr-only`, positioned) stay inside the scrolling frame
          // instead of stretching the page.
          "focus-ring relative rounded-[6px] text-small",
          "flex h-9 items-center overflow-x-auto overflow-y-hidden",
          "lg:block lg:h-auto lg:max-h-56 lg:overflow-x-hidden lg:overflow-y-auto",
        )}
      >
        {san.length === 0 ? (
          <p className="px-1.5 whitespace-nowrap text-fg-muted">{t("empty")}</p>
        ) : (
          <ol className="flex shrink-0 gap-0.5 lg:block">
            {rows.map(({ number, white, black }) => (
              <li
                key={number}
                className="flex shrink-0 items-center whitespace-nowrap lg:grid lg:min-h-7.5 lg:grid-cols-[2.6rem_1fr_1fr] lg:border-b lg:border-(--chess-sheet-line) lg:last:border-b-0"
              >
                <span className="pl-1.5 text-caption text-fg-muted tabular-nums lg:pl-0">
                  {number}.
                </span>
                <Move san={white} current={number * 2 - 2 === last} words={describe(white)} />
                {black !== undefined && (
                  <Move san={black} current={number * 2 - 1 === last} words={describe(black)} />
                )}
              </li>
            ))}
          </ol>
        )}
        {score !== null && (
          <p className="shrink-0 px-1.5 font-bold whitespace-nowrap lg:mt-1 lg:pl-[2.6rem]">
            <span aria-hidden>{score.shown}</span>
            <span className="sr-only">{t(`score.${score.words}`)}</span>
          </p>
        )}
      </div>
    </div>
  );
}
