import { type LevelDefinition, parseLevel } from "./rules/parse-level";
import { HINT, type Level, type LevelId } from "./rules/types";

// Gom thạch's levels (design §5): picked and trimmed by hand from boards a scratch search proposed,
// each proved solvable in `minMoves` moves and no fewer by the solver in `levels.test.ts`, which
// replays the solutions in `levels.solutions.ts`. `version` goes up whenever a released level changes.
//
//   # wall   . floor   @ player   r strawberry   g pandan   y mango   p taro
//   c coconut (sticks to walls)   b grass jelly (sticks to every jelly)   i ice (sticks to nothing)

export const CHAPTER_COUNT = 3;
export const LEVELS_PER_CHAPTER = 8;

/** Every level as written, in play order; the tests read the rows to change a level's kinds. */
export const LEVEL_DEFINITIONS: readonly LevelDefinition[] = [
  // Chapter 1: push and stick; ice from 1-5.
  {
    id: "1-1",
    version: 1,
    minMoves: 4,
    hint: HINT.Push,
    rows: ["#######", "#.....#", "#.r.r.#", "#..@..#", "#######"],
  },
  {
    id: "1-2",
    version: 1,
    minMoves: 14,
    rows: ["########", "#......#", "#.r.g..#", "#..@...#", "#.g..r.#", "#......#", "########"],
  },
  {
    id: "1-3",
    version: 1,
    minMoves: 15,
    rows: ["#######", "#r....#", "#r.@g.#", "#.ggr##", "#.....#", "#.....#", "#######"],
  },
  {
    id: "1-4",
    version: 1,
    minMoves: 20,
    rows: ["########", "#...g..#", "#..#.@.#", "##.....#", "#.rg.r.#", "#.y.y..#", "########"],
  },
  {
    id: "1-5",
    version: 1,
    minMoves: 17,
    hint: HINT.Ice,
    rows: ["#######", "#@gi..#", "#..r..#", "#...#.#", "#...g.#", "#r....#", "#######"],
  },
  {
    id: "1-6",
    version: 1,
    minMoves: 23,
    rows: [
      "########",
      "#.y..#@#",
      "#.rr..g#",
      "#...#..#",
      "#r...yi#",
      "##...g.#",
      "#...#..#",
      "########",
    ],
  },
  {
    id: "1-7",
    version: 1,
    minMoves: 24,
    rows: [
      "#########",
      "#.#p...y#",
      "#...p...#",
      "#.r.g.#.#",
      "#g..g...#",
      "##.##y.@#",
      "#..rr...#",
      "#########",
    ],
  },
  {
    id: "1-8",
    version: 1,
    minMoves: 32,
    rows: [
      "########",
      "#..r##.#",
      "#.y....#",
      "#...g..#",
      "#y...###",
      "#irr#.g#",
      "#...@..#",
      "########",
    ],
  },
  // Chapter 2: grass jelly.
  {
    id: "2-1",
    version: 1,
    minMoves: 6,
    hint: HINT.Grass,
    rows: ["########", "#......#", "#.r.b.r#", "#......#", "#..@...#", "########"],
  },
  {
    id: "2-2",
    version: 1,
    minMoves: 10,
    rows: ["########", "#......#", "#.r..g.#", "#..b...#", "#.g..r.#", "#..@...#", "########"],
  },
  {
    id: "2-3",
    version: 1,
    minMoves: 15,
    rows: ["#######", "#..#.@#", "#...gr#", "#.r##.#", "#.....#", "#.b..g#", "#######"],
  },
  {
    id: "2-4",
    version: 1,
    minMoves: 16,
    rows: ["########", "#.y....#", "#...y..#", "##b.#..#", "#g.@#r.#", "#..gr.##", "########"],
  },
  {
    id: "2-5",
    version: 1,
    minMoves: 22,
    rows: ["########", "#.....r#", "##....##", "#@r.g..#", "#.ib##.#", "#.g.#..#", "########"],
  },
  {
    id: "2-6",
    version: 1,
    minMoves: 25,
    rows: [
      "########",
      "#..r.@##",
      "#.y#...#",
      "#..r..##",
      "#..r.gb#",
      "#...g.y#",
      "#.###..#",
      "########",
    ],
  },
  {
    id: "2-7",
    version: 1,
    minMoves: 30,
    rows: [
      "########",
      "#.b.r..#",
      "#r.#.yi#",
      "#.g#...#",
      "#......#",
      "#..#@.g#",
      "#y..#.b#",
      "########",
    ],
  },
  {
    id: "2-8",
    version: 1,
    minMoves: 35,
    rows: [
      "#########",
      "#.......#",
      "#...y..##",
      "#p@.#...#",
      "#.g##...#",
      "#pr..g..#",
      "##.rb.y.#",
      "#########",
    ],
  },
  // Chapter 3: coconut.
  {
    id: "3-1",
    version: 1,
    minMoves: 8,
    hint: HINT.Coconut,
    rows: ["#######", "#.....#", "#.c.@.#", "#.....#", "#...c.#", "#.....#", "#######"],
  },
  {
    id: "3-2",
    version: 1,
    minMoves: 11,
    rows: ["########", "#c.....#", "#......#", "#..rc..#", "#.@..r.#", "#......#", "########"],
  },
  {
    id: "3-3",
    version: 1,
    minMoves: 16,
    rows: ["#######", "#....c#", "#rc.r.#", "#@....#", "#.....#", "#.....#", "#######"],
  },
  {
    id: "3-4",
    version: 1,
    minMoves: 20,
    rows: ["########", "#....@.#", "#..rc..#", "#.c....#", "#.r#...#", "#..##.c#", "########"],
  },
  {
    id: "3-5",
    version: 1,
    minMoves: 23,
    rows: ["########", "#.r....#", "#..cr..#", "#....c.#", "##g##.g#", "#..i@#.#", "########"],
  },
  {
    id: "3-6",
    version: 1,
    minMoves: 27,
    rows: [
      "########",
      "#.#..c.#",
      "#...cr.#",
      "#...@..#",
      "#.....##",
      "#..#..r#",
      "#..#...#",
      "########",
    ],
  },
  {
    id: "3-7",
    version: 1,
    minMoves: 32,
    rows: [
      "########",
      "#....r##",
      "#..c...#",
      "#.b....#",
      "#@r..#.#",
      "#.....c#",
      "##..g.g#",
      "########",
    ],
  },
  {
    id: "3-8",
    version: 1,
    minMoves: 34,
    rows: [
      "#########",
      "#@.g.y###",
      "#.gyr...#",
      "#.b#..#.#",
      "#...#.#.#",
      "#.cr....#",
      "#c...#..#",
      "#########",
    ],
  },
];

/** Every level, in the order they are played. */
export const LEVELS: readonly Level[] = LEVEL_DEFINITIONS.map(parseLevel);

const BY_ID: ReadonlyMap<string, Level> = new Map(LEVELS.map((level) => [level.id, level]));

/** The level of an address segment, or undefined for no such level. */
export function findLevel(id: string): Level | undefined {
  return BY_ID.get(id);
}

/** The level after `id` in play order, or undefined after the last. */
export function nextLevel(id: LevelId): Level | undefined {
  const index = LEVELS.findIndex((level) => level.id === id);
  return index === -1 ? undefined : LEVELS[index + 1];
}

/** The levels of each chapter, chapter 1 first. */
export function levelsByChapter(): readonly (readonly Level[])[] {
  return Array.from({ length: CHAPTER_COUNT }, (_, index) =>
    LEVELS.filter((level) => level.chapter === index + 1),
  );
}
