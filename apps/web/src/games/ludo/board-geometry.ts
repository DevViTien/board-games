import { GRID, type Point } from "./board-layout";

// The board's SVG and the elements laid over it share one frame (design of redesign-ludo-play §5,
// §6): the 15 × 15 grid of `board-layout.ts`, with room above the top row for its standing horses.
// One transform from the board's units to the frame's percentages serves the SVG (`viewBox`) and
// the hit targets laid over it, so they never drift apart.

/** Room above the top row, in cells, so a horse standing there (and bobbing) is never cut. */
export const VIEW_TOP = -0.3;
/** The height the SVG shows, in cells. */
export const VIEW_HEIGHT = GRID - VIEW_TOP;
/** The SVG's `viewBox`: the grid and the room above it. The frame has the same proportions. */
export const VIEW_BOX = `0 ${VIEW_TOP} ${GRID} ${VIEW_HEIGHT}`;

/**
 * How far a horse's figure rises above the centre of its square (its head stands up from a base on
 * the square), in cells: where it reads as being, for a touch or a hit target.
 */
export const HORSE_RISE = 0.3;

/** A hit target's side, in cells, and at least this many CSS pixels. */
export const HIT_CELLS = 1.36;
const HIT_MIN_PX = 24;

/** A point of the board as a position in its frame: percent of the frame's width and height. */
export function toFramePercent(point: Point): { readonly left: number; readonly top: number } {
  return {
    left: (point.x / GRID) * 100,
    top: ((point.y - VIEW_TOP) / VIEW_HEIGHT) * 100,
  };
}

/** The frame's box on screen, as `getBoundingClientRect` gives it. */
interface FrameBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** The point of the board under a point of the screen, inside a frame laid out at `box`. */
export function fromScreen(box: FrameBox, clientX: number, clientY: number): Point {
  return {
    x: ((clientX - box.left) / box.width) * GRID,
    y: ((clientY - box.top) / box.height) * VIEW_HEIGHT + VIEW_TOP,
  };
}

/** The visual centre of a horse standing on `point` (the centre of its square). */
export function horseCentre(point: Point): Point {
  return { x: point.x, y: point.y - HORSE_RISE };
}

/** A hit target's radius, in cells, for a frame `frameWidth` CSS pixels wide. */
export function hitRadius(frameWidth: number): number {
  const cell = frameWidth / GRID;
  return Math.max(HIT_CELLS, cell > 0 ? HIT_MIN_PX / cell : HIT_CELLS) / 2;
}

/**
 * Of the horses given (by their visual centres), the one nearest `point` within `radius`, or `null`.
 * Every horse counts, not only those that may move: a touch on a horse that cannot move never
 * slips onto the one beside it.
 */
export function nearestHorse<Key>(
  horses: readonly { readonly key: Key; readonly centre: Point }[],
  point: Point,
  radius: number,
): Key | null {
  let best: Key | null = null;
  let bestDistance = radius;
  for (const { key, centre } of horses) {
    const distance = Math.hypot(centre.x - point.x, centre.y - point.y);
    if (distance <= bestDistance) {
      bestDistance = distance;
      best = key;
    }
  }
  return best;
}
