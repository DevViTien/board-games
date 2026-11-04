"use client";

import {
  gateCell,
  IN_STABLE,
  kickedAt,
  LUDO_COLOUR_NAMES,
  type LudoColour,
  type LudoColourName,
  type LudoMove,
  type LudoOutcome,
  type LudoState,
  startCell,
  targetOf,
} from "@board-games/games/ludo";
import { Badge, Button, cn } from "@board-games/ui";
import { useTranslations } from "next-intl";
import { memo, type MouseEvent, useEffect, useId, useRef, useState } from "react";

import type { BoardProps } from "../types";
import {
  GRID,
  horsePoint,
  type Point,
  STABLE_SLOTS,
  stableArea,
  stableOutline,
  stableSlot,
  stepCells,
  TRACK_CELLS,
} from "./board-layout";
import { ColourSymbol } from "./ColourSymbol";
import { Dice } from "./Dice";
import { useLudoText } from "./move-label";
import {
  PIECE_FILL,
  PIECE_INK_FILL,
  PIECE_LINE_BORDER,
  PIECE_LINE_STROKE,
  PIECE_TINT,
  ROLL_BUTTON,
} from "./piece-style";
import { colourNameOf } from "./player-label";
import { useLudoAnimation } from "./use-ludo-animation";

const ROLL: LudoMove = { type: "roll" };
const ALL_COLOURS = [0, 1, 2, 3] as const satisfies readonly LudoColour[];

function nameOf(colour: LudoColour): LudoColourName {
  return LUDO_COLOUR_NAMES[colour];
}

/** The SVG path of a polygon whose corners are rounded by `radius` (less on a short side). */
function roundedPath(points: readonly Point[], radius: number): string {
  const towards = (from: Point, to: Point): Point => {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const step = Math.min(radius, length / 2) / length;
    return { x: from.x + (to.x - from.x) * step, y: from.y + (to.y - from.y) * step };
  };
  const corners = points.map((point, index) => {
    const previous = points[(index + points.length - 1) % points.length] ?? point;
    const next = points[(index + 1) % points.length] ?? point;
    const start = towards(point, previous);
    const end = towards(point, next);
    return `${index === 0 ? "M" : "L"}${start.x} ${start.y}Q${point.x} ${point.y} ${end.x} ${end.y}`;
  });
  return `${corners.join("")}Z`;
}

/**
 * The board itself, which changes only with the turn: the paper, the stables (the one of the player
 * to move ringed), the track, home entries, home steps and the centre.
 */
