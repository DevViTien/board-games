import { describe, expect, it } from "vitest";

import { createRng } from "../rng";
import { choiceGame, type ChoiceState } from "../test-fixtures/choice-game";
import { lineGame, type LineMove, linePosition, type LineState } from "../test-fixtures/line-game";
import { randomTree, treeGame, type TreeMove, type TreeNode } from "../test-fixtures/tree-game";
import { deepFreeze } from "../testing/deep-freeze";
import type { PlayerIndex } from "../types";
import { clampEvaluation, EVAL_LIMIT, resultScore, TIE_EPSILON, WIN } from "./score";
import { searchMoves, searchRoot } from "./search";

function lineContext(seat: PlayerIndex, evaluate = lineGame.evaluate) {
  return { game: lineGame, evaluate, seat };
}

function search(state: LineState, depth: number) {
  return searchRoot(
    lineContext(lineGame.currentPlayer(state)),
    state,
    depth,
    searchMoves(lineGame, state),
  );
}

/** Plain minimax without pruning, as the reference the pruned search must agree with. */
function minimax(state: LineState, depth: number, seat: PlayerIndex, ply: number): number {
  const result = lineGame.result(state);
  if (result !== null) return resultScore(result, seat, ply);
  if (depth === 0) return clampEvaluation(lineGame.evaluate(state, seat));
  const scores = lineGame
    .legalMoves(state)
    .map((move) => minimax(lineGame.applyMove(state, move), depth - 1, seat, ply + 1));
  return lineGame.currentPlayer(state) === seat ? Math.max(...scores) : Math.min(...scores);
}

function referenceRoot(state: LineState, depth: number) {
  const seat = lineGame.currentPlayer(state);
  const scored = lineGame.legalMoves(state).map((move) => ({
    move,
    score: minimax(lineGame.applyMove(state, move), depth - 1, seat, 1),
  }));
  const best = Math.max(...scored.map((entry) => entry.score));
  return {
    best,
    candidates: scored
      .filter((entry) => entry.score > best - TIE_EPSILON)
      .map((entry) => entry.move),
  };
}

/** A random position with `marks` marks and no winner yet. */
function randomPosition(seed: number, marks: number): LineState {
  const rng = createRng(seed);
  let state = lineGame.setup();
  for (let placed = 0; placed < marks; placed += 1) {
    const moves = lineGame.legalMoves(state);
    const move = moves[rng.nextInt(0, moves.length - 1)];
    if (move === undefined) break;
    const next = lineGame.applyMove(state, move);
    if (lineGame.result(next) !== null) break;
    state = next;
  }
  return state;
}

const cells = (moves: readonly LineMove[]) => moves.map((move) => move.cell).sort();

describe("score", () => {
  it("scores an earlier win higher and a later loss higher", () => {
    expect(resultScore({ kind: "win", winners: [0] }, 0, 1)).toBeGreaterThan(
      resultScore({ kind: "win", winners: [0] }, 0, 3),
    );
    expect(resultScore({ kind: "win", winners: [1] }, 0, 5)).toBeGreaterThan(
      resultScore({ kind: "win", winners: [1] }, 0, 2),
    );
    expect(resultScore({ kind: "draw" }, 0, 4)).toBe(0);
    expect(resultScore({ kind: "win", winners: [0] }, 0, 0)).toBe(WIN);
  });

  it("turns NaN into 0 and clamps the evaluation below any win or loss", () => {
    expect(clampEvaluation(Number.NaN)).toBe(0);
    expect(clampEvaluation(Number.POSITIVE_INFINITY)).toBe(EVAL_LIMIT);
    expect(clampEvaluation(Number.NEGATIVE_INFINITY)).toBe(-EVAL_LIMIT);
    expect(EVAL_LIMIT).toBeLessThan(WIN - 1000);
  });
});

