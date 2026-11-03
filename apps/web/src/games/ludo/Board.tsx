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
import { Button, cn } from "@board-games/ui";
import { useTranslations } from "next-intl";
import { memo, type MouseEvent, useEffect, useRef, useState } from "react";

import type { BoardProps } from "../types";
import {
  GRID,
  horsePoint,
  type Point,
  STABLE_SLOTS,
  stableArea,
  stableSlot,
  stepCells,
  TRACK_CELLS,
} from "./board-layout";
import { Dice } from "./Dice";
import { useLudoText } from "./move-label";
import { PIECE_FILL, PIECE_STROKE, PIECE_TINT } from "./piece-style";
import { colourNameOf } from "./player-label";
import { useLudoAnimation } from "./use-ludo-animation";

const ROLL: LudoMove = { type: "roll" };
const ALL_COLOURS = [0, 1, 2, 3] as const satisfies readonly LudoColour[];

function nameOf(colour: LudoColour): LudoColourName {
  return LUDO_COLOUR_NAMES[colour];
}

/**
 * The symbol of a colour, so pieces differ without colour: Red ●, Blue ■, Yellow ▲, Green ◆,
 * centred on `at` with a half-size of `size`.
 */
function ColourSymbol({
  colour,
  at,
  size,
  className,
}: {
  colour: LudoColourName;
  at: Point;
  size: number;
  className: string;
}) {
  const { x, y } = at;
  switch (colour) {
    case "red":
      return <circle cx={x} cy={y} r={size} className={className} />;
    case "blue":
      return (
        <rect
          x={x - size * 0.85}
          y={y - size * 0.85}
          width={size * 1.7}
          height={size * 1.7}
          className={className}
        />
      );
    case "yellow":
      return (
        <polygon
          points={`${x},${y - size} ${x + size},${y + size * 0.8} ${x - size},${y + size * 0.8}`}
          className={className}
        />
      );
    case "green":
      return (
        <polygon
          points={`${x},${y - size} ${x + size},${y} ${x},${y + size} ${x - size},${y}`}
          className={className}
        />
      );
  }
}

