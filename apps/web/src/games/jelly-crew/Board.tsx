"use client";

import {
  isJellyCrewDirection,
  JELLY_CREW_BACKS,
  JELLY_CREW_DIRECTIONS,
  JELLY_CREW_STEPS,
  type JellyCrewDirection,
  jellyCrewLayoutOf,
  jellyCrewMolds,
  type JellyCrewMove,
  jellyCrewRound,
  type JellyCrewState,
  jellyCrewStep,
  jellyCrewTryStep,
} from "@board-games/games/jelly-crew";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  Button,
  CheckIcon,
  cn,
  ConfirmDialog,
  RotateCcwIcon,
  Undo2Icon,
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
import { CELL } from "./pieces";
import {
  holdingOf,
  useBlockedReason,
  useDirectionWords,
  useGroupSign,
  useJellyCrewPlayerLabel,
} from "./words";

/** A move slides this long (design §6), within the 300 ms of a game without dice. */
const SLIDE_MS = 120;
/** A device holding a plate ends its turn after this beat, so everyone sees whose turn it was. */
const HOLD_END_MS = 600;
/** No cell slid. */
const NOTHING: ReadonlySet<number> = new Set();
/** A swipe on the board counts from this many pixels along its main axis. */
const SWIPE_PX = 32;

const KEY_DIRECTION: Readonly<Record<string, JellyCrewDirection>> = {
  ArrowUp: "U",
  ArrowDown: "D",
  ArrowLeft: "L",
  ArrowRight: "R",
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

/** Where each direction's button sits in the pad (design §6): ↑ above, ← ↓ → below. */
const DIRECTION_PLACE: Readonly<Record<JellyCrewDirection, string>> = {
  U: "col-start-2 row-start-1",
  L: "col-start-1 row-start-2",
  D: "col-start-2 row-start-2",
  R: "col-start-3 row-start-2",
};

/** Tailwind sees whole class names only: the frame in each seat's colour. */
const SEAT_BORDER = [
  "border-(--jelly-crew-seat-1)",
  "border-(--jelly-crew-seat-2)",
  "border-(--jelly-crew-seat-3)",
  "border-(--jelly-crew-seat-4)",
] as const;

/**
 * Whether a key press is for someone else: a field being typed in (the chat), an open dialog or
 * menu, or a handler that took it already.
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

/** Enter ends the turn only away from anything Enter already presses. */
function onPressable(event: KeyboardEvent): boolean {
  const target = event.target instanceof Element ? event.target : null;
  return target?.closest('button, a, [role="button"], summary') != null;
}

/**
 * Something the board says: about this very position (a step refused), shown until the game moves
 * on; or that a held plate ended a turn, shown through the turn it began (`turnsDone`).
 */
type Said =
  | { readonly state: JellyCrewState; readonly text: string }
  | { readonly turnsDone: number; readonly text: string };

/**
 * Đội gom thạch's board (design §6): the whole map drawn at once, the turn on the board (a ringed
 * character, the frame in its seat's colour, the latest turn's trail), the chips and the notes, and
 * the pad: four directions (a blocked one says why), "Xong lượt", "Lùi bước" online, "Đặt lại bản
 * đồ" with a question, and "Giữ nút" for a character on a plate. Keys and swipes do the same.
 */
export function JellyCrewBoard({
  state,
  legalMoves,
  onMove,
  disabled,
  result,
  lastEntry,
  viewer,
  layout,
  lockedReason,
}: BoardProps<JellyCrewState, JellyCrewMove>) {
  const t = useTranslations("Games.jelly-crew");
  const tOptions = useTranslations("Games.jelly-crew.options.map.values");
  const seatName = useJellyCrewPlayerLabel();
  const sign = useGroupSign();
  const blockedReason = useBlockedReason();
  const words = useDirectionWords();
  const reducedMotion = usePrefersReducedMotion();
  const grid = jellyCrewLayoutOf(state);
  // Over by the rules, or stopped outside them (someone gave up or left): the session's result.
  const over = state.result !== null || result !== null;
  const online = viewer !== null;
  const lockId = useId();
  const reasonIds = useId();

  // Seats this device holds a plate for. Only while their character stands on a plate: stepping
  // off, or any move of theirs here, lets go (design §6). Never part of the rules or the record.
  const [holds, setHolds] = useState<ReadonlySet<number>>(new Set());
  const holding = (seat: number) => holds.has(seat) && holdingOf(state, seat) !== undefined;
  const [said, setSaid] = useState<Said | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  // The seat whose plate the toggle is for: online the player here, on one device the one to move.
  const holderSeat = online ? viewer : state.turn;
  const holderPlate = over ? undefined : holdingOf(state, holderSeat);

  const legal = (move: JellyCrewMove) => !disabled && legalMoves.includes(move);
  const letGo = (seat: number) => {
    setHolds((current) => {
      if (!current.has(seat)) return current;
      const next = new Set(current);
      next.delete(seat);
      return next;
    });
  };
  const say = (text: string) => {
    setSaid({ state, text });
  };

  const step = (direction: JellyCrewDirection) => {
    if (disabled || over) return;
    const tried = jellyCrewTryStep(state, direction);
    if (!tried.ok) {
      say(t("blockedSay", { direction: words.word(direction), reason: blockedReason(tried) }));
      return;
    }
    letGo(state.turn);
    onMove(direction);
  };
  const end = () => {
    if (legal("end")) onMove("end");
  };
  const back = () => {
    if (!online || !legal("back")) return;
    letGo(state.turn);
    onMove("back");
  };
  const askReset = () => {
    if (legal("reset")) setConfirmingReset(true);
  };

  // A held plate ends its seat's turn by itself, once the turn is theirs here and untouched.
  // Never when every seat holds: nobody would ever play again, and the rounds would run out alone.
  const everyoneHolds = state.board.chars.every((_, seat) => holding(seat));
  const autoEnd =
    !disabled &&
    !over &&
    !everyoneHolds &&
    state.taken === 0 &&
    holding(state.turn) &&
    legalMoves.includes("end");
  const latestMove = useRef(onMove);
  useLayoutEffect(() => {
    latestMove.current = onMove;
  });
  useEffect(() => {
    if (!autoEnd) return undefined;
    const timer = setTimeout(() => {
      setSaid({
        turnsDone: state.turnsDone + 1,
        text: t("holdSay", { name: seatName(state.turn) }),
      });
      latestMove.current("end");
    }, HOLD_END_MS);
    return () => {
      clearTimeout(timer);
    };
    // `t` and `seatName` are new functions every render; the words they give are not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEnd, state]);

  // Keys (design §6): arrows and W A S D step (a held key does not repeat), Enter ends the turn away
  // from buttons and links, Z steps back online. Never while typing, nor with a dialog or menu open.
  const keys = useRef({ step, end, back });
  useLayoutEffect(() => {
    keys.current = { step, end, back };
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (belongsElsewhere(event) || event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const direction = KEY_DIRECTION[key];
      if (direction !== undefined) {
        if (event.shiftKey) return;
        event.preventDefault();
        if (!event.repeat) keys.current.step(direction);
      } else if (key === "Enter" && !event.repeat && !onPressable(event)) {
        event.preventDefault();
        keys.current.end();
      } else if (key === "z" && !event.repeat && !event.shiftKey) {
        keys.current.back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Swipes on the board: the main axis from 32 px.
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
    if (Math.abs(dx) > Math.abs(dy)) step(dx > 0 ? "R" : "L");
    else step(dy > 0 ? "D" : "U");
  };

  // One moment a step (design §6): the character and what it pushed slide in from where they were.
  // Worked out while rendering, from the state shown before (adjusted during render, not in a ref).
  const [shown, setShown] = useState<{ state: JellyCrewState; slide: Slide | null }>({
    state,
    slide: null,
  });
  if (shown.state !== state) {
    setShown({ state, slide: slideBetween(shown.state, state, lastEntry?.move, grid) });
  }
  const slide = shown.state === state ? shown.slide : null;
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
  const stepsLeft = JELLY_CREW_STEPS - state.taken;
  const turnName = seatName(state.turn);
  const lastRounds = !over && jellyCrewRound(state) >= grid.rounds - 1;
  const resetBy = state.last?.move === "reset" ? seatName(state.last.seat) : null;
  const sayNow =
    said === null
      ? ""
      : "state" in said
        ? said.state === state
          ? said.text
          : ""
        : said.turnsDone === state.turnsDone
          ? said.text
          : "";

  const chip = "rounded-full border px-2.5 py-0.5 text-caption font-semibold tabular-nums";
  const notes = (
    <div className="flex min-h-9 flex-col items-center gap-1 text-small lg:items-start short-landscape:items-start">
      <div className="flex flex-wrap justify-center gap-1.5 lg:justify-start short-landscape:justify-start">
        {!over && (
          <span
            data-chip="turn"
            className={cn(
              chip,
              stepsLeft === 0
                ? "border-warning bg-warning-soft text-warning-ink"
                : "border-border bg-surface",
            )}
          >
            {stepsLeft === 0
              ? t("chips.turnDone", { name: turnName })
              : t("chips.turn", { name: turnName, count: stepsLeft })}
          </span>
        )}
        <span
          data-chip="round"
          className={cn(
            chip,
            lastRounds
              ? "border-warning bg-warning-soft text-warning-ink"
              : "border-border bg-surface",
          )}
        >
          {t("chips.round", { round: jellyCrewRound(state), rounds: grid.rounds })}
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
      {holding(holderSeat) && !over && <p className="text-fg-muted">{t("holdOn")}</p>}
      {/* Not a status region: the play screen's turn line is the only one (spec). */}
      <p
        aria-live="polite"
        className={cn("font-semibold text-danger-ink", sayNow === "" && "sr-only")}
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
    const tried = jellyCrewTryStep(state, direction);
    return tried.ok ? null : blockedReason(tried);
  };
  const backReason =
    state.taken === 0 ? t("noBack") : state.backs >= JELLY_CREW_BACKS ? t("noBacksLeft") : null;
  const resetReason = legalMoves.includes("reset") || locked ? null : t("resetSame");
  const describedBy = (reason: string | null, id: string) =>
    locked ? lockId : reason === null ? undefined : id;

  const controls = over ? null : (
    <div role="group" aria-label={t("controls")} className="flex flex-col gap-2">
      {/* The pad: ↑ above, ← ↓ → below, and the turn's end beside them, as tall as both rows. */}
      <div className="mx-auto grid w-full max-w-[22rem] grid-cols-[3.25rem_3.25rem_3.25rem_minmax(0,1fr)] grid-rows-[3.25rem_3.25rem] gap-2 lg:mx-0 short-landscape:mx-0">
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
                step(direction);
              }}
            >
              <Icon aria-hidden className="size-6" />
            </button>
          );
        })}
        <Button
          className="col-start-4 row-span-2 row-start-1 h-full min-w-0 flex-col gap-1 px-2 text-body"
          aria-disabled={locked}
          aria-describedby={locked ? lockId : undefined}
          onClick={end}
        >
          <CheckIcon aria-hidden className="size-5 shrink-0" />
          {t("end")}
        </Button>
      </div>
      {/* The other things a turn may do, in words, wrapping on a narrow phone. */}
      <div className="flex flex-wrap justify-center gap-2 lg:justify-start short-landscape:justify-start">
        {online && (
          <button
            type="button"
            className={cn(padButton, "h-11 px-3")}
            aria-disabled={locked || backReason !== null}
            aria-describedby={describedBy(backReason, `${reasonIds}back`)}
            onClick={back}
          >
            <Undo2Icon aria-hidden className="size-4 shrink-0" />
            {t("back")}
          </button>
        )}
        <button
          type="button"
          className={cn(padButton, "h-11 px-3")}
          aria-disabled={locked || resetReason !== null}
          aria-describedby={describedBy(resetReason, `${reasonIds}reset`)}
          onClick={askReset}
        >
          <RotateCcwIcon aria-hidden className="size-4 shrink-0" />
          {t("reset")}
        </button>
        {holderPlate !== undefined && (
          <button
            type="button"
            aria-pressed={holding(holderSeat)}
            className={cn(
              padButton,
              "h-11 px-3 aria-pressed:border-accent-ink aria-pressed:bg-accent-soft aria-pressed:text-accent-ink",
            )}
            onClick={() => {
              setHolds((current) => {
                const next = new Set(current);
                if (next.has(holderSeat)) next.delete(holderSeat);
                else next.add(holderSeat);
                return next;
              });
            }}
          >
            {t("hold")} {sign(holderPlate)}
          </button>
        )}
      </div>
      <p className="text-caption text-fg-muted max-lg:hidden">
        {online ? t("keysOnline") : t("keys")}
      </p>
      <span id={lockId} className="sr-only">
        {locked ? (lockedReason ?? "") : ""}
      </span>
      {JELLY_CREW_DIRECTIONS.map((direction) => (
        <span key={direction} id={`${reasonIds}${direction}`} className="sr-only">
          {reasonOf(direction)}
        </span>
      ))}
      <span id={`${reasonIds}back`} className="sr-only">
        {backReason}
      </span>
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
          letGo(state.turn);
          if (legal("reset")) onMove("reset");
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
        data-turn-seat={over ? undefined : state.turn + 1}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipe.current = null;
        }}
        style={{ touchAction: disabled ? "pan-y" : "none" }}
        className={cn(
          "rounded-card border-[3px] bg-game-page p-1",
          over ? "border-transparent" : (SEAT_BORDER[state.turn] ?? SEAT_BORDER[0]),
        )}
      >
        <CrewBoardSvg
          grid={grid}
          board={state.board}
          now={over ? null : state.turn}
          trail={state.trail}
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
 * The step that led from `before` to `after`, when it is one (a step back, a reset or a new game
 * slides nothing): played again from `before`, so what it pushed is known exactly.
 */
function slideBetween(
  before: JellyCrewState,
  after: JellyCrewState,
  move: JellyCrewMove | undefined,
  grid: ReturnType<typeof jellyCrewLayoutOf>,
): Slide | null {
  if (move === undefined || !isJellyCrewDirection(move) || after.last?.move !== move) return null;
  if (before.turn !== after.last.seat || before.steps + 1 !== after.steps) return null;
  const replayed = jellyCrewStep(grid, before.board, before.turn, move);
  if (!replayed.ok) return null;
  const offset = stepOffset(move, grid.width);
  return {
    seat: before.turn,
    direction: move,
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