describe("searchRoot", () => {
  it("finds an immediate win at depth 1", () => {
    // X X . / O O . / . . .  — X to move wins at cell 2.
    expect(cells(search(linePosition("XX.OO...."), 1).candidates)).toEqual([2]);
  });

  it("blocks the opponent's immediate win at depth 2", () => {
    // X . . / O O . / X . .  — X to move must block at cell 5.
    expect(cells(search(linePosition("X..OO.X.."), 2).candidates)).toEqual([5]);
  });

  it("does not modify the state it searches", () => {
    const state = deepFreeze(linePosition("X...O...."));

    expect(() => search(state, 4)).not.toThrow();
  });

  it("reports whether the depth limit cut any branch", () => {
    expect(search(linePosition("XOXOXO..."), 9).hitDepthLimit).toBe(false);
    expect(search(lineGame.setup(), 2).hitDepthLimit).toBe(true);
  });

  it("still returns legal moves when evaluate returns NaN or infinities", () => {
    const state = linePosition("X...O....");
    for (const broken of [
      () => Number.NaN,
      () => Number.POSITIVE_INFINITY,
      () => Number.NEGATIVE_INFINITY,
    ]) {
      const { candidates } = searchRoot(
        lineContext(0, broken),
        state,
        2,
        lineGame.legalMoves(state),
      );
      expect(candidates.length).toBeGreaterThan(0);
      for (const move of candidates) expect(lineGame.legalMoves(state)).toContainEqual(move);
    }
  });

  it.each([
    [1, 3],
    [2, 4],
    [3, 5],
    [4, 2],
    [5, 6],
    [6, 1],
    [7, 3],
    [8, 0],
  ])(
    "agrees with unpruned minimax on the best score and the exact set of tied moves (seed %i, %i marks)",
    (seed, marks) => {
      const state = randomPosition(seed, marks);
      for (const depth of [1, 2, 3, 9]) {
        const pruned = search(state, depth);
        const reference = referenceRoot(state, depth);
        expect(pruned.best).toBe(reference.best);
        expect(cells(pruned.candidates)).toEqual(cells(reference.candidates));
      }
    },
  );
});

describe("searchRoot with random outcomes", () => {
  function choiceSearch(winWeight: number, loseWeight: number) {
    const state: ChoiceState = choiceGame.setup({
      playerCount: 2,
      options: { winWeight, loseWeight },
    });
    return searchRoot(
      { game: choiceGame, evaluate: choiceGame.evaluate, seat: 0 },
      state,
      1,
      choiceGame.legalMoves(state),
    );
  }

  it("takes the gamble when its expected value beats a sure draw (win 3 : lose 1)", () => {
    expect(choiceSearch(3, 1).candidates).toEqual([{ choice: "gamble" }]);
  });

  it("plays it safe when the gamble is more likely to lose (win 1 : lose 3)", () => {
    expect(choiceSearch(1, 3).candidates).toEqual([{ choice: "safe" }]);
  });

  it("treats an even gamble as equal to a sure draw", () => {
    expect(choiceSearch(1, 1).candidates).toEqual([{ choice: "safe" }, { choice: "gamble" }]);
  });
});

/** A node where `player` is to move and each move leads to the given children. */
function turn(player: PlayerIndex, moves: readonly TreeMove[], scores = [0, 0]): TreeNode {
  return { kind: "turn", player, scores, moves };
}

/** A move that is not random, to `node`. */
function sure(node: TreeNode): TreeMove {
  return { random: false, children: [{ weight: 1, node }] };
}

/** A random move to each node with its weight. */
function roll(...children: readonly (readonly [number, TreeNode])[]): TreeMove {
  return { random: true, children: children.map(([weight, node]) => ({ weight, node })) };
}

/** An unfinished position that seat 0 evaluates at `score`. */
function leaf(score: number): TreeNode {
  return turn(0, [sure({ kind: "end", result: { kind: "draw" } })], [score, -score]);
}