const BoardDrawing = memo(function BoardDrawing({
  colours,
  active,
}: {
  readonly colours: readonly LudoColour[];
  /** The colour whose stable stands out (the player to move), or `null` once the game is over. */
  readonly active: LudoColour | null;
}) {
  return (
    <>
      <rect x="0" y="0" width={GRID} height={GRID} className="fill-game-tint" />
      {ALL_COLOURS.map((colour) => {
        const name = nameOf(colour);
        const area = stableArea(colour);
        const playing = colours.includes(colour);
        const isActive = colour === active;
        return (
          <g
            key={`stable-${name}`}
            data-stable={name}
            data-active={isActive || undefined}
            className={cn(!playing && "opacity-40")}
          >
            {/* A block of the colour, with a square of paper where the horses wait. */}
            <path d={roundedPath(stableOutline(colour, 0.2), 0.7)} className={PIECE_FILL[name]} />
            {/* The stable of the player to move: an ink edge inside the block and a dashed ring of
                its colour around it, so it stands out by more than colour. */}
            <g
              className={cn(
                "transition-opacity duration-200 motion-reduce:transition-none",
                isActive ? "opacity-100" : "opacity-0",
              )}
            >
              <path
                d={roundedPath(stableOutline(colour, 0.28), 0.62)}
                fill="none"
                strokeWidth="0.16"
                className="stroke-fg"
              />
              <path
                d={roundedPath(stableOutline(colour, 0.08), 0.8)}
                fill="none"
                strokeWidth="0.07"
                strokeDasharray="0.22 0.14"
                className={PIECE_LINE_STROKE[name]}
              />
            </g>
            <rect
              x={area.x}
              y={area.y}
              width={area.size}
              height={area.size}
              rx="0.6"
              className="fill-game-board"
            />
            {STABLE_SLOTS.map((horse) => {
              const slot = stableSlot(colour, horse);
              return (
                <circle
                  key={horse}
                  cx={slot.x}
                  cy={slot.y}
                  r="0.36"
                  fill="none"
                  strokeWidth="0.04"
                  strokeDasharray="0.12 0.1"
                  className="stroke-game-line"
                />
              );
            })}
            <ColourSymbol
              colour={name}
              at={{ x: area.x + area.size / 2, y: area.y + area.size / 2 }}
              size={0.24}
              className={PIECE_FILL[name]}
            />
          </g>
        );
      })}
      {TRACK_CELLS.map(([row, col], square) => (
        <rect
          key={`track-${square}`}
          x={col}
          y={row}
          width="1"
          height="1"
          strokeWidth="0.04"
          className="fill-game-board stroke-game-line"
        />
      ))}
      {ALL_COLOURS.map((colour) => {
        const name = nameOf(colour);
        const [startRow, startCol] = TRACK_CELLS[startCell(colour)] ?? [0, 0];
        const [gateRow, gateCol] = TRACK_CELLS[gateCell(colour)] ?? [0, 0];
        return (
          <g key={`marks-${name}`}>
            {/* The start square: tinted, with the colour's symbol. */}
            <rect
              x={startCol}
              y={startRow}
              width="1"
              height="1"
              strokeWidth="0.04"
              className={cn(PIECE_TINT[name], "stroke-game-line")}
            />
            <ColourSymbol
              colour={name}
              at={{ x: startCol + 0.5, y: startRow + 0.5 }}
              size={0.16}
              className={cn(PIECE_FILL[name], "opacity-60")}
            />
            {/* The home entry (chân chuồng): a dashed frame of the colour. */}
            <rect
              x={gateCol + 0.14}
              y={gateRow + 0.14}
              width="0.72"
              height="0.72"
              fill="none"
              strokeWidth="0.08"
              strokeDasharray="0.14 0.1"
              className={PIECE_LINE_STROKE[name]}
            />
            {stepCells(colour).map(([row, col], index) => (
              <g key={`step-${name}-${index}`}>
                <rect
                  x={col}
                  y={row}
                  width="1"
                  height="1"
                  strokeWidth="0.04"
                  className={cn(PIECE_TINT[name], "stroke-game-line")}
                />
                <text
                  x={col + 0.5}
                  y={row + 0.55}
                  fontSize="0.42"
                  fontWeight="700"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-fg"
                >
                  {index + 1}
                </text>
              </g>
            ))}
          </g>
        );
      })}
      {/* The centre square, between the four highest steps: a triangle of each colour, each
          against its colour's step 6. */}
      {ALL_COLOURS.map((colour) => {
        const edges: readonly string[] = ["7,7 8,7", "8,7 8,8", "8,8 7,8", "7,8 7,7"];
        return (
          <polygon
            key={`centre-${colour}`}
            points={`${edges[colour] ?? ""} 7.5,7.5`}
            className={cn(PIECE_FILL[nameOf(colour)], !colours.includes(colour) && "opacity-40")}
          />
        );
      })}
    </>
  );
});

interface HorseProps {
  readonly colour: LudoColourName;
  readonly at: Point;
  /** Data for a click on the board: the horse number of a move that may be chosen. */
  readonly choice: number | null;
  readonly last: boolean;
  readonly highlighted: boolean;
  readonly ghost: boolean;
  readonly kickedNow: boolean;
  readonly kickedMark: boolean;
}

