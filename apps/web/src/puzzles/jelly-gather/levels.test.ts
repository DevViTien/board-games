import { readFileSync } from "node:fs";
import path from "node:path";

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
import { type LevelDefinition, parseLevel } from "./rules/parse-level";
import { solve } from "./rules/solver";
import { isSolved, step } from "./rules/step";
import {
  type Direction,
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
  "4-1": HINT.Mold,
  "5-1": HINT.Depot,
};

/** Level number `n` of chapter 1 is the first with ice. */
const FIRST_ICE_LEVEL = 5;

const kindsOf = (level: Level): ReadonlySet<JellyKind> =>
  new Set(level.start.pieces.flatMap((piece) => piece.kinds));

const levelNumber = (level: Level) => Number(level.id.split("-")[1]);

const inChapter = (chapter: number) =>
  LEVEL_DEFINITIONS.filter((definition) => definition.id.startsWith(`${chapter}-`));

describe("the levels", () => {
  it("are 5 chapters of 8, in play order, with unique ids", () => {
    const ids = Array.from({ length: CHAPTER_COUNT }, (_, chapter) =>
      Array.from({ length: LEVELS_PER_CHAPTER }, (_, index) => `${chapter + 1}-${index + 1}`),
    ).flat();
    expect(LEVELS).toHaveLength(40);
    expect(LEVELS.map((level) => level.id)).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
    const chapters = levelsByChapter();
    expect(chapters).toHaveLength(5);
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
  const moldKinds = new Set(level.molds.values());
  const solution = SOLUTIONS[level.id] ?? "";

  it("has a hint only where a mechanic first appears", () => {
    expect(level.hint).toBe(HINTS[level.id]);
  });

  it("holds the kinds of its chapter", () => {
    if (level.chapter <= 3) expect(level.molds.size).toBe(0);
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
    // Chapter 4 brings molds; ice molds wait for chapter 5, where 5-1's hint introduces them.
    if (level.chapter === 4) {
      expect(level.molds.size).toBeGreaterThan(0);
      expect(moldKinds.has(JELLY_KIND.Ice)).toBe(false);
    }
    if (level.chapter === 5) {
      expect([...kinds]).toEqual([JELLY_KIND.Ice]);
      expect([...moldKinds]).toEqual([JELLY_KIND.Ice]);
    }
  });

  it("is not solved at the start", () => {
    expect(isSolved(level, level.start)).toBe(false);
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
describe.each(inChapter(2))("level $id without grass jelly", (definition) => {
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
});

// Each chapter-4 level must need its molds (design §3 of add-jelly-gather-molds): played by the
// gather rule instead, it is not already won, and its shortest solution is another or none, and
// no board on the way to that solution fits the molds.
describe.each(inChapter(4))("level $id without its molds", (definition) => {
  const level = parseLevel(definition);
  const { id, version, minMoves, rows } = definition;
  const bare = parseLevel({ id, version, minMoves, rows });

  it("is not gathered at the start", () => {
    expect(bare.molds.size).toBe(0);
    expect(isSolved(bare, bare.start)).toBe(false);
  });

  it(
    "is a different puzzle",
    () => {
      const result = solve(bare, STATE_LIMIT);
      expect(result.kind).not.toBe("too-big");
      if (result.kind !== "solved") return;
      expect(result.moves.length).not.toBe(minMoves);
      let board = bare.start;
      for (const move of result.moves) {
        const next = step(bare, board, move as Direction);
        expect(next.ok).toBe(true);
        if (!next.ok) return;
        board = next.board;
        expect(isSolved(level, board)).toBe(false);
      }
    },
    SOLVE_TIMEOUT,
  );
});

// Chapter 5 is Boxoban (spec "Màn từ bộ Boxoban"): each level is proved as short under Sokoban's
// rule, where a move never pushes two pieces, and still matches the original in its comment.

/** The Boxoban level each chapter-5 level comes from, by its `; n` header in `hard/000.txt`. */
const BOXOBAN: Readonly<Partial<Record<LevelId, number>>> = {
  "5-1": 199,
  "5-2": 128,
  "5-3": 75,
  "5-4": 184,
  "5-5": 198,
  "5-6": 190,
  "5-7": 111,
  "5-8": 112,
};

/** Each chapter-5 level's 10 original lines, read from the comment above it in `levels.ts`. */
const ORIGINALS: ReadonlyMap<string, { readonly number: number; readonly lines: string[] }> =
  new Map(
    [
      ...readFileSync(path.join(import.meta.dirname, "levels.ts"), "utf8").matchAll(
        /\/\/ Boxoban hard\/000\.txt #(\d+), google-deepmind\/boxoban-levels@78011d8c86ad423bfb2e1005012393b4c3c24409, Apache-2\.0\. Original:\r?\n((?:[ \t]*\/\/ {3}`[^`\n]*`\r?\n){10})[ \t]*\{\r?\n[ \t]*id: "(\d+-\d+)"/g,
      ),
    ].map((match) => [
      match[3] ?? "",
      {
        number: Number(match[1]),
        lines: [...(match[2] ?? "").matchAll(/`([^`\n]*)`/g)].map((line) => line[1] ?? ""),
      },
    ]),
  );

// Boxoban's symbols (`#` wall, `@` player, `$` box, `.` goal, `*` box on a goal, `+` player on a
// goal, space floor) as a cell of `rows` and a cell of `molds`.
const ROW_SYMBOL: Readonly<Record<string, string>> = {
  "#": "#",
  "@": "@",
  $: "i",
  ".": ".",
  "*": "i",
  "+": "@",
  " ": ".",
};
const MOLD_SYMBOL: Readonly<Record<string, string>> = {
  "#": ".",
  "@": ".",
  $: ".",
  ".": "I",
  "*": "I",
  "+": "I",
  " ": ".",
};

const convert = (lines: readonly string[], symbols: Readonly<Record<string, string>>) =>
  lines.map((line) => Array.from(line, (symbol) => symbols[symbol] ?? "?").join(""));

describe.each(inChapter(5))("level $id from Boxoban", (definition: LevelDefinition) => {
  it(
    "is as short under Sokoban's rule",
    () => {
      const result = solve(parseLevel(definition), STATE_LIMIT, { chainPush: false });
      expect(result.kind).toBe("solved");
      expect(result.kind === "solved" && result.moves.length).toBe(definition.minMoves);
    },
    SOLVE_TIMEOUT,
  );

  it("is its original in levels.ts, converted", () => {
    const original = ORIGINALS.get(definition.id);
    expect(original?.number).toBe(BOXOBAN[definition.id]);
    expect(original?.lines).toHaveLength(10);
    const lines = original?.lines ?? [];
    expect(lines.every((line) => line.length === 10)).toBe(true);
    expect(convert(lines, ROW_SYMBOL)).toEqual(definition.rows);
    expect(convert(lines, MOLD_SYMBOL)).toEqual(definition.molds);
  });
});

it("takes every chapter-5 level from a comment of levels.ts", () => {
  expect([...ORIGINALS.keys()]).toEqual(inChapter(5).map((definition) => definition.id));
});
