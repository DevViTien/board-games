import { GATE_PROGRESS, type LudoColour, OWN_GATE, SEGMENT, TRACK_LENGTH } from "./constants";

// The geometry of the track (design §1): cells are numbered 0…55 in the direction of play, colour
// `c` starts on cell `14c`, and a horse's position is its progress from its own start cell.

/** The track cell a colour's horses start from. */
export function startCell(colour: LudoColour): number {
  return colour * SEGMENT;
}

/** The track cell of a colour's gate (chân chuồng): the cell just before its start cell. */
export function gateCell(colour: LudoColour): number {
  return (colour * SEGMENT + OWN_GATE) % TRACK_LENGTH;
}

/** The progress of home step `step` (1–6). */
export function progressOfStep(step: number): number {
  return OWN_GATE + step;
}

/** The track cell of a horse of `colour` at `progress` (0…55). */
export function cellOf(colour: LudoColour, progress: number): number {
  return (colour * SEGMENT + progress) % TRACK_LENGTH;
}

/** The progress (0…55) at which a horse of `colour` stands on track cell `cell`. */
export function progressAt(colour: LudoColour, cell: number): number {
  return (((cell - colour * SEGMENT) % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;
}

/**
 * The next gate ahead of a horse at `progress` (0…54): the smallest gate progress above it. A horse
 * standing on a gate jumps to the one after it (G4); the farthest is always its own gate (G3).
 */
export function nextGate(progress: number): number {
  return GATE_PROGRESS.find((gate) => gate > progress) ?? OWN_GATE;
}

/** Whether a horse at `progress` stands on one of the four gates (any colour's). */
export function isOnGate(progress: number): boolean {
  return GATE_PROGRESS.some((gate) => gate === progress);
}
