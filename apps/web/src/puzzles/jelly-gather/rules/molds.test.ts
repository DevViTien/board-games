import { describe, expect, it } from "vitest";

import type { LevelError } from "./parse-level";
import { LEVEL_ERROR, type LevelDefinition, parseLevel } from "./parse-level";
import { solve } from "./solver";
import { isSolved, moldProgress, step } from "./step";
import { type Board, type Direction, JELLY_KIND, type Level } from "./types";

// Spec `jelly-gather` (add-jelly-gather-molds), "Khuôn": molds, the exact fit, and the solver's
// Sokoban rule.

const level = (rows: readonly string[], molds: readonly string[]): Level =>
  parseLevel({ id: "4-1", version: 1, minMoves: 1, rows, molds } satisfies LevelDefinition);

function play(of: Level, moves: string): Board {
  let board = of.start;
  for (const move of moves) {
    const result = step(of, board, move as Direction);
    if (!result.ok) throw new Error(`${move} blocked: ${result.blocked}`);
    board = result.board;
  }
  return board;
}

// Two strawberries, a two-cell mold below them (solved by RRULLULDD).
const BAR = level(
  ["#######", "#.....#", "#.r.r.#", "#..@..#", "#.....#", "#######"],
  [".......", ".......", ".......", ".......", ".RR....", "......."],
);

describe("the molds layer", () => {
  it("reads the molds and the kind each asks for", () => {
    expect([...BAR.molds]).toEqual([
      [29, JELLY_KIND.Strawberry],
      [30, JELLY_KIND.Strawberry],
    ]);
    expect(
      parseLevel({ id: "1-1", version: 1, minMoves: 1, rows: ["#####", "#@r.#", "#####"] }).molds
        .size,
    ).toBe(0);
  });

  it.each([
    ["a layer of another size", ["#####", "#@r.#", "#####"], [".....", "..R.."]],
    ["an unknown letter", ["#####", "#@r.#", "#####"], [".....", "...X.", "....."]],
    ["a mold on a wall", ["#####", "#@r.#", "#####"], ["R....", ".....", "....."]],
    [
      "Màn sai số ô bị từ chối: more strawberry than molds",
      ["######", "#@rr.#", "######"],
      ["......", "...R..", "......"],
    ],
    ["fewer strawberry than molds", ["######", "#@r..#", "######"], ["......", "...RR.", "......"]],
  ])("refuses %s", (_, rows, molds) => {
    expect(() => level(rows, molds)).toThrow(
      expect.objectContaining({ code: LEVEL_ERROR.Mold }) as LevelError,
    );
  });

  it("allows a mold under the player or under a piece at the start", () => {
    expect(level(["#####", "#@r.#", "#####"], [".....", ".R...", "....."]).molds.get(6)).toBe(
      JELLY_KIND.Strawberry,
    );
    expect(level(["#####", "#@r.#", "#####"], [".....", "..R..", "....."]).molds.size).toBe(1);
  });
});

