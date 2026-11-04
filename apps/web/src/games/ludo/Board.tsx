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
import { fromScreen, hitRadius, horseCentre, nearestHorse, VIEW_BOX } from "./board-geometry";
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
import { ChoiceTargets } from "./ChoiceTargets";
import { ColourSymbol } from "./ColourSymbol";
import { Dice } from "./Dice";
import { ThrowOverlay } from "./dice3d/ThrowOverlay";
import { useDiceThrow } from "./dice3d/use-dice-throw";
import { THROW_PHASE } from "./dice3d/use-hold-to-roll";
import { ChoiceTarget, Horse, HorseFloor, KickBadge } from "./Horse";
import { useLudoText } from "./move-label";
import { PIECE_FILL, PIECE_LINE_STROKE, PIECE_TINT, ROLL_BUTTON } from "./piece-style";
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

/** A horse on the board, where it is drawn now. */
interface PlacedHorse {
  readonly seat: number;
  readonly horse: number;
  readonly colour: LudoColourName;
  readonly at: Point;
}

/** The id of an SVG element, from `useId`, safe inside `url(#…)`. */
function svgId(id: string): string {
  return `ludo-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

/**
 * A Cờ cá ngựa board: the cross-shaped track drawn in SVG with its horses, and as controls the die
 * and a "Roll" button (design of redesign-ludo-play). After a roll, the horses that may move bob
 * with a ring; a touch or a click on one moves it at once (the board takes the horse whose figure is
 * nearest, of every horse, and moves it only if it may move). The keyboard and screen readers press
 * see-through buttons laid over those horses, read as before ("Ngựa 2: ra chuồng"). The person at
 * this device rolls by pressing and holding the button (the 3D die, `dice3d/`), or, without it, by
 * a press. The die and the roll button take the colour of the player to move, whose stable stands
 * out; the roll before, once the die waits again, is shown beside them. The roll of a person at
 * this device is announced by the board's hint, once the die rests; everything else is told by the
 * play screen's status line, so nothing is read twice.
 */
export function LudoBoard({
  state: liveState,
  legalMoves: liveMoves,
  onMove,
  disabled,
  viewer,
  layout,
  lockedReason = null,
}: BoardProps<LudoState, LudoMove, LudoOutcome>) {
  const t = useTranslations("Games.ludo");
  const text = useLudoText();
  const rollButtonRef = useRef<HTMLButtonElement>(null);
  const firstChoiceRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<number | null>(null);
  // The move count at which the roll button got the focus or was pressed: why it is locked shows in
  // words until the next move (a tap may focus nothing, so a blur may never come).
  const [rollReasonAt, setRollReasonAt] = useState<number | null>(null);
  const rollReasonId = useId();
  const clipId = svgId(useId());
  /** Set by a roll from the keyboard: the first choice gets the focus once the die rests. */
  const focusChoiceAfterRoll = useRef(false);
  /** A primary pointer was pressed on the board, for the click that follows it. */
  const pressed = useRef(false);

  const liveCanRoll = !disabled && liveMoves.some((move) => move.type === "roll");
  const throwing = useDiceThrow({
    state: liveState,
    legalMoves: liveMoves,
    canRoll: liveCanRoll,
    readColours: () => {
      const style = getComputedStyle(frameRef.current ?? document.documentElement);
      const read = (name: string) => style.getPropertyValue(name).trim();
      return {
        body: read("--game-board"),
        line: read(`--piece-${colourNameOf(liveState, liveState.toMove)}-line`),
        pip: read("--fg"),
      };
    },
    roll: () => {
      onMove(ROLL);
    },
    onEnd: (byKeyboard) => {
      focusChoiceAfterRoll.current = byKeyboard;
    },
  });
  // While the die is thrown, the board shows the game as it was before the roll: the number, the
  // horses to choose and what the roll means show once the die rests.
  const inThrow = throwing.frozen !== null;
  const state = throwing.frozen?.state ?? liveState;
  const legalMoves = throwing.frozen?.legalMoves ?? liveMoves;
  const animation = useLudoAnimation(state.last, state.ply, throwing.settledPly);

  const player = state.toMove;
  const over = state.winner !== null;
  const canRoll = inThrow || liveCanRoll;
  const choices = (disabled || inThrow ? [] : legalMoves).flatMap((move) => {
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
      {
        move,
        horse: move.horse,
        to,
        kicked,
        label: t("option", { number: move.horse + 1, action }),
      },
    ];
  });
  const previewed = choices.find((choice) => choice.horse === preview) ?? null;

  // Moves shown: changes with every roll and move, also two alike in a row.
  const { ply } = state;
  useEffect(() => {
    if (!focusChoiceAfterRoll.current) return;
    focusChoiceAfterRoll.current = false;
    // No choice: the turn was lost, and the focus stays on the roll button.
    firstChoiceRef.current?.focus();
  }, [ply]);

  function choose(horse: number) {
    const choice = choices.find((option) => option.horse === horse);
    if (choice === undefined) return;
    // The choices go away with the move: the focus goes back to the roll button first.
    rollButtonRef.current?.focus();
    setPreview(null);
    onMove(choice.move);
  }

  // Every horse where it is drawn now, the walking one included.
  const placed: PlacedHorse[] = state.colours.flatMap((colour, seat) =>
    (state.horses[seat] ?? []).map((progress, horse) => {
      const walking =
        animation.walking?.player === seat && animation.walking.horse === horse
          ? animation.walking.progress
          : progress;
      return { seat, horse, colour: nameOf(colour), at: horsePoint(colour, horse, walking) };
    }),
  );

  /** The horse of the player to move under a point of the screen, if it may move now. */
  function choiceAt(clientX: number, clientY: number): number | null {
    const frame = frameRef.current;
    if (frame === null || choices.length === 0) return null;
    const box = frame.getBoundingClientRect();
    if (box.width === 0) return null;
    const nearest = nearestHorse(
      placed.map((horse) => ({ key: horse, centre: horseCentre(horse.at) })),
      fromScreen(box, clientX, clientY),
      hitRadius(box.width),
    );
    if (nearest?.seat !== player) return null;
    return choices.some((choice) => choice.horse === nearest.horse) ? nearest.horse : null;
  }

  function onBoardClick(event: MouseEvent<HTMLDivElement>) {
    const wasPressed = pressed.current;
    pressed.current = false;
    // Only a press that began on the board: not one that began on the overlay of a throw, nor a
    // pointer the browser cancelled (a scroll). Not by the pointer's id: some browsers give the
    // click of a touch another id than its press.
    if (!wasPressed) return;
    const horse = choiceAt(event.clientX, event.clientY);
    if (horse !== null) choose(horse);
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
  const victim = previewed?.kicked ?? null;
  const ghostAt =
    previewed === null
      ? null
      : horsePoint(state.colours[player] ?? 0, previewed.horse, previewed.to);
  const isChoice = (horse: PlacedHorse) =>
    horse.seat === player && choices.some((choice) => choice.horse === horse.horse);
  // Drawn from the top row down, so a horse in front stands over the one behind it.
  const figures = [...placed].sort((a, b) => a.at.y - b.at.y);

  const board = (
    // The play screen gives the room (`--board-room`); a laptop never needs more than 37.5rem.
    <div data-ply={ply} className="mx-auto w-[min(var(--board-room,100%),37.5rem)]">
      {/* The grid, and room above its top row for the horses standing there (`board-geometry`). A
          touch or a click goes to the horse nearest it. */}
      <div
        ref={frameRef}
        data-ludo-board=""
        className="relative aspect-[15/15.3] w-full touch-manipulation select-none"
        onPointerDown={(event) => {
          pressed.current = event.isPrimary;
        }}
        onPointerCancel={() => {
          pressed.current = false;
        }}
        onClick={onBoardClick}
        onPointerMove={(event) => {
          if (event.pointerType === "mouse") setPreview(choiceAt(event.clientX, event.clientY));
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setPreview(null);
        }}
      >
        {/* Hidden from assistive technology: the list of positions and the choices say it all. */}
        <svg aria-hidden viewBox={VIEW_BOX} className="size-full overflow-visible">
          <defs>
            <clipPath id={clipId}>
              <rect x="0" y="0" width={GRID} height={GRID} rx="0.85" />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            <BoardDrawing
              colours={state.colours}
              active={over ? null : (state.colours[player] ?? null)}
            />
          </g>
          {/* The board's outer frame. */}
          <rect
            x="0.045"
            y="0.045"
            width={GRID - 0.09}
            height={GRID - 0.09}
            rx="0.82"
            fill="none"
            strokeWidth="0.09"
            className="stroke-(--ludo-frame)"
          />
          {ghostAt !== null && <ChoiceTarget at={ghostAt} />}
          {placed.map((horse) => (
            <HorseFloor
              key={`floor-${horse.seat}-${horse.horse}`}
              colour={horse.colour}
              at={horse.at}
              last={
                animation.walking === null &&
                last?.kind === "move" &&
                last.player === horse.seat &&
                last.horse === horse.horse
              }
              kickedMark={justKicked?.player === horse.seat && justKicked.horse === horse.horse}
              movable={isChoice(horse)}
              previewed={isChoice(horse) && previewed?.horse === horse.horse}
              victim={victim?.player === horse.seat && victim.horse === horse.horse}
            />
          ))}
          {figures.map((horse) => (
            <Horse
              key={`${horse.seat}-${horse.horse}`}
              colour={horse.colour}
              horse={horse.horse}
              at={horse.at}
              movable={isChoice(horse)}
              previewed={isChoice(horse) && previewed?.horse === horse.horse}
              last={
                last?.kind === "move" && last.player === horse.seat && last.horse === horse.horse
              }
              kickedNow={
                animation.kicked?.player === horse.seat && animation.kicked.horse === horse.horse
              }
            />
          ))}
          {ghostAt !== null && <Horse colour={toMove} at={ghostAt} ghost />}
          {victim !== null &&
            placed
              .filter((horse) => horse.seat === victim.player && horse.horse === victim.horse)
              .map((horse) => <KickBadge key="kick" at={horse.at} />)}
        </svg>
        {choices.length > 0 && (
          <ChoiceTargets
            label={t("chooseHorse")}
            firstRef={firstChoiceRef}
            choices={choices.map((choice) => ({
              horse: choice.horse,
              label: choice.label,
              centre: horseCentre(
                placed.find((horse) => horse.seat === player && horse.horse === choice.horse)
                  ?.at ?? { x: 0, y: 0 },
              ),
            }))}
            onChoose={choose}
            onPreview={setPreview}
          />
        )}
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
            the die's frame. Pressed and held, it shakes the 3D die; on a phone, a long press never
            scrolls, selects or opens a menu. */}
        <Button
          ref={rollButtonRef}
          size="lg"
          data-ludo-roll=""
          // Which die a press throws: the end-to-end tests' contract.
          data-dice={throwing.threeD ? "3d" : "2d"}
          aria-disabled={!canRoll}
          aria-describedby={rollReason === null ? undefined : rollReasonId}
          {...throwing.buttonProps}
          onFocus={() => {
            setRollReasonAt(ply);
          }}
          onPointerDown={(event) => {
            setRollReasonAt(ply);
            throwing.buttonProps.onPointerDown(event);
          }}
          onBlur={() => {
            setRollReasonAt(null);
          }}
          className={cn(
            ROLL_BUTTON[toMove],
            // A lip below (decorative) that gives way when pressed.
            "shadow-(--ludo-roll-shadow) active:translate-y-0.5 active:shadow-none",
            "touch-none select-none [-webkit-touch-callout:none]",
            throwing.phase === THROW_PHASE.Hold && "translate-y-0.5 shadow-none",
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
        <ThrowOverlay
          phase={throwing.phase}
          stage={throwing.stage}
          colour={toMove}
          holdStartedAt={throwing.holdStartedAt}
          result={throwing.result}
          topFace={throwing.topFace}
          restAt={throwing.restAt}
          fading={throwing.fading}
        />
      </div>

      {/* What the roll means, and the roll before: one block, with no room kept while both are
          empty. */}
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
    </div>
  );

  return layout({ board, controls });
}
