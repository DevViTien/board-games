import { GAME_CATEGORY } from "../constants";
import { createRng } from "../rng";
import type { GameDefinition, GameResult, PlayerIndex, Rng } from "../types";

// A game whose whole tree is generated up front from a seed: 2–4 players, any player to move at
// any node (the same one twice in a row too), random moves with 1–3 weighted outcomes, draws,
// shared wins, and small evaluations so that ties are common. The state is the current node, the
// move and the outcome are indexes. Used to check the AI's search against a plain reference.

export type TreeNode =
  | { readonly kind: "end"; readonly result: GameResult }
  | {
      readonly kind: "turn";
      readonly player: PlayerIndex;
      /** `evaluate` for each seat. */
      readonly scores: readonly number[];
      readonly moves: readonly TreeMove[];
    };

export interface TreeMove {
  /** A random move has one child per outcome; any other move exactly one child. */
  readonly random: boolean;
  readonly children: readonly { readonly weight: number; readonly node: TreeNode }[];
}

function randomResult(rng: Rng, players: number): GameResult {
  const roll = rng.nextInt(0, 3);
  if (roll === 0) return { kind: "draw" };
  const winners = Array.from({ length: players }, (_unused, seat) => seat).filter(
    () => rng.nextInt(0, 1) === 1,
  );
  // roll 1: a single winner; otherwise any non-empty group of winners.
  const single = roll === 1 || winners.length === 0;
  return { kind: "win", winners: single ? [rng.nextInt(0, players - 1)] : winners };
}

function randomNode(rng: Rng, players: number, height: number, isRoot: boolean): TreeNode {
  if (height === 0 || (!isRoot && rng.nextInt(0, 4) === 0)) {
    return { kind: "end", result: randomResult(rng, players) };
  }
  return {
    kind: "turn",
    player: rng.nextInt(0, players - 1),
    scores: Array.from({ length: players }, () => rng.nextInt(-3, 3)),
    moves: Array.from({ length: rng.nextInt(1, 3) }, () => {
      const random = rng.nextInt(0, 2) === 0;
      return {
        random,
        children: Array.from({ length: random ? rng.nextInt(1, 3) : 1 }, () => ({
          weight: random ? rng.nextInt(1, 3) : 1,
          node: randomNode(rng, players, height - 1, false),
        })),
      };
    }),
  };
}

/** A tree of at most `height` moves from a root where someone is to move. */
export function randomTree(seed: number, players: number, height: number): TreeNode {
  return randomNode(createRng(seed), players, Math.max(1, height), true);
}

function moveAt(node: TreeNode, move: number): TreeMove {
  const picked = node.kind === "turn" ? node.moves[move] : undefined;
  if (picked === undefined) throw new Error(`No move ${move} here`);
  return picked;
}

export const treeGame = {
  id: "tree",
  meta: {
    players: { min: 2, max: 4 },
    category: GAME_CATEGORY.Original,
    durationMinutes: 1,
    supportsAI: true,
  },
  defaultOptions: {},
  setup: ({ playerCount }): TreeNode => randomTree(playerCount, playerCount, 4),
  currentPlayer: (node) => (node.kind === "turn" ? node.player : 0),
  legalMoves: (node) => (node.kind === "turn" ? node.moves.map((_move, index) => index) : []),
  outcomes: (node, move) => {
    const { random, children } = moveAt(node, move);
    return random ? children.map((child, outcome) => ({ outcome, weight: child.weight })) : [];
  },
  applyMove: (node, move, outcome?: number) => {
    const child = moveAt(node, move).children[outcome ?? 0];
    if (child === undefined) throw new Error(`No outcome ${outcome} for move ${move}`);
    return child.node;
  },
  result: (node) => (node.kind === "end" ? node.result : null),
  evaluate: (node, player) => (node.kind === "turn" ? (node.scores[player] ?? 0) : 0),
} as const satisfies GameDefinition<TreeNode, number, number>;