/** The board itself, which never changes: track, stables, home entries and home steps. */
const BoardDrawing = memo(function BoardDrawing({
  colours,
}: {
  readonly colours: readonly LudoColour[];
}) {
  return (
    <>
      <rect x="0" y="0" width={GRID} height={GRID} className="fill-surface" />
      {ALL_COLOURS.map((colour) => {
        const name = nameOf(colour);
        const area = stableArea(colour);
        const playing = colours.includes(colour);
        return (
          <g key={`stable-${name}`} className={cn(!playing && "opacity-40")}>
            <rect
              x={area.x}
              y={area.y}
              width={area.size}
              height={area.size}
              rx="0.5"
              strokeWidth="0.08"
              className={cn(PIECE_TINT[name], PIECE_STROKE[name])}
            />
            {STABLE_SLOTS.map((horse) => {
              const slot = stableSlot(colour, horse);
              return (
                <circle
                  key={horse}
                  cx={slot.x}
                  cy={slot.y}
                  r="0.48"
                  fill="none"
                  strokeWidth="0.05"
                  className={PIECE_STROKE[name]}
                />
              );
            })}
            <ColourSymbol
              colour={name}
              at={{ x: area.x + area.size / 2, y: area.y + area.size / 2 }}
              size={0.3}
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
          className="fill-surface stroke-fg-muted/60"
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
              className={cn(PIECE_TINT[name], "stroke-fg-muted/60")}
            />
            <ColourSymbol
              colour={name}
              at={{ x: startCol + 0.5, y: startRow + 0.5 }}
              size={0.16}
              className={cn(PIECE_FILL[name], "opacity-60")}
            />
            {/* The home entry (chân chuồng): a dashed frame and an arrow towards the steps. */}
            <rect
              x={gateCol + 0.14}
              y={gateRow + 0.14}
              width="0.72"
              height="0.72"
              fill="none"
              strokeWidth="0.08"
              strokeDasharray="0.14 0.1"
              className={PIECE_STROKE[name]}
            />
            {stepCells(colour).map(([row, col], index) => (
              <g key={`step-${name}-${index}`}>
                <rect
                  x={col}
                  y={row}
                  width="1"
                  height="1"
                  strokeWidth="0.04"
                  className={cn(PIECE_TINT[name], "stroke-fg-muted/60")}
                />
                <text
                  x={col + 0.5}
                  y={row + 0.55}
                  fontSize="0.42"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-fg-muted"
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
            strokeWidth="0.04"
            className={cn(PIECE_TINT[nameOf(colour)], "stroke-fg-muted/60")}
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

/** A horse: a disc of its colour with the colour's symbol, never told apart by colour alone. */
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
        ghost && "opacity-45",
        kickedNow && "animate-piece-kicked motion-reduce:animate-none",
      )}
    >
      {(last || highlighted) && (
        <circle
          cx={at.x}
          cy={at.y}
          r="0.5"
          fill="none"
          strokeWidth={highlighted ? "0.1" : "0.12"}
          strokeDasharray={highlighted ? "0.18 0.1" : undefined}
          className={highlighted ? "stroke-accent" : "stroke-fg"}
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
      <circle
        cx={at.x}
        cy={at.y}
        r="0.38"
        strokeWidth="0.05"
        className={cn(PIECE_FILL[colour], "stroke-fg/70")}
      />
      <ColourSymbol colour={colour} at={at} size={0.17} className="fill-surface" />
    </g>
  );
}

/**
 * A Cờ cá ngựa board: the cross-shaped track drawn in SVG, the die, a "Roll" button and, after a
 * roll, one button per horse that can move, saying where it goes. Those buttons are the way to play
 * with the keyboard, a screen reader or a finger; the horses on the SVG (hidden from assistive
 * technology, which reads the list of positions instead) can also be clicked. The roll of a person
 * at this device is announced by the board's hint; everything else is told by the play screen's
 * status line, so nothing is read twice.
 */
export function LudoBoard({
  state,
  legalMoves,
  onMove,
  disabled,
  viewer,
}: BoardProps<LudoState, LudoMove, LudoOutcome>) {
  const t = useTranslations("Games.ludo");
  const text = useLudoText();
  const animation = useLudoAnimation(state.last, state.ply);
  const rootRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<number | null>(null);
  /** Set by a roll from this board: the first choice gets the focus once the roll is in. */
  const focusChoiceAfterRoll = useRef(false);

  const player = state.toMove;
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
    rootRef.current?.querySelector<HTMLElement>("[data-ludo-choice]")?.focus();
  }, [ply]);

  function roll() {
    focusChoiceAfterRoll.current = true;
    onMove(ROLL);
  }

  function choose(move: LudoMove) {
    // The choices go away with the move: the focus goes back to the roll button first.
    rootRef.current?.querySelector<HTMLElement>("[data-ludo-roll]")?.focus();
    setPreview(null);
    onMove(move);
  }

  function handleBoardClick(event: MouseEvent<SVGSVGElement>) {
    if (!(event.target instanceof Element)) return;
    const value = event.target.closest<SVGElement>("[data-choice]")?.dataset.choice;
    const choice = choices.find((option) => String(option.horse) === value);
    if (choice !== undefined) choose(choice.move);
  }

  // The die shows the last number rolled, framed in the roller's colour.
  const { last } = state;
  const face = last === null ? null : last.face;
  const roller = last === null ? null : colourNameOf(state, last.player);
  const dieLabel =
    face === null || last === null
      ? t("dieEmpty")
      : t("die", { face, player: text.colour(last.player, state) });

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

  return (
    <div
      ref={rootRef}
      data-ply={ply}
      className="flex w-full max-w-[30rem] flex-col items-center gap-3"
    >
      <div className="aspect-square w-full overflow-hidden rounded-sm border border-fg-muted/60">
        {/* Hidden from assistive technology: the list of positions and the choices say it all. */}
        <svg
          aria-hidden
          viewBox={`0 0 ${GRID} ${GRID}`}
          className="size-full touch-manipulation"
          onClick={handleBoardClick}
        >
          <BoardDrawing colours={state.colours} />
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

      <div className="flex w-full items-center justify-center gap-3">
        <Dice
          face={animation.rollingFace ?? face}
          colour={roller}
          rolling={animation.rollingFace !== null}
          label={dieLabel}
        />
        <Button size="lg" data-ludo-roll="" aria-disabled={!canRoll} onClick={roll}>
          {t("roll")}
        </Button>
      </div>

      {/* Not a status: the play screen's turn line is the one status of the page. Live only for
          a roll made here; the others are told by that status line. */}
      <div data-ludo-hint="" className="min-h-5 text-center text-sm text-fg-muted">
        <p aria-live="polite">{here ? hint : ""}</p>
        {!here && hint !== "" && <p>{hint}</p>}
      </div>

      {choices.length > 0 && (
        <div role="group" aria-label={t("chooseHorse")} className="flex w-full flex-col gap-2">
          {choices.map((choice) => (
            <Button
              key={choice.horse}
              variant="secondary"
              size="lg"
              data-ludo-choice=""
              className="min-h-11 justify-start text-left"
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
              {choice.label}
            </Button>
          ))}
        </div>
      )}

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
}

/** The square a previewed choice goes to. */
function ChoiceTarget({ at }: { at: Point }) {
  return (
    <rect
      data-target=""
      x={at.x - 0.5}
      y={at.y - 0.5}
      width="1"
      height="1"
      fill="none"
      strokeWidth="0.12"
      className="stroke-accent"
    />
  );
}