describe("Khuôn", () => {
  it("Vừa khít khuôn: the bar in its mold solves the level", () => {
    const board = play(BAR, "RRULLULD");
    const last = step(BAR, board, "D");
    expect(last.ok && last.outcome).toMatchObject({ molds: { fitted: 2, total: 2 }, solved: true });
    expect(isSolved(BAR, BAR.start)).toBe(false);
  });

  it("Đã gom nhưng chưa vào khuôn: one strawberry piece, out of its mold, is not solved", () => {
    const gathered = play(BAR, "RRULLU"); // the two strawberries are one bar now
    expect(
      gathered.pieces.filter((piece) => piece.kinds.includes(JELLY_KIND.Strawberry)),
    ).toHaveLength(1);
    expect(isSolved(BAR, gathered)).toBe(false);
  });

  it("Tiến độ khuôn: counts the mold cells holding their kind, on any board", () => {
    expect(moldProgress(BAR, BAR.start)).toEqual({ fitted: 0, total: 2 });
    const walk = step(BAR, BAR.start, "U");
    expect(walk.ok && walk.outcome.moldsChanged).toBe(false);
    expect(walk.ok && walk.outcome.molds).toEqual({ fitted: 0, total: 2 });
  });

  it("Sai loại trong khuôn: pandan on a strawberry mold does not fit", () => {
    const lv = level(
      ["######", "#@g..#", "#..r.#", "######"],
      ["......", "...R..", "......", "......"],
    );
    const board = play(lv, "R");
    expect(board.pieces.some((p) => p.cells.includes(9) && p.kinds[0] === JELLY_KIND.Pandan)).toBe(
      true,
    );
    expect(moldProgress(lv, board)).toEqual({ fitted: 0, total: 1 });
    expect(isSolved(lv, board)).toBe(false);
  });

  it("Không cần gom thành một khối: two strawberries in two molds apart", () => {
    const lv = level(
      ["########", "#......#", "#.r..r.#", "#..@...#", "#......#", "########"],
      ["........", "........", "........", "..R..R..", "........", "........"],
    );
    const done = solve(lv);
    expect(done.kind).toBe("solved");
    if (done.kind !== "solved") return;
    const end = play(lv, done.moves);
    expect(isSolved(lv, end)).toBe(true);
    expect(end.pieces.filter((piece) => piece.kinds.includes(JELLY_KIND.Strawberry))).toHaveLength(
      2,
    );
    // On the way, one mold filled and the other not: "Khuôn 1/2", not solved.
    const halfway = Array.from({ length: done.moves.length }, (_, at) =>
      play(lv, done.moves.slice(0, at + 1)),
    );
    const one = halfway.find((board) => moldProgress(lv, board)?.fitted === 1);
    expect(one && isSolved(lv, one)).toBe(false);
  });

  it("Màu không có khuôn: pandan left in two pieces does not matter", () => {
    const lv = level(
      ["#########", "#.......#", "#.r.r.g.#", "#...@...#", "#g......#", "#########"],
      [".........", ".........", ".........", ".........", "..RR.....", "........."],
    );
    const done = solve(lv);
    expect(done.kind).toBe("solved");
    if (done.kind !== "solved") return;
    const board = play(lv, done.moves);
    expect(isSolved(lv, board)).toBe(true);
    expect(
      board.pieces.filter((piece) => piece.kinds.includes(JELLY_KIND.Pandan)).length,
    ).toBeGreaterThan(1);
  });

  it("Khối hỗn hợp: strawberry held by grass jelly fits with the grass outside", () => {
    const lv = level(
      ["########", "#......#", "#.br...#", "#......#", "#..@...#", "########"],
      ["........", "........", "........", "...R....", "........", "........"],
    );
    const done = solve(lv);
    expect(done.kind).toBe("solved");
    if (done.kind !== "solved") return;
    const board = play(lv, done.moves);
    const piece = board.pieces.find((p) => p.kinds.includes(JELLY_KIND.Strawberry));
    expect(piece?.kinds).toContain(JELLY_KIND.Grass);
  });

  it("Đá viên: in a level with ice molds, ice must go in them", () => {
    const lv = level(["#######", "#@i...#", "#######"], [".......", "....I..", "......."]);
    expect(isSolved(lv, lv.start)).toBe(false);
    expect(isSolved(lv, play(lv, "RR"))).toBe(true);
  });
});

describe("solve with Sokoban's rule", () => {
  // Two ice blocks in a row: chained, one push moves both; by Sokoban's rule it may not.
  const lv = level(["########", "#@ii...#", "########"], ["........", "....II..", "........"]);

  it("finds the shorter chained solution by default, none by Sokoban's rule", () => {
    const chained = solve(lv);
    expect(chained.kind === "solved" && chained.moves).toBe("RR");
    expect(solve(lv, 300_000, { chainPush: false }).kind).toBe("unsolvable");
  });
});
