import type { LudoColourName } from "@board-games/games/ludo";
import { cn } from "@board-games/ui";

import type { Point } from "./board-layout";
import { ColourSymbol } from "./ColourSymbol";
import { PIECE_FILL, PIECE_INK_FILL, PIECE_LINE_STROKE } from "./piece-style";

// A horse of Cờ cá ngựa (design of redesign-ludo-play §6): an original standing piece, a horse's
// head and neck on a drum-shaped base, the colour's symbol big on the front of the base in the
// colour's ink, so horses never differ by colour alone. Drawn in local units (92 wide, the base's
// bottom at y = 0, the ear's tip at y = -126), scaled onto the board's cells.

/** Board cells per local unit: the figure is about 1.1 cells high, its symbol about 0.28 cells. */
const PIECE_SCALE = 0.0088;
/** The base's bottom below the centre of its square, in cells. */
const BASE_DROP = 0.44;
/** How far a previewed horse is lifted, in cells: as high as a bob goes, inside the room above. */
const PREVIEW_LIFT = 0.1;
/** The floor marks: an ellipse under the base, in cells. */
const FLOOR_DROP = 0.33;

/** The figure itself, in local units, its outline in the edge colour. */
function Figure({ colour, ghost }: { colour: LudoColourName; ghost: boolean }) {
  const body = ghost
    ? cn("fill-game-board/45", PIECE_LINE_STROKE[colour])
    : cn(PIECE_FILL[colour], "stroke-piece-edge");
  const dash = ghost ? "16 9" : undefined;
  return (
    <>
      <path
        d="M-46 -52V-8A46 8 0 0 0 46 -8V-52Z"
        strokeWidth={ghost ? 7 : 6}
        strokeLinejoin="round"
        strokeDasharray={dash}
        className={body}
      />
      <ellipse
        cx="0"
        cy="-52"
        rx="46"
        ry="8"
        strokeWidth={ghost ? 5 : 6}
        strokeLinejoin="round"
        strokeDasharray={dash}
        className={ghost ? cn("fill-none", PIECE_LINE_STROKE[colour]) : body}
      />
      <path
        d="M22 -54C27 -70 29 -88 20 -102L23 -126L7 -111C-5 -112 -19 -104 -31 -90C-39 -82 -44 -73 -39 -68C-34 -64 -24 -66 -16 -70C-10 -73 -5 -70 -8 -64C-12 -60 -18 -57 -22 -54Z"
        strokeWidth={ghost ? 7 : 6}
        strokeLinejoin="round"
        strokeDasharray={dash}
        className={body}
      />
      {!ghost && (
        <>
          <path
            d="M12 -99C20 -86 21 -72 15 -60"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            className="stroke-piece-edge opacity-75"
          />
          <circle cx="-9" cy="-95" r="5.5" className="fill-piece-edge" />
          <circle cx="-35" cy="-76" r="3" className="fill-piece-edge" />
          <ellipse
            cx="0"
            cy="-55"
            rx="27"
            ry="6"
            strokeWidth="6"
            strokeLinejoin="round"
            className={body}
          />
        </>
      )}
      <g data-symbol="">
        <ColourSymbol
          colour={colour}
          at={{ x: 0, y: -23 }}
          size={16}
          className={ghost ? PIECE_FILL[colour] : PIECE_INK_FILL[colour]}
        />
      </g>
    </>
  );
}

interface HorseProps {
  readonly colour: LudoColourName;
  /** Its number in its stable (from 0), for tests; none for a ghost. */
  readonly horse?: number;
  /** The centre of its square. */
  readonly at: Point;
  /** It may be chosen now: it bobs (its rings are `HorseFloor`'s). */
  readonly movable?: boolean;
  /** The choice previewed (pointed at, focused): lifted, still. */
  readonly previewed?: boolean;
  /** Where a previewed choice would go: a dashed outline. */
  readonly ghost?: boolean;
  /** Just kicked: fading into its stable. */
  readonly kickedNow?: boolean;
  /** Just moved. */
  readonly last?: boolean;
}

