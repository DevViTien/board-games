import type { PlayerIndex } from "@board-games/engine";

import { IN_STABLE, LUDO_COLOUR, OWN_GATE, TRACK_LENGTH } from "./constants";
import { type TrackOccupancy, trackOccupancy } from "./moves";
import type { LudoState } from "./rules";
import { cellOf, isOnGate, progressAt, startCell } from "./track";

// The AI's view of a position (design §6). The order of idea.md §3.1 (kick > climb home > bring a
// horse out > stay safe > advance) comes out of these weights; tune them here after playing.

/** A horse on the track is worth this plus its progress, so bringing one out is worth something. */
const ON_TRACK_BONUS = 20;
/** Extra worth of a horse on its own gate, ready to climb. */
const OWN_GATE_BONUS = 10;
/**
 * Home steps 1 and 2 are worth only a little more than the gate: a horse there blocks the others
 * from climbing (G8) and does not count for a win.
 */
const LOW_STEP_VALUES = [90, 95] as const;
/** Steps 3–6 count for a win: worth `HIGH_STEP_BASE + HIGH_STEP_EACH × step`. */
const HIGH_STEP_BASE = 150;
const HIGH_STEP_EACH = 10;
/**
 * Every horse a player has sent back to its stable is worth this to them, counted in their own
 * score so that it does not shrink with the number of players (the others' losses are averaged):
 * a kick then always outweighs climbing home (at most 125) and bringing a horse out (20).
 */
const KICK_BONUS = 130;
/** A die has six faces: a horse kicked by `n` of them loses `n / 6` of its worth. */
const FACES = 6;
/** Farthest an opponent's horse can be and still reach a gate with a 1 (one segment). */
const JUMP_REACH = 14;
/** Farthest an opponent's horse can be and reach a horse with a plain roll. */
const ROLL_REACH = 6;

/** Worth of one horse at `progress`, before any danger. */
function horseWorth(progress: number): number {
  if (progress === IN_STABLE) return 0;
  if (progress < OWN_GATE) return ON_TRACK_BONUS + progress;
  if (progress === OWN_GATE) return ON_TRACK_BONUS + progress + OWN_GATE_BONUS;
  const step = progress - OWN_GATE;
  const low = LOW_STEP_VALUES[step - 1];
  return low ?? HIGH_STEP_BASE + HIGH_STEP_EACH * step;
}

/**
 * How many die faces let an opponent kick `player`'s horse on track cell `cell` on their next turn
 * (at most 6): (a) an opponent's horse 1–6 cells behind with an empty way; (b) on a gate, an
 * opponent's horse up to 14 cells behind with an empty way, jumping with a 1; (c) on the start cell
 * of an opponent who still has a horse in the stable, brought out with a 6.
 */
function waysToBeKicked(
  state: LudoState,
  occupancy: TrackOccupancy,
  player: PlayerIndex,
  cell: number,
): number {
  let ways = 0;
  // The gates are the same cells whoever looks at them.
  const onGate = isOnGate(progressAt(LUDO_COLOUR.Red, cell));
  for (let distance = 1; distance <= JUMP_REACH; distance += 1) {
    const from = (cell - distance + TRACK_LENGTH) % TRACK_LENGTH;
    const there = occupancy[from] ?? null;
    if (there === null) continue;
    // The first horse behind blocks the way of every horse farther back; it cannot go past its
    // own gate either.
    const colour = state.colours[there.player];
    if (
      there.player !== player &&
      colour !== undefined &&
      progressAt(colour, from) + distance <= OWN_GATE
    ) {
      if (distance <= ROLL_REACH) ways += 1;
      // A 1 jumps onto a gate; at distance 1 that face is already counted.
      if (distance > 1 && onGate && state.options.oneJump) ways += 1;
    }
    break;
  }
  state.colours.forEach((colour, seat) => {
    if (seat === player || startCell(colour) !== cell) return;
    if (state.horses[seat]?.includes(IN_STABLE) === true) ways += 1;
  });
  return Math.min(ways, FACES);
}

/** A player's total: the worth of their horses, less what each horse on the track risks. */
function playerScore(state: LudoState, occupancy: TrackOccupancy, player: PlayerIndex): number {
  const colour = state.colours[player];
  const horses = state.horses[player];
  if (colour === undefined || horses === undefined) return 0;
  let total = KICK_BONUS * (state.kicks[player] ?? 0);
  for (const progress of horses) {
    const worth = horseWorth(progress);
    if (progress < 0 || progress > OWN_GATE) {
      total += worth;
      continue;
    }
    const ways = waysToBeKicked(state, occupancy, player, cellOf(colour, progress));
    total += worth - (worth * ways) / FACES;
  }
  return total;
}

/**
 * How good `state` looks for `player`: their score less the mean score of the other players. The
 * mean, not the leader's score, so that kicking a horse of a player who is not leading still pays
 * with 3–4 players. An integer, far below 10^6 in absolute value.
 */
export function ludoEvaluate(state: LudoState, player: PlayerIndex): number {
  const occupancy = trackOccupancy(state);
  // Each score rounded first, so two players' views are exact opposites.
  const scores = state.colours.map((_colour, seat) =>
    Math.round(playerScore(state, occupancy, seat)),
  );
  const own = scores[player] ?? 0;
  const others = scores.filter((_score, seat) => seat !== player);
  const mean =
    others.length === 0 ? 0 : others.reduce((sum, score) => sum + score, 0) / others.length;
  // `|| 0` turns −0 into 0: a level position is level for everyone.
  return Math.round(own - mean) || 0;
}
