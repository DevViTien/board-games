import { type LevelDefinition, parseLevel } from "./rules/parse-level";
import { HINT, type Level, type LevelId } from "./rules/types";

// Gom thạch's levels (design §5): picked and trimmed by hand from boards a scratch search proposed,
// each proved solvable in `minMoves` moves and no fewer by the solver in `levels.test.ts`, which
// replays the solutions in `levels.solutions.ts`. `version` goes up whenever a released level changes.
//
//   # wall   . floor   @ player   r strawberry   g pandan   y mango   p taro
//   c coconut (sticks to walls)   b grass jelly (sticks to every jelly)   i ice (sticks to nothing)
//
// `molds`, from chapter 4, is a layer as large as `rows`: `.` none, or the kind a mold asks for
// (`R G Y P C` the colours, `I` ice).

export const CHAPTER_COUNT = 5;

/** A chapter as its messages are keyed (`JellyGather.chapters.<key>`). */
export type ChapterKey = "1" | "2" | "3" | "4" | "5";

/** The message key of chapter `chapter` (from 1). */
export const chapterKey = (chapter: number) => String(chapter) as ChapterKey;
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
  // Chapter 4: molds, each filled by exactly its kind; no ice molds before chapter 5.
  // Two strawberries stick into the bar the mold asks for.
  {
    id: "4-1",
    version: 1,
    minMoves: 8,
    hint: HINT.Mold,
    rows: ["#######", "#.....#", "#.r.r.#", "#..@..#", "#.....#", "#######"],
    molds: [".......", ".......", ".......", ".......", "..RR...", "......."],
  },
  // Three strawberries must stick into an L, not a bar.
  {
    id: "4-2",
    version: 1,
    minMoves: 15,
    rows: ["#######", "#.....#", "#...r@#", "#..r..#", "#.#.r.#", "#######"],
    molds: [".......", ".......", "..RR...", "..R....", ".......", "......."],
  },
  // Two molds of two colours, side by side.
  {
    id: "4-3",
    version: 1,
    minMoves: 20,
    rows: ["########", "#......#", "#.r..r.#", "#..@.g.#", "#....g.#", "#......#", "########"],
    molds: ["........", "........", "........", "..R.G...", "..R.G...", "........", "........"],
  },
  // Four strawberries built into a T.
  {
    id: "4-4",
    version: 1,
    minMoves: 24,
    rows: ["########", "#......#", "#..rr#.#", "#......#", "#.r..r@#", "#..#...#", "########"],
    molds: ["........", "........", "........", "..RRR...", "...R....", "........", "........"],
  },
  // Grass jelly by the mold: it holds what it touches, and the level needs it.
  {
    id: "4-5",
    version: 1,
    minMoves: 28,
    rows: ["########", "#.gg.@.#", "#.#r.#.#", "#.b...r#", "#.#....#", "#......#", "########"],
    molds: ["........", "........", "........", "...RR...", "........", "........", "........"],
  },
  // Ice in the way of an L mold.
  {
    id: "4-6",
    version: 1,
    minMoves: 34,
    rows: ["########", "##...@i#", "#.r..rr#", "#......#", "#....#.#", "##..ii.#", "########"],
    molds: ["........", "........", "........", "...RR...", "...R....", "........", "........"],
  },
  // A coconut L away from the walls: a coconut that touches a wall stays there.
  {
    id: "4-7",
    version: 1,
    minMoves: 37,
    rows: ["########", "#.#i@..#", "#...cc.#", "#......#", "#...c..#", "#.#....#", "########"],
    molds: ["........", "........", "...C....", "...CC...", "........", "........", "........"],
  },
  // Two molds, grass jelly on the strawberry mold, ice in the way.
  {
    id: "4-8",
    version: 1,
    minMoves: 41,
    rows: ["########", "##.....#", "##rg.g.#", "##b..ri#", "##.#.@##", "#...####", "########"],
    molds: ["........", "........", "........", "..R.G...", "..R.G...", "........", "........"],
  },
  // Chapter 5: Boxoban, ice for boxes and ice molds for goals (design §4 of add-jelly-gather-molds).
  // Boxoban hard/000.txt #199, google-deepmind/boxoban-levels@78011d8c86ad423bfb2e1005012393b4c3c24409, Apache-2.0. Original:
  //   `##########`
  //   `#@$.  .  #`
  //   `#$$ # $ .#`
  //   `#.  #### #`
  //   `#######  #`
  //   `###      #`
  //   `###   #  #`
  //   `###  #####`
  //   `##   #####`
  //   `##########`
  {
    id: "5-1",
    version: 1,
    minMoves: 19,
    hint: HINT.Depot,
    rows: [
      "##########",
      "#@i......#",
      "#ii.#.i..#",
      "#...####.#",
      "#######..#",
      "###......#",
      "###...#..#",
      "###..#####",
      "##...#####",
      "##########",
    ],
    molds: [
      "..........",
      "...I..I...",
      "........I.",
      ".I........",
      "..........",
      "..........",
      "..........",
      "..........",
      "..........",
      "..........",
    ],
  },
  // Boxoban hard/000.txt #128, google-deepmind/boxoban-levels@78011d8c86ad423bfb2e1005012393b4c3c24409, Apache-2.0. Original:
  //   `##########`
  //   `# ########`
  //   `#  .  ####`
  //   `#.$$ $####`
  //   `# $@#  ###`
  //   `# ## .####`
  //   `#.##  ####`
  //   `# ##  ####`
  //   `####  ####`
  //   `##########`
  {
    id: "5-2",
    version: 1,
    minMoves: 30,
    rows: [
      "##########",
      "#.########",
      "#.....####",
      "#.ii.i####",
      "#.i@#..###",
      "#.##..####",
      "#.##..####",
      "#.##..####",
      "####..####",
      "##########",
    ],
    molds: [
      "..........",
      "..........",
      "...I......",
      ".I........",
      "..........",
      ".....I....",
      ".I........",
      "..........",
      "..........",
      "..........",
    ],
  },
  // Boxoban hard/000.txt #75, google-deepmind/boxoban-levels@78011d8c86ad423bfb2e1005012393b4c3c24409, Apache-2.0. Original:
  //   `##########`
  //   `##########`
  //   `##########`
  //   `#@########`
  //   `#$########`
  //   `#  #######`
  //   `# $..### #`
  //   `#.$ $ #  #`
  //   `#  .     #`
  //   `##########`
  {
    id: "5-3",
    version: 1,
    minMoves: 35,
    rows: [
      "##########",
      "##########",
      "##########",
      "#@########",
      "#i########",
      "#..#######",
      "#.i..###.#",
      "#.i.i.#..#",
      "#........#",
      "##########",
    ],
    molds: [
      "..........",
      "..........",
      "..........",
      "..........",
      "..........",
      "..........",
      "...II.....",
      ".I........",
      "...I......",
      "..........",
    ],
  },
  // Boxoban hard/000.txt #184, google-deepmind/boxoban-levels@78011d8c86ad423bfb2e1005012393b4c3c24409, Apache-2.0. Original:
  //   `##########`
  //   `### .$ ###`
  //   `# ##    ##`
  //   `# .$.# ###`
  //   `# $  # ###`
  //   `#  #######`
  //   `# . ######`
  //   `# $#######`
  //   `# @  #####`
  //   `##########`
  {
    id: "5-4",
    version: 1,
    minMoves: 39,
    rows: [
      "##########",
      "###..i.###",
      "#.##....##",
      "#..i.#.###",
      "#.i..#.###",
      "#..#######",
      "#...######",
      "#.i#######",
      "#.@..#####",
      "##########",
    ],
    molds: [
      "..........",
      "....I.....",
      "..........",
      "..I.I.....",
      "..........",
      "..........",
      "..I.......",
      "..........",
      "..........",
      "..........",
    ],
  },
  // Boxoban hard/000.txt #198, google-deepmind/boxoban-levels@78011d8c86ad423bfb2e1005012393b4c3c24409, Apache-2.0. Original:
  //   `##########`
  //   `##########`
  //   `##########`
  //   `##########`
  //   `#### #####`
  //   `##@$ . ###`
  //   `### $. . #`
  //   `#####$ $ #`
  //   `##### .  #`
  //   `##########`
  {
    id: "5-5",
    version: 1,
    minMoves: 39,
    rows: [
      "##########",
      "##########",
      "##########",
      "##########",
      "####.#####",
      "##@i...###",
      "###.i....#",
      "#####i.i.#",
      "#####....#",
      "##########",
    ],
    molds: [
      "..........",
      "..........",
      "..........",
      "..........",
      "..........",
      ".....I....",
      ".....I.I..",
      "..........",
      "......I...",
      "..........",
    ],
  },
  // Boxoban hard/000.txt #190, google-deepmind/boxoban-levels@78011d8c86ad423bfb2e1005012393b4c3c24409, Apache-2.0. Original:
  //   `##########`
  //   `#####  . #`
  //   `###     .#`
  //   `#### $   #`
  //   `#######  #`
  //   `##### .# #`
  //   `#####    #`
  //   `#####.$$$#`
  //   `#######@ #`
  //   `##########`
  {
    id: "5-6",
    version: 1,
    minMoves: 40,
    rows: [
      "##########",
      "#####....#",
      "###......#",
      "####.i...#",
      "#######..#",
      "#####..#.#",
      "#####....#",
      "#####.iii#",
      "#######@.#",
      "##########",
    ],
    molds: [
      "..........",
      ".......I..",
      "........I.",
      "..........",
      "..........",
      "......I...",
      "..........",
      ".....I....",
      "..........",
      "..........",
    ],
  },
  // Boxoban hard/000.txt #111, google-deepmind/boxoban-levels@78011d8c86ad423bfb2e1005012393b4c3c24409, Apache-2.0. Original:
  //   `##########`
  //   `####### @#`
  //   `#####  $$#`
  //   `#####.   #`
  //   `####### .#`
  //   `######## #`
  //   `#  ####  #`
  //   `# # ###$ #`
  //   `#   . .$ #`
  //   `##########`
  {
    id: "5-7",
    version: 1,
    minMoves: 48,
    rows: [
      "##########",
      "#######.@#",
      "#####..ii#",
      "#####....#",
      "#######..#",
      "########.#",
      "#..####..#",
      "#.#.###i.#",
      "#......i.#",
      "##########",
    ],
    molds: [
      "..........",
      "..........",
      "..........",
      ".....I....",
      "........I.",
      "..........",
      "..........",
      "..........",
      "....I.I...",
      "..........",
    ],
  },
  // Boxoban hard/000.txt #112, google-deepmind/boxoban-levels@78011d8c86ad423bfb2e1005012393b4c3c24409, Apache-2.0. Original:
  //   `##########`
  //   `#. $ #####`
  //   `#..   ####`
  //   `#  $ #####`
  //   `# .#######`
  //   `# $#######`
  //   `#$ #######`
  //   `#@########`
  //   `##########`
  //   `##########`
  {
    id: "5-8",
    version: 1,
    minMoves: 49,
    rows: [
      "##########",
      "#..i.#####",
      "#.....####",
      "#..i.#####",
      "#..#######",
      "#.i#######",
      "#i.#######",
      "#@########",
      "##########",
      "##########",
    ],
    molds: [
      "..........",
      ".I........",
      ".II.......",
      "..........",
      "..I.......",
      "..........",
      "..........",
      "..........",
      "..........",
      "..........",
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
