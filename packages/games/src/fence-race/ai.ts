import type { PlayerIndex } from "@board-games/engine";

import {
  distancesWithFence,
  type EdgeTable,
  edgeTable,
  type Fence,
  fenceInTheWay,
  openSteps,
  searchWay,
  setFence,
  type WaysOnEdges,
  waysOnEdges,
} from "./board";
import type { FenceRaceMove, FenceRaceState } from "./rules";

// The AI's view of a position, and of the moves worth looking at (design §3). Tune them here.

/** A step on the way counts this much: all else only tips the balance between equal races. */
const STEP_WORTH = 100;
/**
 * A fence kept. With two players, one's against the other's: below a step, so a fence that adds a
 * step is worth placing, and high enough that a deep search does not spend them all early to deny
 * the last fence it sees the opponent place (design §3). With more, only one's own, and little: the
 * search counts every other seat as one opponent, and looking further does not help it there.
 */
const FENCE_WORTH_TWO = 40;
const FENCE_WORTH_MANY = 5;
/** The break kept. */
const BREAK_WORTH = 10;
/**
 * An opponent one step from their gate. A search of depth 2 sees only the next seat's answer, so
 * this is what makes it block the seats after that one.
 */
const THREAT_PENALTY = 400;

/** How many moves the search looks at besides the fences it may not leave out. */
const CANDIDATE_LIMIT = 20;
/** A break is looked at if it shortens the player's own way by at least this. */
const BREAK_MIN_GAIN = 2;
const BREAK_CHOICES = 3;

/** Weights of a fence's order among the candidates: steps it adds to whom. */
const NEAREST_WEIGHT = 2;
const SELF_WEIGHT = 2;

/**
 * How good `state` looks for `player`: how far ahead of the nearest opponent they are, then the
 * fences and the break they have left; an opponent about to arrive costs most. An integer.
 */
export function fenceRaceEvaluate(state: FenceRaceState, player: PlayerIndex): number {
  const table = edgeTable(state);
  const two = state.pawns.length === 2;
  // A break as the last move searched has no answer yet, and the opponent can put the fence back:
  // counted as won, the search keeps putting the break off to its last move, which only looks ahead
  // to it for as long as it holds the break (design §3).
  if (two && state.lastBroken !== null && (state.fencesLeft[state.toMove] ?? 0) > 0) {
    setFence(table, state.columns, state.lastBroken, 1);
  }
  let own = 0;
  let nearest = Number.POSITIVE_INFINITY;
  let threats = 0;
  for (let seat = 0; seat < state.pawns.length; seat += 1) {
    const { distance } = searchWay(table, state, seat);
    if (seat === player) {
      own = distance;
    } else {
      nearest = Math.min(nearest, distance);
      if (distance <= 1) threats += 1;
    }
  }
  const fences = state.fencesLeft[player] ?? 0;
  const fenceWorth = two
    ? FENCE_WORTH_TWO * (fences - (state.fencesLeft[1 - player] ?? 0))
    : FENCE_WORTH_MANY * fences;
  return (
    STEP_WORTH * (nearest - own) +
    fenceWorth +
    BREAK_WORTH * (state.breaksLeft[player] ?? 0) -
    THREAT_PENALTY * threats
  );
}

/** The steps that shorten the way, the one that reaches the gate first: never empty. */
function shorteningSteps(
  table: EdgeTable,
  state: FenceRaceState,
  distance: number,
): readonly FenceRaceMove[] {
  const mover = state.toMove;
  const pawns = [...state.pawns];
  return openSteps(table, state, mover).flatMap((cell) => {
    pawns[mover] = cell;
    return searchWay(table, { ...state, pawns }, mover).distance < distance
      ? [{ kind: "step" as const, ...cell }]
      : [];
  });
}

interface ScoredMove {
  readonly move: FenceRaceMove;
  readonly score: number;
}

function byScore(a: ScoredMove, b: ScoredMove): number {
  return b.score - a.score;
}

/** The two fences that could close an edge (`edgesOfWay`). */
function fencesOnEdge(edge: number, columns: number): readonly [Fence, Fence] {
  const cell = edge >> 1;
  const col = cell % columns;
  const row = (cell - col) / columns;
  return edge % 2 === 0
    ? [
        { row, col, dir: "h" },
        { row, col: col - 1, dir: "h" },
      ]
    : [
        { row, col, dir: "v" },
        { row: row - 1, col, dir: "v" },
      ];
}

