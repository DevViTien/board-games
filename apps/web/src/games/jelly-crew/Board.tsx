"use client";

import type { PlayerIndex } from "@board-games/engine";
import {
  isJellyCrewDirection,
  JELLY_CREW_ACTION,
  JELLY_CREW_DIRECTIONS,
  type JellyCrewDirection,
  jellyCrewLayoutOf,
  jellyCrewMolds,
  type JellyCrewMove,
  jellyCrewMove,
  type JellyCrewState,
  jellyCrewStep,
  jellyCrewTryStep,
} from "@board-games/games/jelly-crew";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  cn,
  ConfirmDialog,
  RotateCcwIcon,
} from "@board-games/ui";
import { useTranslations } from "next-intl";
import {
  type ComponentType,
  type PointerEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

import type { BoardProps } from "../types";
import { CrewBoardSvg } from "./board-drawing";
import { BoardDescription } from "./BoardDescription";
import { CELL, Character } from "./pieces";
import {
  isQuietMove,
  useBlockedReason,
  useDirectionWords,
  useJellyCrewMoveLabel,
  useJellyCrewPlayerLabel,
} from "./words";

/** A move slides this long (design §6), within the 300 ms of a game without dice. */
const SLIDE_MS = 120;
/** No cell slid. */
const NOTHING: ReadonlySet<number> = new Set();
/** A swipe on the board counts from this many pixels along its main axis. */
const SWIPE_PX = 32;
/** On one device, the arrows move the second character at first: W A S D always move the first. */
const FIRST_PICK = 1;

const ARROW_DIRECTION: Readonly<Record<string, JellyCrewDirection>> = {
  ArrowUp: "U",
  ArrowDown: "D",
  ArrowLeft: "L",
  ArrowRight: "R",
};

const WASD_DIRECTION: Readonly<Record<string, JellyCrewDirection>> = {
  w: "U",
  s: "D",
  a: "L",
  d: "R",
};

const OFFSET: Readonly<Record<JellyCrewDirection, readonly [number, number]>> = {
  U: [0, -1],
  D: [0, 1],
  L: [-1, 0],
  R: [1, 0],
};

const DIRECTION_ICON: Readonly<Record<JellyCrewDirection, ComponentType<{ className?: string }>>> =
  {
    U: ArrowUpIcon,
    D: ArrowDownIcon,
    L: ArrowLeftIcon,
    R: ArrowRightIcon,
  };

/** Where each direction's button sits in the pad (design §10.5): ↑ above, ← ↓ → below. */
const DIRECTION_PLACE: Readonly<Record<JellyCrewDirection, string>> = {
  U: "col-start-2 row-start-1",
  L: "col-start-1 row-start-2",
  D: "col-start-2 row-start-2",
  R: "col-start-3 row-start-2",
};

/**
 * Whether a key press is for someone else: a field being typed in (the chat) or a radio (its own
 * arrows pick a character), an open dialog or menu, or a handler that took it already.
 */
function belongsElsewhere(event: KeyboardEvent): boolean {
  if (event.defaultPrevented) return true;
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) {
    return true;
  }
  if (document.querySelector("dialog[open]") !== null) return true;
  if (target?.closest('[role="menu"], [role="dialog"]')) return true;
  try {
    return document.querySelector(":popover-open") !== null;
  } catch {
    // A browser (or jsdom) without popovers has none open.
    return false;
  }
}

/** What the board says about a position: a step refused, or the move that led to it. */
interface Said {
  readonly state: JellyCrewState;
  readonly text: string;
}

/**
 * Đội gom thạch's board, played freely (design §10.5): the whole map drawn at once, the character
 * the arrows move ringed (this player's own online; the one picked under "Điều khiển" on one
 * device, W A S D always moving the first), the chips and the notes, and the pad: four directions (a
 * blocked one says why) and "Đặt lại bản đồ" with a question. Keys and swipes do the same.
 */