/**
 * A horse: a disc of its colour with a dark edge and the colour's symbol in the colour's ink, never
 * told apart by colour alone. A ghost (where a previewed choice would go) is the same, dashed.
 */
function Horse({
  colour,
  at,
  choice,
  last,
  highlighted,
  ghost,
  kickedNow,
  kickedMark,
}: HorseProps) {
  return (
    <g
      data-colour={colour}
      data-choice={choice ?? undefined}
      data-last={last || undefined}
      data-highlighted={highlighted || undefined}
      data-ghost={ghost || undefined}
      className={cn(
        "origin-center transform-fill",
        choice !== null && "cursor-pointer",
        kickedNow && "animate-piece-kicked motion-reduce:animate-none",
      )}
    >
      {/* The horse just moved: a ring of ink dots. */}
      {last && (
        <circle
          cx={at.x}
          cy={at.y}
          r="0.5"
          fill="none"
          strokeWidth="0.09"
          strokeLinecap="round"
          strokeDasharray="0.001 0.14"
          className="stroke-game-last-move"
        />
      )}
      {highlighted && (
        <circle
          cx={at.x}
          cy={at.y}
          r="0.5"
          fill="none"
          strokeWidth="0.1"
          strokeDasharray="0.18 0.1"
          className="stroke-game-highlight"
        />
      )}
      {kickedMark && (
        <circle
          cx={at.x}
          cy={at.y}
          r="0.5"
          fill="none"
          strokeWidth="0.06"
          strokeDasharray="0.1 0.1"
          className="stroke-fg-muted"
        />
      )}
      {ghost ? (
        <circle
          cx={at.x}
          cy={at.y}
          r="0.36"
          strokeWidth="0.07"
          strokeDasharray="0.12 0.08"
          className={cn("fill-game-board", PIECE_LINE_STROKE[colour])}
        />
      ) : (
        <>
          {/* A soft shadow below (decorative). */}
          <circle cx={at.x} cy={at.y + 0.06} r="0.36" className="fill-game-line/40" />
          <circle
            cx={at.x}
            cy={at.y}
            r="0.38"
            strokeWidth="0.05"
            className={cn(PIECE_FILL[colour], "stroke-piece-edge")}
          />
        </>
      )}
      <ColourSymbol
        colour={colour}
        at={at}
        size={0.17}
        className={ghost ? PIECE_FILL[colour] : PIECE_INK_FILL[colour]}
      />
    </g>
  );
}

/** A colour's symbol on its own, the size of a line of text (a chip, a choice). */
function SymbolIcon({ colour }: { colour: LudoColourName }) {
  return (
    <svg viewBox="0 0 1 1" aria-hidden className="size-3 shrink-0">
      <ColourSymbol
        colour={colour}
        at={{ x: 0.5, y: 0.5 }}
        size={0.45}
        className={PIECE_FILL[colour]}
      />
    </svg>
  );
}

/** What the die shows, and how a screen reader reads it. */
interface DieView {
  readonly face: number | null;
  readonly colour: LudoColourName;
  readonly label: string;
}

/**
 * A Cờ cá ngựa board: the cross-shaped track drawn in SVG, and as controls the die, a "Roll" button
 * and, after a roll, one button per horse that can move, saying where it goes. Those buttons are the
 * way to play with the keyboard, a screen reader or a finger; the horses on the SVG (hidden from
 * assistive technology, which reads the list of positions instead) can also be clicked. The die and
 * the roll button take the colour of the player to move (about to roll, or choosing a horse), whose
 * stable stands out; the roll before, once the die waits again, is shown beside them. The roll of a
 * person at this device is announced by the board's hint; everything else is told by the play
 * screen's status line, so nothing is read twice.
 */