/**
 * The fences across the ways of the opponents: all that stop someone arriving next move, and the
 * rest in the order of the steps they add, whom they hurt most. Fences that hurt the player count
 * less, and a fence off every way adds nothing, so it is not looked at.
 */
function blockingFences(
  table: EdgeTable,
  state: FenceRaceState,
  ways: WaysOnEdges,
  room: number,
): readonly FenceRaceMove[] {
  const { rows, columns, toMove: mover } = state;
  const { seatsOnEdge, distances } = ways;
  const others = distances.filter((_distance, seat) => seat !== mover);
  const nearest = Math.min(...others);
  const forced: ScoredMove[] = [];
  const rest: ScoredMove[] = [];
  const seen = new Set<number>();
  for (let edge = 0; edge < seatsOnEdge.length; edge += 1) {
    if (((seatsOnEdge[edge] ?? 0) & ~(1 << mover)) === 0) continue;
    for (const fence of fencesOnEdge(edge, columns)) {
      const { row, col, dir } = fence;
      if (row < 0 || col < 0 || row > rows - 2 || col > columns - 2) continue;
      const key = 2 * (row * columns + col) + (dir === "h" ? 0 : 1);
      if (seen.has(key)) continue;
      seen.add(key);
      if (fenceInTheWay(state.fences, fence) !== null) continue;
      const after = distancesWithFence(table, state, ways, fence);
      if (after === null) continue;
      let added = 0;
      let nearestAfter = Number.POSITIVE_INFINITY;
      let stops = false;
      for (let seat = 0; seat < after.length; seat += 1) {
        if (seat === mover) continue;
        const distance = after[seat] ?? 0;
        const before = distances[seat] ?? 0;
        added += distance - before;
        nearestAfter = Math.min(nearestAfter, distance);
        if (before === 1 && distance > 1) stops = true;
      }
      const hurt = (after[mover] ?? 0) - (distances[mover] ?? 0);
      const score = added + NEAREST_WEIGHT * (nearestAfter - nearest) - SELF_WEIGHT * hurt;
      (stops ? forced : rest).push({ move: { kind: "fence", ...fence }, score });
    }
  }
  forced.sort(byScore);
  rest.sort(byScore);
  return [...forced, ...rest.slice(0, Math.max(0, room - forced.length))].map(({ move }) => move);
}

/** The breaks that shorten the player's own way most. */
function usefulBreaks(
  table: EdgeTable,
  state: FenceRaceState,
  distance: number,
): readonly FenceRaceMove[] {
  if ((state.breaksLeft[state.toMove] ?? 0) <= 0) return [];
  const breaks: ScoredMove[] = [];
  for (const fence of state.fences) {
    setFence(table, state.columns, fence, 0);
    const gain = distance - searchWay(table, state, state.toMove).distance;
    setFence(table, state.columns, fence, 1);
    if (gain >= BREAK_MIN_GAIN) breaks.push({ move: { kind: "break", ...fence }, score: gain });
  }
  return breaks
    .sort(byScore)
    .slice(0, BREAK_CHOICES)
    .map(({ move }) => move);
}

/**
 * The moves the AI looks at, best first: a step only along a shortest way, so it never goes back and
 * forth (and the one reaching the gate is among them); fences across the opponents' ways, every one
 * that stops somebody about to arrive; breaks that shorten its own way by two steps or more.
 */
export function fenceRaceCandidateMoves(state: FenceRaceState): readonly FenceRaceMove[] {
  if (state.result !== null) return [];
  const table = edgeTable(state);
  const ways = waysOnEdges(table, state);
  const distance = ways.distances[state.toMove] ?? 0;
  const steps = shorteningSteps(table, state, distance);
  const breaks = usefulBreaks(table, state, distance);
  const fences =
    (state.fencesLeft[state.toMove] ?? 0) > 0
      ? blockingFences(table, state, ways, CANDIDATE_LIMIT - steps.length - breaks.length)
      : [];
  return [...steps, ...fences, ...breaks];
}
