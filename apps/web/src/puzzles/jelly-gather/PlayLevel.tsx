"use client";

import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  Button,
  buttonVariants,
  cn,
  InfoIcon,
  PartyPopperIcon,
  RotateCcwIcon,
  Undo2Icon,
} from "@board-games/ui";
import { useTranslations } from "next-intl";
import {
  type PointerEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { AppTopBar } from "@/features/shell/AppTopBar";
import { BackLink, HistoryLink, ScreenTitle } from "@/features/shell/client-navigation";

import { type BoardMotion, JellyBoard } from "./Board";
import { nextLevel } from "./levels";
import { JELLY_GATHER_HOME, levelHref } from "./routes";
import { currentFrame } from "./rules/history";
import { BLOCKED, DIRECTION, type Direction, type Level } from "./rules/types";
import { useSay } from "./say";
import { useAttempt } from "./use-attempt";
import { usePlayKeys } from "./use-play-keys";

/** How far a finger must travel on the board for a swipe to be a move. */
const SWIPE_PX = 24;

/**
 * A live region that is cleared before each message, so a message the same as the last one is
 * still read out (blocked twice in a row).
 */
function useAnnouncement(): readonly [string, (text: string) => void] {
  const [text, setText] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );
  const announce = useCallback((next: string) => {
    clearTimeout(timer.current);
    setText("");
    timer.current = setTimeout(() => {
      setText(next);
    }, 30);
  }, []);
  return [text, announce] as const;
}

const DIRECTION_BUTTONS = [
  { direction: DIRECTION.Up, label: "up", Icon: ArrowUpIcon, place: "col-start-3 row-start-1" },
  {
    direction: DIRECTION.Left,
    label: "left",
    Icon: ArrowLeftIcon,
    place: "col-start-2 row-start-2",
  },
  {
    direction: DIRECTION.Down,
    label: "down",
    Icon: ArrowDownIcon,
    place: "col-start-3 row-start-2",
  },
  {
    direction: DIRECTION.Right,
    label: "right",
    Icon: ArrowRightIcon,
    place: "col-start-4 row-start-2",
  },
] as const;

interface ControlsProps {
  readonly disabled: boolean;
  readonly canUndo: boolean;
  readonly onMove: (direction: Direction) => void;
  readonly onUndo: () => void;
  readonly onRestart: () => void;
  readonly undoRef: Ref<HTMLButtonElement>;
}

/** Undo, the four directions, restart: two rows of 52 px in reach of a thumb. */
function Controls({ disabled, canUndo, onMove, onUndo, onRestart, undoRef }: ControlsProps) {
  const t = useTranslations("JellyGather.play");
  const action =
    "flex h-13 flex-col items-center justify-center gap-0.5 rounded-control px-1 text-caption font-semibold leading-tight text-fg touch-manipulation hover:bg-surface-muted aria-disabled:cursor-not-allowed aria-disabled:text-fg-muted focus-ring";
  return (
    <div
      role="group"
      aria-label={t("controls")}
      className="grid grid-cols-[1fr_3.25rem_3.25rem_3.25rem_1fr] grid-rows-[3.25rem_3.25rem] gap-2"
    >
      <button
        ref={undoRef}
        type="button"
        className={cn(action, "col-start-1 row-start-1")}
        aria-disabled={disabled || !canUndo}
        aria-describedby={canUndo ? undefined : "jelly-undo-why"}
        onClick={canUndo && !disabled ? onUndo : undefined}
      >
        <Undo2Icon aria-hidden className="size-5" />
        {t("undo")}
      </button>
      {DIRECTION_BUTTONS.map(({ direction, label, Icon, place }) => (
        <button
          key={direction}
          type="button"
          aria-label={t(label)}
          aria-disabled={disabled}
          className={cn(
            buttonVariants({ variant: "secondary", size: "icon" }),
            "size-13 touch-manipulation",
            place,
          )}
          onClick={
            disabled
              ? undefined
              : () => {
                  onMove(direction);
                }
          }
          // Keeps the focus where it is: a tap on the pad is not a move of the focus.
          onPointerDown={(event) => {
            event.preventDefault();
          }}
        >
          <Icon aria-hidden className="size-6" />
        </button>
      ))}
      <button
        type="button"
        className={cn(action, "col-start-5 row-start-1")}
        aria-disabled={disabled}
        onClick={disabled ? undefined : onRestart}
      >
        <RotateCcwIcon aria-hidden className="size-5" />
        {t("restart")}
      </button>
      <span id="jelly-undo-why" className="sr-only">
        {t("undoNone")}
      </span>
    </div>
  );
}

