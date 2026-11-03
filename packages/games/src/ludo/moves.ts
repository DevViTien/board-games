import type { PlayerIndex } from "@board-games/engine";

import { HORSES, IN_STABLE, LAST_STEP, OWN_GATE, TRACK_LENGTH, WINNING_STEP } from "./constants";
import type { LudoState } from "./rules";
import { cellOf, nextGate, progressOfStep } from "./track";

// Where a horse goes for a roll (design §4), as pure functions of the state.

/** A horse on the shared track: its seat and its number (0–3). */
export interface LudoHorseRef {
  readonly player: PlayerIndex;
  readonly horse: number;
}

/** The horse on each track cell (`null`: empty), built once per question. */
export type TrackOccupancy = readonly (LudoHorseRef | null)[];

export function trackOccupancy(state: LudoState): TrackOccupancy {
  const cells: (LudoHorseRef | null)[] = Array.from({ length: TRACK_LENGTH }, () => null);
  state.horses.forEach((horses, player) => {
    const colour = state.colours[player];
    if (colour === undefined) return;
    horses.forEach((progress, horse) => {
      if (progress >= 0 && progress <= OWN_GATE)
        cells[cellOf(colour, progress)] = { player, horse };
    });
  });
  return cells;
}

/**
 * The progress a horse reaches with `face`, or `null` when it cannot move:
 * 1. in the stable: only on an exit roll, to its start cell, unless one of its own horses is there;
 * 2. on the track before its own gate: with a 1 (and the jump rule), to the next gate when every
 *    cell between is empty and the gate holds none of its own horses; otherwise `face` cells
 *    ahead, never past its own gate, nor past any horse (unless passing is allowed), nor onto one
 *    of its own;
 * 3. on its own gate: to home step `face`, every lower step empty (unless passing is allowed) and
 *    that step empty;
 * 4. on home step n: to step n + 1 with exactly n + 1, that step empty; step 6 is final.
 */
export function targetOf(
  state: LudoState,
  player: PlayerIndex,
  horse: number,
  face: number,
  occupancy: TrackOccupancy = trackOccupancy(state),
): number | null {
  const colour = state.colours[player];
  const own = state.horses[player];
  if (colour === undefined || own === undefined) return null;
  const progress = own[horse];
  if (progress === undefined) return null;
  const { options } = state;
  const at = (target: number) => occupancy[cellOf(colour, target)] ?? null;
  const ownAt = (target: number) => at(target)?.player === player;
  const clearBetween = (from: number, to: number) => {
    for (let cell = from + 1; cell < to; cell += 1) if (at(cell) !== null) return false;
    return true;
  };
  const stepTaken = (step: number) => own.includes(progressOfStep(step));

  if (progress === IN_STABLE) {
    const exits = face === 6 || (face === 1 && options.exitRoll === "one-or-six");
    return exits && !ownAt(0) ? 0 : null;
  }
  if (progress < OWN_GATE) {
    if (face === 1 && options.oneJump) {
      const gate = nextGate(progress);
      // The jump always needs a clear way, whatever the passing rule.
      if (clearBetween(progress, gate) && !ownAt(gate)) return gate;
    }
    const target = progress + face;
    if (target > OWN_GATE) return null;
    if (options.passing === "blocked" && !clearBetween(progress, target)) return null;
    return ownAt(target) ? null : target;
  }
  if (progress === OWN_GATE) {
    if (stepTaken(face)) return null;
    if (options.passing === "blocked") {
      for (let step = 1; step < face; step += 1) if (stepTaken(step)) return null;
    }
    return progressOfStep(face);
  }
  if (progress >= LAST_STEP) return null;
  const step = progress - OWN_GATE;
  return face === step + 1 && !stepTaken(step + 1) ? progress + 1 : null;
}

/** The opponent's horse kicked back to its stable by `player` landing on `target`, if any. */
export function kickedAt(
  state: LudoState,
  player: PlayerIndex,
  target: number,
  occupancy: TrackOccupancy = trackOccupancy(state),
): LudoHorseRef | null {
  const colour = state.colours[player];
  if (colour === undefined || target < 0 || target > OWN_GATE) return null;
  const there = occupancy[cellOf(colour, target)] ?? null;
  return there !== null && there.player !== player ? there : null;
}

/** The horses of `player` that can move with `face`, in order. */
export function movableHorses(state: LudoState, player: PlayerIndex, face: number): number[] {
  const occupancy = trackOccupancy(state);
  const horses: number[] = [];
  for (let horse = 0; horse < HORSES; horse += 1) {
    if (targetOf(state, player, horse, face, occupancy) !== null) horses.push(horse);
  }
  return horses;
}

/** Whether `player`'s four horses are all on steps 3–6 (they never share a step). */
export function hasWon(horses: readonly number[]): boolean {
  return horses.every((progress) => progress >= progressOfStep(WINNING_STEP));
}
