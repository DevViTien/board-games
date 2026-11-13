"use client";

import type { PlayerIndex } from "@board-games/engine";
import {
  closesTriangle,
  type ForbiddenTriangleMove,
  type ForbiddenTriangleState,
  lineOf,
  pairOf,
} from "@board-games/games/forbidden-triangle";
import { cn, ConfirmDialog } from "@board-games/ui";
import { useFormatter, useTranslations } from "next-intl";
import { type KeyboardEvent, useId, useRef, useState } from "react";

import type { BoardProps } from "../types";
import { guestName, seatOf, TABLE_RADIUS } from "./board-layout";
import { guestsName } from "./words";

/** The warning sign, as text (U+FE0E): never a yellow emoji that ignores the danger colour. */
const DANGER_SIGN = "\u26A0\uFE0E";

/** What a guest is, once another one is chosen first: the line between them, and its fate. */
type Target =
  | { readonly kind: "chosen" }
  | { readonly kind: "drawn"; readonly owner: PlayerIndex | null }
  | { readonly kind: "safe"; readonly line: number }
  | { readonly kind: "danger"; readonly line: number; readonly third: number };

interface Confirming {
  readonly line: number;
  readonly pair: readonly [number, number];
  readonly third: number;
}

/**
 * The table (design §4): guests on a circle as buttons, the lines between them under them. A line
 * is drawn by choosing one guest, then another; a line that would close the player's own triangle
 * is marked ⚠ on the second guest and asks first. Arrow keys go round the table (one Tab stop),
 * Enter or Space chooses, Esc lets go of the first guest.
 */