interface SolvedPanelProps {
  readonly level: Level;
  readonly steps: number;
  readonly best: number | undefined;
  readonly onRestart: () => void;
  readonly onUndo: () => void;
  readonly firstRef: Ref<HTMLElement>;
}

/** In place of the controls once the level is solved (spec "Khi giải xong màn"). */
export function SolvedPanel({ level, steps, best, onRestart, onUndo, firstRef }: SolvedPanelProps) {
  const t = useTranslations("JellyGather.solved");
  const tPlay = useTranslations("JellyGather.play");
  const next = nextLevel(level.id);
  const stat = (label: string, value: number) => (
    <p className="flex flex-col text-small font-semibold">
      {label}
      <span className="text-heading tabular-nums">{t("moves", { count: value })}</span>
    </p>
  );
  return (
    <section
      aria-labelledby="jelly-solved-title"
      className="flex flex-col gap-3 rounded-card bg-celebration-soft p-4 motion-safe:animate-[jelly-gather-pop_260ms_cubic-bezier(0.2,0.9,0.3,1.3)]"
    >
      <h2
        id="jelly-solved-title"
        className="flex items-center gap-2 text-heading text-celebration-ink"
      >
        <PartyPopperIcon aria-hidden className="size-6" />
        {t("title")}
      </h2>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {stat(t("thisTime"), steps)}
        {stat(t("best"), Math.min(best ?? steps, steps))}
        {stat(t("fewest"), level.minMoves)}
      </div>
      {steps === level.minMoves && (
        <p className="text-small font-bold text-celebration-ink">{t("perfect")}</p>
      )}
      <div className="flex gap-2">
        {next !== undefined && (
          <HistoryLink
            ref={firstRef as Ref<HTMLAnchorElement>}
            href={levelHref(next)}
            className={cn(buttonVariants(), "flex-1")}
          >
            {t("next")}
          </HistoryLink>
        )}
        <Button
          ref={next === undefined ? (firstRef as Ref<HTMLButtonElement>) : undefined}
          variant="secondary"
          className="flex-1"
          onClick={onRestart}
        >
          {tPlay("restart")}
        </Button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onUndo}>
          <Undo2Icon aria-hidden className="size-5" />
          {tPlay("undo")}
        </Button>
        <HistoryLink
          href={JELLY_GATHER_HOME}
          className="focus-ring rounded-sm px-1 py-2 text-small font-semibold text-accent-ink underline underline-offset-2"
        >
          {t("list")}
        </HistoryLink>
      </div>
    </section>
  );
}