export function LudoBoard({
  state,
  legalMoves,
  onMove,
  disabled,
  viewer,
  layout,
  lockedReason = null,
}: BoardProps<LudoState, LudoMove, LudoOutcome>) {
  const t = useTranslations("Games.ludo");
  const text = useLudoText();
  const animation = useLudoAnimation(state.last, state.ply);
  const rollButtonRef = useRef<HTMLButtonElement>(null);
  const firstChoiceRef = useRef<HTMLButtonElement>(null);
  const [preview, setPreview] = useState<number | null>(null);
  // The move count at which the roll button got the focus or was pressed: why it is locked shows in
  // words until the next move (a tap may focus nothing, so a blur may never come).
  const [rollReasonAt, setRollReasonAt] = useState<number | null>(null);
  const rollReasonId = useId();
  /** Set by a roll from this board: the first choice gets the focus once the roll is in. */
  const focusChoiceAfterRoll = useRef(false);

  const player = state.toMove;
  const over = state.winner !== null;
  const canRoll = !disabled && legalMoves.some((move) => move.type === "roll");
  const choices = (disabled ? [] : legalMoves).flatMap((move) => {
    if (move.type !== "move" || state.die === null) return [];
    const from = state.horses[player]?.[move.horse] ?? IN_STABLE;
    const to = targetOf(state, player, move.horse, state.die);
    if (to === null) return [];
    const kicked = kickedAt(state, player, to);
    const target = text.target(from, to);
    const action =
      kicked === null
        ? target
        : t("kick", { action: target, colour: text.colour(kicked.player, state) });
    return [
      { move, horse: move.horse, to, label: t("option", { number: move.horse + 1, action }) },
    ];
  });
  const previewed = choices.find((choice) => choice.horse === preview) ?? null;

  // Moves played: changes with every roll and move, also two alike in a row.
  const { ply } = state;
  useEffect(() => {
    if (!focusChoiceAfterRoll.current) return;
    focusChoiceAfterRoll.current = false;
    // No choice: the turn was lost, and the focus stays on the roll button.
    firstChoiceRef.current?.focus();
  }, [ply]);

  function roll() {
    focusChoiceAfterRoll.current = true;
    onMove(ROLL);
  }

  function choose(move: LudoMove) {
    // The choices go away with the move: the focus goes back to the roll button first.
    rollButtonRef.current?.focus();
    setPreview(null);
    onMove(move);
  }

  function handleBoardClick(event: MouseEvent<SVGSVGElement>) {
    if (!(event.target instanceof Element)) return;
    const value = event.target.closest<SVGElement>("[data-choice]")?.dataset.choice;
    const choice = choices.find((option) => String(option.horse) === value);
    if (choice !== undefined) choose(choice.move);
  }

  const { last } = state;
  const toMove = colourNameOf(state, player);
  const rolling = animation.rollingFace !== null;
  // Why the roll button is locked: the play screen's reason while the board is locked (someone
  // else to play, the connection, a move on its way), else a horse to choose first. Nothing once
  // the game is over.
  let rollReason: string | null = null;
  if (!canRoll && !over) {
    if (disabled) rollReason = lockedReason;
    else if (state.die !== null) rollReason = t("unavailable.choose");
  }
  const rollReasonShown = rollReasonAt === ply;
  // The die: tumbling in the roller's colour, read as the number rolled; once the game is over, the
  // last number rolled; otherwise in the colour of the player to move, the number to move by while
  // a horse is chosen, or a face waiting for the roll.
  let die: DieView;
  if (last !== null && (rolling || over)) {
    die = {
      face: animation.rollingFace ?? last.face,
      colour: colourNameOf(state, last.player),
      label: t("die", { face: last.face, player: text.colour(last.player, state) }),
    };
  } else if (state.die === null) {
    die = {
      face: null,
      colour: toMove,
      label: t("dieReady", { player: text.colour(player, state) }),
    };
  } else {
    die = {
      face: state.die,
      colour: toMove,
      label: t("die", { face: state.die, player: text.colour(player, state) }),
    };
  }
  // The roll before, once the die waits again: a turn gone by, or the same player before rolling
  // again. Not while the die still tumbles with it: the die tells it then. Not live: the status
  // line has told it.
  const lastRoll =
    last !== null && state.die === null && !over && !rolling
      ? {
          colour: colourNameOf(state, last.player),
          text: t("lastRoll", { player: text.colour(last.player, state), face: last.face }),
        }
      : null;

  // What the last roll means. Read out (live) only for a person at this device.
  const here = last !== null && (viewer === null || last.player === viewer);
  let hint = "";
  if (last?.kind === "roll") {
    const who = text.colour(last.player, state);
    if (last.lost) hint = t("hint.lost", { player: who, face: last.face });
    else if (last.again) hint = t("hint.noMoveAgain", { player: who });
    // Only the person choosing is told to choose.
    else if (here) hint = t("hint.choose", { player: who, face: last.face });
    else hint = t("hint.rolled", { player: who, face: last.face });
  } else if (last?.kind === "move" && last.again) {
    hint = t("hint.again", { player: text.colour(last.player, state) });
  }

  const justKicked =
    last?.kind === "move" && last.kicked !== null
      ? { player: last.kicked.player, horse: last.kicked.horse }
      : null;

  const board = (
    // The play screen gives the room (`--board-room`); a laptop never needs more than 37.5rem.
    <div data-ply={ply} className="mx-auto w-[min(var(--board-room,100%),37.5rem)]">
      <div className="aspect-square w-full overflow-hidden rounded-card border-2 border-(--ludo-frame)">
        {/* Hidden from assistive technology: the list of positions and the choices say it all. */}
        <svg
          aria-hidden
          viewBox={`0 0 ${GRID} ${GRID}`}
          className="size-full touch-manipulation"
          onClick={handleBoardClick}
        >
          <BoardDrawing
            colours={state.colours}
            active={over ? null : (state.colours[player] ?? null)}
          />
          {previewed !== null && (
            <ChoiceTarget
              at={horsePoint(state.colours[player] ?? 0, previewed.horse, previewed.to)}
            />
          )}
          {state.colours.map((colour, seat) =>
            (state.horses[seat] ?? []).map((progress, horse) => {
              const walking =
                animation.walking?.player === seat && animation.walking.horse === horse
                  ? animation.walking.progress
                  : progress;
              const isChoice = seat === player && choices.some((c) => c.horse === horse);
              return (
                <Horse
                  key={`${seat}-${horse}`}
                  colour={nameOf(colour)}
                  at={horsePoint(colour, horse, walking)}
                  choice={isChoice ? horse : null}
                  last={last?.kind === "move" && last.player === seat && last.horse === horse}
                  highlighted={seat === player && previewed?.horse === horse}
                  ghost={false}
                  kickedNow={animation.kicked?.player === seat && animation.kicked.horse === horse}
                  kickedMark={justKicked?.player === seat && justKicked.horse === horse}
                />
              );
            }),
          )}
          {previewed !== null && (
            <Horse
              colour={nameOf(state.colours[player] ?? 0)}
              at={horsePoint(state.colours[player] ?? 0, previewed.horse, previewed.to)}
              choice={null}
              last={false}
              highlighted={false}
              ghost
              kickedNow={false}
              kickedMark={false}
            />
          )}
        </svg>
      </div>

      <ul aria-label={t("positions")} className="sr-only">
        {state.colours.map((colour, seat) =>
          (state.horses[seat] ?? []).map((progress, horse) => {
            const position = t("position", {
              colour: text.colour(seat, state),
              number: horse + 1,
              where: text.place(progress),
            });
            const moved = last?.kind === "move" && last.player === seat && last.horse === horse;
            const kicked = justKicked?.player === seat && justKicked.horse === horse;
            return (
              <li key={`${colour}-${horse}`}>
                {moved
                  ? t("justMoved", { position })
                  : kicked
                    ? t("justKicked", { position })
                    : position}
              </li>
            );
          }),
        )}
      </ul>
    </div>
  );

  const controls = (
    <div className="flex w-full flex-col gap-3">
      <div className="relative flex items-center justify-center gap-3 lg:justify-start short-landscape:justify-start">
        <Dice face={die.face} colour={die.colour} rolling={rolling} label={die.label} />
        {/* Always there, so the focus has somewhere to go after a move or a lost turn. Locked, the
            shared disabled look wins over the colour; the colour of the player to move stays on
            the die's frame. */}
        <Button
          ref={rollButtonRef}
          size="lg"
          data-ludo-roll=""
          aria-disabled={!canRoll}
          aria-describedby={rollReason === null ? undefined : rollReasonId}
          onClick={roll}
          onFocus={() => {
            setRollReasonAt(ply);
          }}
          onPointerDown={() => {
            setRollReasonAt(ply);
          }}
          onBlur={() => {
            setRollReasonAt(null);
          }}
          className={cn(
            ROLL_BUTTON[toMove],
            // A lip below (decorative) that gives way when pressed.
            "shadow-(--ludo-roll-shadow) active:translate-y-0.5 active:shadow-none",
          )}
        >
          {t("roll")}
        </Button>
        {/* Why the button is locked: read with it, shown as a note under it while it has the focus
            or was just pressed, over what is below, so nothing moves. */}
        {rollReason !== null && (
          <p
            id={rollReasonId}
            className={cn(
              rollReasonShown
                ? "absolute top-full z-10 mt-1.5 rounded-control border border-border bg-surface px-2.5 py-1 text-small text-fg-muted shadow-raised lg:left-0 short-landscape:left-0"
                : "sr-only",
            )}
          >
            {rollReason}
          </p>
        )}
      </div>

      {/* What the roll means, and the roll before: one block, with no room kept while both are
          empty (the die row and the choices sit close then). */}
      <div className="flex flex-col items-center gap-2 lg:items-start short-landscape:items-start">
        {/* Not a status: the play screen's turn line is the one status of the page. Live only for
            a roll made here; the others are told by that status line. */}
        <div
          data-ludo-hint=""
          className="text-center text-small text-fg-muted lg:text-left short-landscape:text-left"
        >
          <p aria-live="polite">{here ? hint : ""}</p>
          {!here && hint !== "" && <p>{hint}</p>}
        </div>

        {lastRoll !== null && (
          <Badge data-ludo-last-roll="">
            <SymbolIcon colour={lastRoll.colour} />
            {lastRoll.text}
          </Badge>
        )}
      </div>

      {choices.length > 0 && (
        <div
          role="group"
          aria-label={t("chooseHorse")}
          className="grid gap-2 lg:grid-cols-2 short-landscape:grid-cols-2"
        >
          {choices.map((choice, index) => (
            <Button
              key={choice.horse}
              ref={index === 0 ? firstChoiceRef : undefined}
              variant="secondary"
              data-ludo-choice=""
              // A long label (other languages, a kick) wraps instead of overflowing the button.
              className={cn(
                "h-auto min-h-11 justify-start px-3 py-2 text-left text-small",
                PIECE_LINE_BORDER[toMove],
              )}
              onClick={() => {
                choose(choice.move);
              }}
              onFocus={() => {
                setPreview(choice.horse);
              }}
              onBlur={() => {
                setPreview(null);
              }}
              onMouseEnter={() => {
                setPreview(choice.horse);
              }}
              onMouseLeave={() => {
                setPreview(null);
              }}
            >
              <SymbolIcon colour={toMove} />
              {choice.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );

  return layout({ board, controls });
}

/** The square a previewed choice goes to: a thick dashed frame of ink. */
function ChoiceTarget({ at }: { at: Point }) {
  return (
    <rect
      data-target=""
      x={at.x - 0.45}
      y={at.y - 0.45}
      width="0.9"
      height="0.9"
      fill="none"
      strokeWidth="0.1"
      strokeDasharray="0.2 0.1"
      className="stroke-game-highlight"
    />
  );
}