export function ForbiddenTriangleBoard({
  state,
  legalMoves,
  onMove,
  disabled,
  lastEntry,
  layout,
}: BoardProps<ForbiddenTriangleState, ForbiddenTriangleMove>) {
  const t = useTranslations("Games.forbidden-triangle.board");
  const format = useFormatter();
  const descriptionId = useId();
  const guestButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [focused, setFocused] = useState(0);
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  // A new position (a move here or elsewhere, undo, a new game) or a locked board lets go of the
  // first guest and of the question. Adjusted during render.
  const [shownLines, setShownLines] = useState(state.lines);
  if (shownLines !== state.lines) {
    setShownLines(state.lines);
    setChosen(null);
    setConfirming(null);
  }
  if (disabled && (chosen !== null || confirming !== null)) {
    setChosen(null);
    setConfirming(null);
  }

  const { guests } = state;
  // The guest of the board's one Tab stop; the first on a smaller table than the last one focused.
  const tabStop = focused < guests ? focused : 0;
  const over = state.lost !== null || state.lines.every((owner) => owner !== null);
  const player = state.toMove;
  const colour = (owner: PlayerIndex) => t(owner === 0 ? "colour.red" : "colour.blue");
  const legal = new Set(legalMoves.map(({ line }) => line));
  const everyone = Array.from({ length: guests }, (_, guest) => guest);
  const canStart = (guest: number) =>
    !disabled && everyone.some((other) => legal.has(lineOf(guests, guest, other)));

  function targetOf(guest: number): Target | null {
    if (chosen === null) return null;
    if (guest === chosen) return { kind: "chosen" };
    const line = lineOf(guests, chosen, guest);
    if (!legal.has(line)) return { kind: "drawn", owner: state.lines[line] ?? null };
    const third = closesTriangle(state, player, line);
    return third === null ? { kind: "safe", line } : { kind: "danger", line, third };
  }

  function choose(guest: number): void {
    if (disabled) return;
    if (chosen === null) {
      if (canStart(guest)) setChosen(guest);
      return;
    }
    const target = targetOf(guest);
    if (target === null || target.kind === "drawn") return;
    if (target.kind === "chosen") {
      setChosen(null);
      return;
    }
    if (target.kind === "danger") {
      setConfirming({ line: target.line, pair: [chosen, guest], third: target.third });
      return;
    }
    setChosen(null);
    onMove({ line: target.line });
  }

  function moveFocus(to: number): void {
    const guest = (to + guests) % guests;
    setFocused(guest);
    guestButtons.current[guest]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    const keys: Readonly<Record<string, () => void>> = {
      ArrowRight: () => {
        moveFocus(focused + 1);
      },
      ArrowDown: () => {
        moveFocus(focused + 1);
      },
      ArrowLeft: () => {
        moveFocus(focused - 1);
      },
      ArrowUp: () => {
        moveFocus(focused - 1);
      },
      Home: () => {
        moveFocus(0);
      },
      End: () => {
        moveFocus(guests - 1);
      },
      Escape: () => {
        setChosen(null);
      },
    };
    const action = keys[event.key];
    if (action === undefined) return;
    // Esc with nothing chosen is left to the page (a dialog, the browser).
    if (event.key === "Escape" && chosen === null) return;
    event.preventDefault();
    action();
  }

  /** "dây đỏ với B, C; dây xanh với D", or "chưa có dây". */
  function linesOf(guest: number): string {
    const withColour = (owner: PlayerIndex) =>
      everyone.filter(
        (other) => other !== guest && state.lines[lineOf(guests, guest, other)] === owner,
      );
    const red = withColour(0).map(guestName);
    const blue = withColour(1).map(guestName);
    if (red.length > 0 && blue.length > 0) {
      return t("guestBoth", { red: format.list(red), blue: format.list(blue) });
    }
    if (red.length > 0) return t("guestLines", { colour: colour(0), guests: format.list(red) });
    if (blue.length > 0) return t("guestLines", { colour: colour(1), guests: format.list(blue) });
    return t("guestNoLines");
  }

  function nameOf(guest: number): string {
    const name = guestName(guest);
    const target = targetOf(guest);
    if (target === null) return t("guest", { name, lines: linesOf(guest) });
    switch (target.kind) {
      case "chosen":
        return t("guestChosen", { name, lines: linesOf(guest) });
      case "drawn":
        return target.owner === null
          ? t("guest", { name, lines: linesOf(guest) })
          : t("targetDrawn", {
              name,
              colour: colour(target.owner),
              other: guestName(chosen ?? 0),
            });
      case "safe":
        return t("targetSafe", { name, line: guestsName(pairOf(guests, target.line)) });
      case "danger": {
        const [a, b] = pairOf(guests, target.line);
        return t("targetDanger", {
          name,
          line: guestsName([a, b]),
          colour: colour(player),
          triangle: guestsName([a, b, target.third].toSorted((x, y) => x - y)),
        });
      }
    }
  }

  const lastLine = lastEntry?.move.line ?? null;
  const drawn = ([0, 1] as const).map((owner) =>
    state.lines.flatMap((line, index) => (line === owner ? [index] : [])),
  );
  const description = [
    ...([0, 1] as const).map((owner) =>
      t("description", {
        colour: colour(owner),
        lines:
          (drawn[owner] ?? []).length === 0
            ? t("descriptionNone")
            : format.list((drawn[owner] ?? []).map((line) => guestsName(pairOf(guests, line)))),
      }),
    ),
    lastLine === null ? null : t("descriptionLast", { line: guestsName(pairOf(guests, lastLine)) }),
  ]
    .filter((part) => part !== null)
    .join(" ");
  const anyDanger = chosen !== null && everyone.some((guest) => targetOf(guest)?.kind === "danger");

  const board = (
    <div className="@container mx-auto w-[min(var(--board-room,100%),30rem)]">
      <div
        role="group"
        aria-label={t("label", { guests })}
        aria-describedby={descriptionId}
        data-forbidden-board=""
        onKeyDown={onKeyDown}
        className="relative aspect-square w-full touch-manipulation rounded-[6cqw] bg-game-board"
      >
        <p id={descriptionId} hidden>
          {description}
        </p>
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          className="pointer-events-none absolute inset-0 size-full"
        >
          {/* The table's edge: in the colour and stroke of the player to move while the game is
              on (whose turn it is, on the board itself), faint once it is over. */}
          {!over ? (
            <circle
              data-turn={player === 0 ? "red" : "blue"}
              cx="50"
              cy="50"
              r={TABLE_RADIUS}
              fill="none"
              strokeWidth="0.8"
              strokeDasharray={player === 0 ? undefined : "3 2.2"}
              className={player === 0 ? "stroke-game-mark-1" : "stroke-game-mark-2"}
            />
          ) : (
            <circle
              cx="50"
              cy="50"
              r={TABLE_RADIUS}
              fill="none"
              strokeWidth="0.4"
              className="stroke-game-line opacity-40"
            />
          )}
          {state.lost !== null && (
            <polygon
              data-lost-triangle={guestsName(state.lost.triangle)}
              points={state.lost.triangle
                .map((guest) => {
                  const { x, y } = seatOf(guests, guest);
                  return `${String(x)},${String(y)}`;
                })
                .join(" ")}
              strokeWidth="4"
              strokeLinejoin="round"
              className={cn(
                "stroke-game-win",
                state.lost.player === 0 ? "fill-game-mark-1/30" : "fill-game-mark-2/30",
              )}
            />
          )}
          {lastLine !== null && (
            <Line
              guests={guests}
              line={lastLine}
              strokeWidth={3.4}
              className="stroke-game-last-move"
            />
          )}
          {state.lines.map((owner, line) =>
            owner === null ? (
              <Line
                key={line}
                guests={guests}
                line={line}
                strokeWidth={0.5}
                dash="0.4 1.4"
                className="stroke-game-line"
                data={{ line, owner: "none" }}
              />
            ) : (
              <Line
                key={line}
                guests={guests}
                line={line}
                strokeWidth={1.6}
                dash={owner === 0 ? undefined : "3 2.2"}
                className={owner === 0 ? "stroke-game-mark-1" : "stroke-game-mark-2"}
                data={{ line, owner: owner === 0 ? "red" : "blue" }}
              />
            ),
          )}
          {/* What the first guest chosen could join: a faint line in the player's colour, or the
              danger colour where it would close their own triangle. */}
          {everyone.map((guest) => {
            const target = targetOf(guest);
            if (target === null || (target.kind !== "safe" && target.kind !== "danger"))
              return null;
            return (
              <Line
                key={`preview-${String(guest)}`}
                guests={guests}
                line={target.line}
                strokeWidth={1.2}
                dash="0.01 2.2"
                className={cn(
                  target.kind === "danger"
                    ? "stroke-(--forbidden-triangle-danger)"
                    : player === 0
                      ? "stroke-game-mark-1"
                      : "stroke-game-mark-2",
                )}
              />
            );
          })}
        </svg>
        {everyone.map((guest) => {
          const { x, y } = seatOf(guests, guest);
          const target = targetOf(guest);
          const pressable =
            !disabled &&
            (target === null
              ? canStart(guest)
              : target.kind === "chosen" || target.kind === "safe" || target.kind === "danger");
          return (
            <button
              key={guest}
              ref={(button) => {
                guestButtons.current[guest] = button;
              }}
              type="button"
              data-guest={guestName(guest)}
              tabIndex={guest === tabStop ? 0 : -1}
              aria-disabled={!pressable}
              aria-pressed={target?.kind === "chosen"}
              aria-label={nameOf(guest)}
              onFocus={() => {
                setFocused(guest);
              }}
              onClick={() => {
                choose(guest);
              }}
              style={{ left: `${String(x)}%`, top: `${String(y)}%` }}
              className={cn(
                "focus-ring absolute flex size-[15cqw] min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[0.6cqw] border-(--forbidden-triangle-guest-edge) bg-(--forbidden-triangle-guest) text-[6.5cqw] font-bold text-(--forbidden-triangle-guest-ink) transition-colors motion-reduce:transition-none",
                pressable ? "cursor-pointer" : "cursor-default",
                target?.kind === "chosen" && "border-[1.2cqw] border-game-highlight",
                target?.kind === "safe" &&
                  (player === 0 ? "border-game-mark-1" : "border-game-mark-2"),
                target?.kind === "danger" && "border-dashed border-(--forbidden-triangle-danger)",
                target?.kind === "drawn" && "border-dotted border-game-line text-fg-muted",
              )}
            >
              {guestName(guest)}
              {target?.kind === "danger" && (
                <span
                  aria-hidden
                  className="absolute -top-[1.5cqw] -right-[1.5cqw] flex size-[6cqw] min-h-5 min-w-5 items-center justify-center rounded-full bg-(--forbidden-triangle-guest) text-[4cqw] text-(--forbidden-triangle-danger) ring-2 ring-(--forbidden-triangle-danger)"
                >
                  {DANGER_SIGN}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <ConfirmDialog
        open={confirming !== null}
        title={t("confirm.title", {
          line: confirming === null ? "" : guestsName(confirming.pair),
        })}
        description={t("confirm.description", {
          triangle:
            confirming === null
              ? ""
              : guestsName([...confirming.pair, confirming.third].toSorted((a, b) => a - b)),
        })}
        confirmLabel={t("confirm.confirm")}
        cancelLabel={t("confirm.cancel")}
        onConfirm={() => {
          if (confirming === null) return;
          const { line } = confirming;
          setConfirming(null);
          setChosen(null);
          onMove({ line });
        }}
        onCancel={() => {
          setConfirming(null);
        }}
      />
    </div>
  );

  // Two lines high whatever it says, so the buttons below never jump.
  const notes = (
    <p className="min-h-[2lh] text-center text-small text-fg-muted lg:text-left">
      {disabled
        ? null
        : chosen === null
          ? t("hintFirst")
          : t(anyDanger ? "hintSecondDanger" : "hintSecond", { name: guestName(chosen) })}
    </p>
  );

  return layout({ board, controls: null, notes });
}

/** The line between two guests, in the board's hundredths. */
function Line({
  guests,
  line,
  strokeWidth,
  dash,
  className,
  data,
}: {
  readonly guests: number;
  readonly line: number;
  readonly strokeWidth: number;
  readonly dash?: string | undefined;
  readonly className: string;
  readonly data?: { readonly line: number; readonly owner: string };
}) {
  const [a, b] = pairOf(guests, line);
  const from = seatOf(guests, a);
  const to = seatOf(guests, b);
  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      strokeWidth={strokeWidth}
      strokeDasharray={dash}
      strokeLinecap="round"
      className={className}
      data-line={data === undefined ? undefined : guestsName([a, b])}
      data-owner={data?.owner}
    />
  );
}