/** `/puzzles/jelly-gather/<level>`: one level, played with keys, swipes or the pad. */
export function PlayLevel({ level }: { readonly level: Level }) {
  const t = useTranslations("JellyGather");
  const say = useSay();
  const play = useAttempt(level);
  const [motion, setMotion] = useState<BoardMotion | null>(null);
  const [bump, setBump] = useState<{ serial: number; direction: Direction } | null>(null);
  const [face, setFace] = useState<Direction>(DIRECTION.Down);
  const [status, announce] = useAnnouncement();
  const [justSolved, setJustSolved] = useState(false);
  const serial = useRef(0);
  const undoRef = useRef<HTMLButtonElement>(null);
  const solvedFirstRef = useRef<HTMLElement>(null);
  const focusUndo = useRef(false);

  const ready = play.attempt !== null;
  const frame = play.attempt === null ? null : currentFrame(play.attempt);
  const board = frame?.board ?? level.start;
  const steps = frame?.steps ?? 0;

  const move = useCallback(
    (direction: Direction) => {
      const played = play.move(direction);
      if (played === null) return;
      const { result } = played;
      if (!result.ok) {
        if (result.blocked !== BLOCKED.Solved) {
          serial.current += 1;
          setBump({ serial: serial.current, direction });
          announce(say.blocked(result.blocked));
        }
        return;
      }
      setFace(direction);
      serial.current += 1;
      const slid = new Set(
        result.pushedPieces.flatMap((index) => result.moved.pieces[index]?.cells ?? []),
      );
      const { outcome } = result;
      const settles = outcome.stuck.length > 0 || outcome.glued.length > 0 || outcome.fixed;
      const settled = new Set(
        settles
          ? result.board.pieces
              .filter((piece) => piece.cells.some((cell) => slid.has(cell)))
              .map((piece) => piece.cells[0] ?? -1)
          : [],
      );
      setMotion({ serial: serial.current, direction, slid, settled });
      announce(say.outcome(level, outcome, played.steps));
      if (outcome.solved) setJustSolved(true);
    },
    [announce, level, play, say],
  );

  const undo = useCallback(() => {
    const wasSolved = play.solved;
    const left = play.undo();
    if (left === null) return;
    setMotion(null);
    setJustSolved(false);
    // Undone from the solved panel: the panel goes, the focus goes to the pad's undo.
    if (wasSolved) focusUndo.current = true;
    announce(t("say.undone", { count: left }));
  }, [announce, play, t]);

  const restart = useCallback(() => {
    const wasSolved = play.solved;
    if (!play.restart()) return;
    setMotion(null);
    setJustSolved(false);
    // Restarted from the solved panel: the panel goes, the focus goes to the pad.
    if (wasSolved) focusUndo.current = true;
    announce(t("say.restarted"));
  }, [announce, play, t]);

  usePlayKeys({ move, undo, restart }, ready);

  // Solved just now: the focus goes to what comes next, unless the player was busy elsewhere.
  useEffect(() => {
    if (!justSolved) return;
    const active = document.activeElement;
    const idle =
      active === null ||
      active === document.body ||
      active.tagName === "H1" ||
      active.closest('[role="group"]') !== null;
    if (idle) solvedFirstRef.current?.focus();
  }, [justSolved]);

  useEffect(() => {
    if (!play.solved && focusUndo.current) {
      focusUndo.current = false;
      undoRef.current?.focus();
    }
  }, [play.solved]);

  // A swipe on the board is one move along its longer side.
  const swipeFrom = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (event: PointerEvent) => {
    swipeFrom.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent) => {
    const from = swipeFrom.current;
    swipeFrom.current = null;
    if (from === null || !ready) return;
    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_PX) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? DIRECTION.Right : DIRECTION.Left);
    else move(dy > 0 ? DIRECTION.Down : DIRECTION.Up);
  };

  const chapterName = t(`chapters.${String(level.chapter) as "1" | "2" | "3"}.name`);
  const hint: ReactNode =
    level.hint !== undefined && !play.solved ? (
      <p className="flex items-start gap-2.5 rounded-control bg-accent-soft px-3 py-2.5 text-small font-semibold text-accent-ink">
        <InfoIcon aria-hidden className="mt-0.5 size-5 shrink-0" />
        <span>{t(`hints.${level.hint}`)}</span>
      </p>
    ) : null;

  const actions = play.solved ? (
    <SolvedPanel
      level={level}
      steps={steps}
      best={play.best}
      onRestart={restart}
      onUndo={undo}
      firstRef={solvedFirstRef}
    />
  ) : (
    <div className="flex flex-col gap-3">
      <Controls
        disabled={!ready}
        canUndo={play.canUndo}
        onMove={move}
        onUndo={undo}
        onRestart={restart}
        undoRef={undoRef}
      />
      <p className="text-center text-caption text-fg-muted max-lg:sr-only">{t("play.keys")}</p>
    </div>
  );

  return (
    <div data-game="jelly-gather" className="flex min-h-dvh flex-col bg-game-page">
      <AppTopBar back={<BackLink href={JELLY_GATHER_HOME} label={t("play.backToList")} />} />
      {/* One DOM for every width: a column on a phone (title, hint, board, controls); from 1024 px
          the board on the left and the rest in a column on its right. */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 pt-3 px-safe-4 pb-safe-4 sm:px-safe-6 lg:grid lg:grid-cols-[1fr_22rem] lg:content-start lg:gap-x-8 lg:gap-y-4 lg:pt-8 lg:px-safe-10">
        <div className="flex flex-col gap-1 lg:col-start-2">
          <div className="flex items-baseline justify-between gap-3">
            <ScreenTitle className="text-heading">
              {t("play.title", { level: level.id })}
            </ScreenTitle>
            <p className="text-small font-semibold text-fg-muted tabular-nums">
              {t.rich("play.steps", {
                count: steps,
                b: (chunks) => <b className="text-heading text-fg">{chunks}</b>,
              })}
            </p>
          </div>
          <p className="text-small text-fg-muted">
            {t("play.chapterLine", { chapter: level.chapter, name: chapterName })}
            {play.best !== undefined && ` · ${t("play.best", { moves: play.best })}`}
          </p>
        </div>
        {hint !== null && <div className="lg:col-start-2">{hint}</div>}
        <div
          className="flex min-h-36 flex-1 touch-none items-center justify-center rounded-card bg-game-tint p-3 lg:col-start-1 lg:row-span-4 lg:row-start-1 lg:min-h-[36rem] lg:p-6"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            swipeFrom.current = null;
          }}
        >
          <JellyBoard level={level} board={board} face={face} motion={motion} bump={bump} />
        </div>
        <div className="lg:col-start-2">{actions}</div>
        <ol aria-label={t("play.board")} className="sr-only">
          {say.rows(level, board).map((row, index) => (
            <li key={index}>{row}</li>
          ))}
        </ol>
        <p role="status" className="sr-only">
          {status}
        </p>
      </main>
    </div>
  );
}