export function JellyCrewBoard({
  state,
  legalMoves,
  onMove,
  disabled,
  result,
  viewer,
  layout,
  lockedReason,
}: BoardProps<JellyCrewState, JellyCrewMove>) {
  const t = useTranslations("Games.jelly-crew");
  const tOptions = useTranslations("Games.jelly-crew.options.map.values");
  const seatName = useJellyCrewPlayerLabel();
  const blockedReason = useBlockedReason();
  const words = useDirectionWords();
  const moveLabel = useJellyCrewMoveLabel();
  const reducedMotion = usePrefersReducedMotion();
  const grid = jellyCrewLayoutOf(state);
  // Over by the rules, or stopped outside them (someone gave up or left): the session's result.
  const over = state.result !== null || result !== null;
  const online = viewer !== null;
  const lockId = useId();
  const reasonIds = useId();
  const pickName = useId();

  const [picked, setPicked] = useState(FIRST_PICK);
  /** The seat the arrows, the pad and swipes move. */
  const driven: PlayerIndex = viewer ?? Math.min(picked, state.playerCount - 1);
  /** The seat W A S D move: the first on one device, so two can share a keyboard. */
  const wasdSeat: PlayerIndex = viewer ?? 0;
  const [said, setSaid] = useState<Said | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const say = (text: string) => {
    setSaid({ state, text });
  };
  const step = (seat: PlayerIndex, direction: JellyCrewDirection) => {
    if (disabled || over) return;
    const tried = jellyCrewTryStep(state, seat, direction);
    if (!tried.ok) {
      say(
        t("blockedSay", {
          name: seatName(seat),
          direction: words.word(direction),
          reason: blockedReason(tried),
        }),
      );
      return;
    }
    onMove(jellyCrewMove(seat, direction));
  };
  const resetMove = jellyCrewMove(driven, JELLY_CREW_ACTION.Reset);
  const canReset = !disabled && legalMoves.includes(resetMove);
  const pick = (seat: PlayerIndex) => {
    if (online || seat < 0 || seat >= state.playerCount) return;
    setPicked(seat);
    say(t("pickSay", { name: seatName(seat) }));
  };

  // Keys (design §10.5): the arrows move the character driven, W A S D the first one on a shared
  // device (this player's own online), 1–4 pick a character on one device. A held key does not
  // repeat. Never while typing or on a radio, nor with a dialog or menu open.
  const keys = useRef({ step, pick, driven, wasdSeat });
  useLayoutEffect(() => {
    keys.current = { step, pick, driven, wasdSeat };
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (belongsElsewhere(event) || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.shiftKey || event.repeat) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const arrow = ARROW_DIRECTION[key];
      const wasd = WASD_DIRECTION[key];
      if (arrow !== undefined) {
        event.preventDefault();
        keys.current.step(keys.current.driven, arrow);
      } else if (wasd !== undefined) {
        event.preventDefault();
        keys.current.step(keys.current.wasdSeat, wasd);
      } else if (/^[1-4]$/u.test(key)) {
        keys.current.pick(Number(key) - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Swipes on the board: the main axis from 32 px, for the character driven.
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null);
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    swipe.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (start?.id !== event.pointerId || disabled) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
    if (Math.abs(dx) > Math.abs(dy)) step(driven, dx > 0 ? "R" : "L");
    else step(driven, dy > 0 ? "D" : "U");
  };

  // One moment a move (design §6): the character and what it pushed slide in from where they were;
  // and what it did is said. Worked out while rendering, from the state shown before (adjusted
  // during render, not in a ref). Another player's step that only walked is not said: two people
  // walking at once would drown everything else (spec "Dùng được bằng trình đọc màn hình").
  const [shown, setShown] = useState<{
    state: JellyCrewState;
    slide: Slide | null;
    spoken: string;
  }>({ state, slide: null, spoken: "" });
  if (shown.state !== state) {
    const { last } = state;
    const moved = last !== null && shown.state.moves + 1 === state.moves;
    const own = !online || last?.seat === viewer;
    setShown({
      state,
      slide: slideBetween(shown.state, state, grid),
      spoken:
        moved && (own || !isQuietMove(state))
          ? moveLabel(jellyCrewMove(last.seat, last.action), state)
          : "",
    });
  }
  const slide = shown.state === state ? shown.slide : null;
  const spoken = shown.state === state ? shown.spoken : "";
  const svgRef = useRef<SVGSVGElement>(null);
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (slide === null || svg === null || reducedMotion) return;
    const [dx, dy] = OFFSET[slide.direction];
    const from = `translate(${-dx * CELL}px, ${-dy * CELL}px)`;
    for (const element of svg.querySelectorAll<SVGGraphicsElement>("[data-slide]")) {
      if (typeof element.animate !== "function") return;
      element.animate([{ transform: from }, { transform: "none" }], {
        duration: SLIDE_MS,
        easing: "cubic-bezier(0.2, 0.8, 0.3, 1)",
      });
    }
  }, [slide, reducedMotion]);

  const molds = jellyCrewMolds(grid, state.board);
  const resetBy = state.last?.action === JELLY_CREW_ACTION.Reset ? seatName(state.last.seat) : null;
  const sayNow = said?.state === state ? said.text : spoken;
  const refused = said?.state === state;

  const chip = "rounded-full border px-2.5 py-0.5 text-caption font-semibold tabular-nums";
  const notes = (
    <div className="flex min-h-9 flex-col items-center gap-1 text-small lg:items-start short-landscape:items-start">
      <div className="flex flex-wrap justify-center gap-1.5 lg:justify-start short-landscape:justify-start">
        <span data-chip="steps" className={cn(chip, "border-border bg-surface")}>
          {t("chips.steps", { count: state.steps })}
        </span>
        <span
          data-chip="molds"
          className={cn(
            chip,
            molds.fitted === molds.total
              ? "border-success bg-success-soft text-success-ink"
              : "border-border bg-surface",
          )}
        >
          <span aria-hidden>{t("chips.molds", { fitted: molds.fitted, total: molds.total })}</span>
          <span className="sr-only">
            {t("chips.moldsLabel", { fitted: molds.fitted, total: molds.total })}
          </span>
        </span>
      </div>
      {resetBy !== null && !over && (
        <p className="text-fg-muted">{t("resetNote", { name: resetBy })}</p>
      )}
      {/* Not a status region: the play screen's turn line is the only one (spec). A refused step is
          shown; what a move did is for screen readers only, the board shows it. */}
      <p
        aria-live="polite"
        className={cn("font-semibold text-danger-ink", (!refused || sayNow === "") && "sr-only")}
      >
        {sayNow}
      </p>
    </div>
  );

  const locked = disabled && !over;
  const padButton =
    "focus-ring inline-flex h-[3.25rem] min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-control border-[1.5px] border-border-control bg-surface px-1.5 text-center text-small leading-tight font-semibold text-fg aria-disabled:cursor-not-allowed aria-disabled:border-dashed aria-disabled:text-fg-muted";
  const reasonOf = (direction: JellyCrewDirection): string | null => {
    if (locked) return null;
    const tried = jellyCrewTryStep(state, driven, direction);
    return tried.ok ? null : blockedReason(tried);
  };
  const resetReason = canReset || locked ? null : t("resetSame");
  const describedBy = (reason: string | null, id: string) =>
    locked ? lockId : reason === null ? undefined : id;

  const controls = over ? null : (
    <div role="group" aria-label={t("controls")} className="flex flex-col gap-3">
      {!online && (
        <fieldset className="flex min-w-0 flex-col items-center gap-1.5 lg:items-start short-landscape:items-start">
          <legend className="mb-1.5 w-full text-center text-caption font-semibold text-fg-muted lg:text-left short-landscape:text-left">
            {t("pick")}
          </legend>
          <div className="flex flex-wrap justify-center gap-1.5 lg:justify-start short-landscape:justify-start">
            {state.board.chars.map((_, seat) => (
              <label
                key={seat}
                className="focus-ring-within inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-border-control bg-surface pr-3 pl-1 text-small font-bold text-fg has-checked:border-fg has-checked:shadow-[inset_0_0_0_1.5px_var(--color-fg)]"
              >
                <input
                  type="radio"
                  name={pickName}
                  value={seat}
                  checked={seat === driven}
                  onChange={() => {
                    setPicked(seat);
                  }}
                  className="sr-only"
                />
                <svg viewBox="0 0 56 56" aria-hidden className="size-8 shrink-0">
                  <Character cx={28} cy={28} seat={seat} now={false} />
                </svg>
                {seatName(seat)}
                <span aria-hidden className="text-caption font-semibold text-fg-muted">
                  {seat + 1}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {/* The pad: ↑ above, ← ↓ → below. */}
      <div
        role="group"
        aria-label={t("pad", { name: seatName(driven) })}
        className="mx-auto grid grid-cols-[3.25rem_3.25rem_3.25rem] grid-rows-[3.25rem_3.25rem] gap-2 lg:mx-0 short-landscape:mx-0"
      >
        {JELLY_CREW_DIRECTIONS.map((direction) => {
          const Icon = DIRECTION_ICON[direction];
          const reason = reasonOf(direction);
          return (
            <button
              key={direction}
              type="button"
              aria-label={words.button(direction)}
              aria-disabled={locked || reason !== null}
              aria-describedby={describedBy(reason, `${reasonIds}${direction}`)}
              data-direction={direction}
              className={cn(padButton, DIRECTION_PLACE[direction])}
              onClick={() => {
                step(driven, direction);
              }}
            >
              <Icon aria-hidden className="size-6" />
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-2 lg:justify-start short-landscape:justify-start">
        <button
          type="button"
          className={cn(padButton, "h-11 px-3")}
          aria-disabled={locked || resetReason !== null}
          aria-describedby={describedBy(resetReason, `${reasonIds}reset`)}
          onClick={() => {
            if (canReset) setConfirmingReset(true);
          }}
        >
          <RotateCcwIcon aria-hidden className="size-4 shrink-0" />
          {t("reset")}
        </button>
      </div>
      <p className="text-caption text-fg-muted max-lg:hidden">
        {online ? t("keysOnline") : t("keysLocal", { count: state.playerCount })}
      </p>
      <span id={lockId} className="sr-only">
        {locked ? (lockedReason ?? "") : ""}
      </span>
      {JELLY_CREW_DIRECTIONS.map((direction) => (
        <span key={direction} id={`${reasonIds}${direction}`} className="sr-only">
          {reasonOf(direction)}
        </span>
      ))}
      <span id={`${reasonIds}reset`} className="sr-only">
        {resetReason}
      </span>
      <ConfirmDialog
        open={confirmingReset}
        title={t("resetDialog.title")}
        description={t("resetDialog.body")}
        cancelLabel={t("resetDialog.keep")}
        confirmLabel={t("resetDialog.confirm")}
        onCancel={() => {
          setConfirmingReset(false);
        }}
        onConfirm={() => {
          setConfirmingReset(false);
          if (canReset) onMove(resetMove);
        }}
      />
    </div>
  );

  const board = (
    <div
      className="mx-auto w-[min(var(--board-room,100%),var(--crew-board-max))]"
      style={{ "--crew-board-max": `${String(grid.width * CELL)}px` } as Record<string, string>}
    >
      <div
        data-driven-seat={over ? undefined : driven + 1}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipe.current = null;
        }}
        style={{ touchAction: disabled || over ? "pan-y" : "none" }}
        className="rounded-card border-[3px] border-transparent bg-game-page p-1"
      >
        <CrewBoardSvg
          grid={grid}
          board={state.board}
          now={over ? null : driven}
          slid={slide?.cells ?? NOTHING}
          moverSlid={slide?.seat ?? null}
          svgRef={svgRef}
        />
      </div>
      <BoardDescription
        state={state}
        label={t("boardLabel", {
          map: tOptions(state.map),
          width: grid.width,
          height: grid.height,
        })}
      />
    </div>
  );

  return layout({ board, notes, controls });
}

/** A step to show: who took it, towards where, and the cells of jelly it pushed, where they are now. */
interface Slide {
  readonly seat: number;
  readonly direction: JellyCrewDirection;
  readonly cells: ReadonlySet<number>;
}

/**
 * The step that led from `before` to `after`, when it is one (a reset, an undo or a new game slides
 * nothing): played again from `before`, so what it pushed is known exactly.
 */
function slideBetween(
  before: JellyCrewState,
  after: JellyCrewState,
  grid: ReturnType<typeof jellyCrewLayoutOf>,
): Slide | null {
  const last = after.last;
  if (last === null || !isJellyCrewDirection(last.action)) return null;
  if (before.moves + 1 !== after.moves || before.steps + 1 !== after.steps) return null;
  const replayed = jellyCrewStep(grid, before.board, last.seat, last.action);
  if (!replayed.ok) return null;
  const offset = stepOffset(last.action, grid.width);
  return {
    seat: last.seat,
    direction: last.action,
    cells: new Set(
      replayed.pushed.flatMap((index) =>
        (before.board.pieces[index]?.cells ?? []).map((cell) => cell + offset),
      ),
    ),
  };
}

/** How far a cell index moves one step towards `direction` on a board `width` wide. */
function stepOffset(direction: JellyCrewDirection, width: number): number {
  const [dx, dy] = OFFSET[direction];
  return dy * width + dx;
}