/** A horse standing on its square. */
export function Horse({
  colour,
  horse,
  at,
  movable = false,
  previewed = false,
  ghost = false,
  kickedNow = false,
  last = false,
}: HorseProps) {
  return (
    <g
      data-colour={colour}
      data-horse={horse}
      data-movable={movable || undefined}
      data-highlighted={previewed || undefined}
      data-ghost={ghost || undefined}
      data-last={last || undefined}
      // The centre of its square, in the board's units (tests, and taps in end-to-end tests).
      data-at={`${at.x},${at.y}`}
      transform={`translate(${at.x} ${at.y + BASE_DROP})`}
    >
      {/* A soft shadow under the base (decorative). */}
      {!ghost && <ellipse cx="0.04" cy="-0.03" rx="0.46" ry="0.12" className="fill-game-line/45" />}
      <g
        className={cn(
          kickedNow &&
            "origin-center animate-piece-kicked transform-fill motion-reduce:animate-none",
        )}
      >
        <g className={cn(movable && !previewed && "animate-piece-bob motion-reduce:animate-none")}>
          <g transform={`translate(0 ${previewed ? -PREVIEW_LIFT : 0}) scale(${PIECE_SCALE})`}>
            <Figure colour={colour} ghost={ghost} />
          </g>
        </g>
      </g>
    </g>
  );
}

interface HorseFloorProps {
  readonly colour: LudoColourName;
  readonly at: Point;
  readonly last?: boolean;
  readonly kickedMark?: boolean;
  readonly movable?: boolean;
  readonly previewed?: boolean;
  /** The horse the previewed choice would kick. */
  readonly victim?: boolean;
}

/**
 * The marks on the floor around a horse's base, drawn under every horse: the horse just moved
 * (a ring of ink dots), the one just kicked (dashed), one that may move (a ring of ink, thicker
 * when previewed, with a halo of its colour: not by colour alone), one a choice would kick.
 */
export function HorseFloor({
  colour,
  at,
  last = false,
  kickedMark = false,
  movable = false,
  previewed = false,
  victim = false,
}: HorseFloorProps) {
  const cx = at.x;
  const cy = at.y + FLOOR_DROP;
  return (
    <g data-floor="">
      {last && (
        <ellipse
          cx={cx}
          cy={cy}
          rx="0.56"
          ry="0.24"
          fill="none"
          strokeWidth="0.09"
          strokeLinecap="round"
          strokeDasharray="0.001 0.14"
          className="stroke-game-last-move"
        />
      )}
      {kickedMark && (
        <ellipse
          cx={cx}
          cy={cy}
          rx="0.56"
          ry="0.24"
          fill="none"
          strokeWidth="0.06"
          strokeDasharray="0.1 0.1"
          className="stroke-fg-muted"
        />
      )}
      {movable && (
        <>
          <ellipse
            cx={cx}
            cy={cy}
            rx="0.6"
            ry="0.26"
            fill="none"
            strokeWidth="0.22"
            className={cn(PIECE_LINE_STROKE[colour], "opacity-45")}
          />
          <ellipse
            data-ring=""
            cx={cx}
            cy={cy}
            rx="0.58"
            ry="0.24"
            fill="none"
            strokeWidth={previewed ? 0.13 : 0.085}
            className="stroke-game-highlight"
          />
        </>
      )}
      {victim && (
        <ellipse
          cx={cx}
          cy={cy}
          rx="0.62"
          ry="0.27"
          fill="none"
          strokeWidth="0.07"
          strokeDasharray="0.12 0.09"
          className="stroke-game-highlight"
        />
      )}
    </g>
  );
}

/** Over the horse a previewed choice would kick: a small ink badge with a cross. */
export function KickBadge({ at }: { at: Point }) {
  const x = at.x + 0.42;
  const y = at.y - 0.62;
  return (
    <g data-kick-badge="">
      <circle cx={x} cy={y} r="0.22" strokeWidth="0.05" className="fill-fg stroke-game-board" />
      <path
        d={`M${x - 0.08} ${y - 0.08}L${x + 0.08} ${y + 0.08}M${x + 0.08} ${y - 0.08}L${x - 0.08} ${y + 0.08}`}
        fill="none"
        strokeWidth="0.07"
        strokeLinecap="round"
        className="stroke-game-board"
      />
    </g>
  );
}

/** The square a previewed choice goes to: a thick dashed frame of ink. */
export function ChoiceTarget({ at }: { at: Point }) {
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
