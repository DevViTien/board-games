import { describe, expect, it } from "vitest";

import {
  CHAPTER_COUNT,
  LEVEL_DEFINITIONS,
  LEVELS,
  LEVELS_PER_CHAPTER,
  levelsByChapter,
} from "./levels";
import { SOLUTIONS } from "./levels.solutions";
import { currentFrame, isAttemptSolved, replay } from "./rules/history";
import { parseLevel } from "./rules/parse-level";
import { solve } from "./rules/solver";
import { isSolved } from "./rules/step";
import {
  HINT,
  type Hint,
  JELLY_KIND,
  type JellyKind,
  type Level,
  type LevelId,
} from "./rules/types";

// Spec `jelly-gather` "Các màn chơi" (design §5): every level is solvable, not solved at the start,
// and its `minMoves` is the true fewest, proved by breadth-first search.

/** The solver looks at no more boards than this for any level; a level beyond it is refused. */
const STATE_LIMIT = 300_000;
const SOLVE_TIMEOUT = 30_000;

const HINTS: Readonly<Partial<Record<LevelId, Hint>>> = {
  "1-1": HINT.Push,
  "1-5": HINT.Ice,
  "2-1": HINT.Grass,
  "3-1": HINT.Coconut,
};

/** Level number `n` of chapter 1 is the first with ice. */
const FIRST_ICE_LEVEL = 5;

const kindsOf = (level: Level): ReadonlySet<JellyKind> =>
  new Set(level.start.pieces.flatMap((piece) => piece.kinds));

const levelNumber = (level: Level) => Number(level.id.split("-")[1]);

describe("the levels", () => {
  it("are 3 chapters of 8, in play order, with unique ids", () => {
    const ids = Array.from({ length: CHAPTER_COUNT }, (_, chapter) =>
      Array.from({ length: LEVELS_PER_CHAPTER }, (_, index) => `${chapter + 1}-${index + 1}`),
    ).flat();
    expect(LEVELS).toHaveLength(24);
    expect(LEVELS.map((level) => level.id)).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
    const chapters = levelsByChapter();
    expect(chapters).toHaveLength(3);
    chapters.forEach((levels, index) => {
      expect(levels).toHaveLength(8);
      for (const level of levels) {
        expect(level.chapter).toBe(index + 1);
        expect(level.id.startsWith(`${index + 1}-`)).toBe(true);
      }
    });
  });

  it("have a solution for each level and none else", () => {
    expect(Object.keys(SOLUTIONS).toSorted()).toEqual(LEVELS.map((level) => level.id).toSorted());
  });
});

describe.each(LEVELS)("level $id", (level) => {
  const kinds = kindsOf(level);
  const solution = SOLUTIONS[level.id] ?? "";

  it("has a hint only where a mechanic first appears", () => {
    expect(level.hint).toBe(HINTS[level.id]);
  });

  it("holds the kinds of its chapter", () => {
    if (level.chapter === 1) {
      expect(kinds.has(JELLY_KIND.Grass)).toBe(false);
      expect(kinds.has(JELLY_KIND.Coconut)).toBe(false);
      if (levelNumber(level) < FIRST_ICE_LEVEL) expect(kinds.has(JELLY_KIND.Ice)).toBe(false);
      if (levelNumber(level) === FIRST_ICE_LEVEL) expect(kinds.has(JELLY_KIND.Ice)).toBe(true);
    }
    if (level.chapter === 2) {
      expect(kinds.has(JELLY_KIND.Grass)).toBe(true);
      expect(kinds.has(JELLY_KIND.Coconut)).toBe(false);
    }
    if (level.chapter === 3) expect(kinds.has(JELLY_KIND.Coconut)).toBe(true);
  });

  it("is not solved at the start", () => {
    expect(isSolved(level.start)).toBe(false);
  });

  it("is solved by its solution, in exactly minMoves moves", () => {
    const attempt = replay(level, solution);
    expect(attempt).not.toBeNull();
    if (attempt === null) return;
    expect(isAttemptSolved(attempt)).toBe(true);
    expect(currentFrame(attempt).steps).toBe(level.minMoves);
    expect(solution).toHaveLength(level.minMoves);
  });

  it(
    "has no solution shorter than minMoves",
    () => {
      const result = solve(level, STATE_LIMIT);
      expect(result.kind).toBe("solved");
      expect(result.kind === "solved" && result.moves.length).toBe(level.minMoves);
    },
    SOLVE_TIMEOUT,
  );
});

// Each chapter-2 level must need grass jelly: played with ice in its place, it is unsolvable or
// takes a different number of moves.
describe.each(LEVEL_DEFINITIONS.filter((definition) => definition.id.startsWith("2-")))(
  "level $id without grass jelly",
  (definition) => {
    it(
      "is a different puzzle",
      () => {
        const asIce = parseLevel({
          ...definition,
          rows: definition.rows.map((row) => row.replaceAll("b", "i")),
        });
        const result = solve(asIce, STATE_LIMIT);
        expect(result.kind).not.toBe("too-big");
        if (result.kind === "solved") expect(result.moves.length).not.toBe(definition.minMoves);
      },
      SOLVE_TIMEOUT,
    );
  },
);