function treeSearch(root: TreeNode, depth: number) {
  return searchRoot(
    { game: treeGame, evaluate: treeGame.evaluate, seat: treeGame.currentPlayer(root) },
    root,
    depth,
    treeGame.legalMoves(root),
  );
}

describe("searchRoot on generated trees", () => {
  it("prefers a gamble whose expected evaluation is only a fraction better", () => {
    // A sure 0, or a die whose sixth face scores 5: expected 5/6.
    const die = roll([1, leaf(5)], ...Array.from({ length: 5 }, () => [1, leaf(0)] as const));
    const search = treeSearch(turn(0, [sure(leaf(0)), die]), 1);

    expect(search.candidates).toEqual([1]);
    expect(search.best).toBeCloseTo(5 / 6);
  });

  it("prefers an even gamble between 1 and 0 to a sure 0", () => {
    expect(
      treeSearch(turn(0, [sure(leaf(0)), roll([1, leaf(1)], [1, leaf(0)])]), 1).candidates,
    ).toEqual([1]);
  });

  it("still ties two gambles with the same expected value reached in different ways", () => {
    // 1/3 · 3 and 3/9 · 3 + 6/9 · 0 are equal, though rounding may not compute them identically.
    const thirds = roll([1, leaf(3)], [2, leaf(0)]);
    const ninths = roll([3, leaf(3)], [3, leaf(0)], [3, leaf(0)]);

    expect(treeSearch(turn(0, [thirds, ninths]), 1).candidates).toEqual([0, 1]);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "throws on an outcome weight of %s, as play does",
    (weight) => {
      const root = turn(0, [sure(leaf(0)), roll([weight, leaf(1)], [1, leaf(0)])]);

      expect(() => treeSearch(root, 1)).toThrow(RangeError);
    },
  );

  it("throws on an unfinished position with no legal move", () => {
    const stuck: TreeNode = turn(1, []);

    expect(() => treeSearch(turn(0, [sure(leaf(0)), sure(stuck)]), 2)).toThrow("no legal move");
  });

  /** Paranoid expectiminimax without pruning, scored like the search, as the reference. */
  function reference(node: TreeNode, depth: number, seat: PlayerIndex, ply: number): number {
    const result = treeGame.result(node);
    if (result !== null) return resultScore(result, seat, ply);
    if (depth <= 0) return clampEvaluation(treeGame.evaluate(node, seat));
    const scores = treeGame
      .legalMoves(node)
      .map((move) => referenceMove(node, move, depth, seat, ply + 1));
    return treeGame.currentPlayer(node) === seat ? Math.max(...scores) : Math.min(...scores);
  }

  function referenceMove(
    node: TreeNode,
    move: number,
    depth: number,
    seat: PlayerIndex,
    ply: number,
  ) {
    const choices = treeGame.outcomes(node, move);
    if (choices.length === 0)
      return reference(treeGame.applyMove(node, move), depth - 1, seat, ply);
    let total = 0;
    let weighted = 0;
    for (const { outcome, weight } of choices) {
      total += weight;
      weighted += weight * reference(treeGame.applyMove(node, move, outcome), depth - 1, seat, ply);
    }
    return weighted / total;
  }

  it("agrees with unpruned expectiminimax on hundreds of random trees", () => {
    for (let seed = 1; seed <= 400; seed += 1) {
      const root = randomTree(seed, 2 + (seed % 3), 1 + (seed % 5));
      const seat = treeGame.currentPlayer(root);
      for (const depth of [1, 2, 3, 6]) {
        const scored = treeGame
          .legalMoves(root)
          .map((move) => ({ move, score: referenceMove(root, move, depth, seat, 1) }));
        const best = Math.max(...scored.map((entry) => entry.score));
        const expected = scored.filter((entry) => entry.score > best - TIE_EPSILON);

        const search = treeSearch(root, depth);
        const label = `seed ${seed}, depth ${depth}`;
        expect(search.best, label).toBe(best);
        expect([...search.candidates].sort(), label).toEqual(expected.map((entry) => entry.move));
      }
    }
  });
});
