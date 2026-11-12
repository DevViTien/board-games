import { describe, expect, it } from "vitest";

import { LEVEL_ERROR, type LevelDefinition, LevelError, parseLevel } from "./parse-level";
import { isSolved, step } from "./step";
import { BLOCKED, type Board, type Direction, JELLY_KIND, type Level, type Piece } from "./types";

// Spec `jelly-gather`, the rules: each scenario on a small board written as text.

const level = (rows: readonly string[], extra: Partial<LevelDefinition> = {}): Level =>
  parseLevel({ id: "1-1", version: 1, minMoves: 1, rows, ...extra });

/** Plays `moves` from the level's start; every one must happen. */
function play(of: Level, moves: string): Board {
  let board = of.start;
  for (const move of moves) {
    const result = step(of, board, move as Direction);
    if (!result.ok) throw new Error(`${move} blocked: ${result.blocked}`);
    board = result.board;
  }
  return board;
}

const at = (of: Level, x: number, y: number) => y * of.width + x;
const pieceAt = (board: Board, cell: number): Piece | undefined =>
  board.pieces.find((piece) => piece.cells.includes(cell));

describe("parseLevel", () => {
  it("reads walls, the player and one piece a cell, sticking what touches", () => {
    const lv = level(["#####", "#rr@#", "#.g.#", "#####"]);
    expect(lv.width).toBe(5);
    expect(lv.chapter).toBe(1);
    expect(lv.walls.size).toBe(14);
    expect(lv.start.player).toBe(at(lv, 3, 1));
    expect(lv.start.pieces).toEqual([
      { cells: [6, 7], kinds: [JELLY_KIND.Strawberry, JELLY_KIND.Strawberry], fixed: false },
      { cells: [12], kinds: [JELLY_KIND.Pandan], fixed: false },
    ]);
  });

  it.each([
    [LEVEL_ERROR.Shape, ["#####", "#@r.#", "####"]],
    [LEVEL_ERROR.Size, ["###########", "#@r......r#", "###########"]],
    [LEVEL_ERROR.Border, ["#####", "#@r..", "#####"]],
    [LEVEL_ERROR.Player, ["#####", "#.r.#", "#####"]],
    [LEVEL_ERROR.Player, ["#####", "#@r@#", "#####"]],
    [LEVEL_ERROR.Symbol, ["#####", "#@x.#", "#####"]],
  ])("refuses a level with a %s error", (code, rows) => {
    expect(() => level(rows)).toThrow(expect.objectContaining({ code }) as LevelError);
  });

  it("refuses an id that is not <chapter>-<level>", () => {
    expect(() => level(["#####", "#@r.#", "#####"], { id: "x" as "1-1" })).toThrow(LevelError);
  });

  it("Cùng một màn luôn như nhau: the same moves give the same board", () => {
    const rows = ["########", "#@yg...#", "#......#", "#r....r#", "########"];
    expect(play(level(rows), "RDR")).toEqual(play(level(rows), "RDR"));
  });
});

describe("Đi và đẩy", () => {
  it("Đi vào ô trống: the player moves one cell", () => {
    const lv = level(["#######", "#@....#", "#r...r#", "#######"]);
    const result = step(lv, lv.start, "R");
    expect(result.ok && result.board.player).toBe(at(lv, 2, 1));
    expect(result.ok && result.outcome).toEqual({
      player: at(lv, 2, 1),
      pushed: [],
      stuck: [],
      glued: [],
      fixed: false,
      molds: null,
      moldsChanged: false,
      solved: false,
    });
  });

  it("Đẩy một khối nhiều ô: an L of strawberry moves as one", () => {
    const lv = level([
      "#########",
      "#......r#",
      "#@rr....#",
      "#..r....#",
      "#.......#",
      "#########",
    ]);
    const board = play(lv, "R");
    expect(board.player).toBe(at(lv, 2, 2));
    expect(pieceAt(board, at(lv, 3, 2))?.cells).toEqual([at(lv, 3, 2), at(lv, 4, 2), at(lv, 4, 3)]);
  });

  it("Đẩy dây chuyền: mango pushes pandan", () => {
    const lv = level(["########", "#@yg...#", "#......#", "#r....r#", "########"]);
    const result = step(lv, lv.start, "R");
    if (!result.ok) throw new Error("blocked");
    expect(pieceAt(result.board, at(lv, 3, 1))?.kinds).toEqual([JELLY_KIND.Mango]);
    expect(pieceAt(result.board, at(lv, 4, 1))?.kinds).toEqual([JELLY_KIND.Pandan]);
    expect(result.outcome.pushed).toEqual([JELLY_KIND.Pandan, JELLY_KIND.Mango]);
    expect(result.pushedPieces).toHaveLength(2);
  });

  it("Khối bao quanh nhân vật: a U round the player moves with the player", () => {
    const lv = level([
      "#########",
      "#.......#",
      "#.r@r...#",
      "#.rrr...#",
      "#.......#",
      "#.....r.#",
      "#########",
    ]);
    const board = play(lv, "D");
    expect(board.player).toBe(at(lv, 3, 3));
    expect(pieceAt(board, at(lv, 2, 3))?.cells).toEqual([
      at(lv, 2, 3),
      at(lv, 4, 3),
      at(lv, 2, 4),
      at(lv, 3, 4),
      at(lv, 4, 4),
    ]);
  });

  it("gives the board before sticking, with the same pieces in the same order", () => {
    const lv = level(["########", "#@r.r..#", "#......#", "#.y...y#", "########"]);
    const result = step(lv, lv.start, "R");
    if (!result.ok) throw new Error("blocked");
    expect(result.moved.pieces).toHaveLength(lv.start.pieces.length);
    expect(result.moved.pieces[0]?.cells).toEqual([at(lv, 3, 1)]);
    expect(result.board.pieces).toHaveLength(lv.start.pieces.length - 1);
  });
});

describe("Bước không đi được", () => {
  it("Đi vào tường: nothing changes", () => {
    const lv = level(["#######", "#@....#", "#r...r#", "#######"]);
    expect(step(lv, lv.start, "U")).toEqual({ ok: false, blocked: BLOCKED.Wall });
  });

  it("Khối bị chặn ở xa: a chain ending at a wall", () => {
    const lv = level(["#######", "#ry@..#", "#.....#", "#...r.#", "#######"]);
    expect(step(lv, lv.start, "L")).toEqual({ ok: false, blocked: BLOCKED.Jam });
  });

  it("a chain ending at a coconut stuck to a wall", () => {
    const lv = level(["#######", "#cr@..#", "#.....#", "#....r#", "#######"]);
    expect(step(lv, lv.start, "L")).toEqual({ ok: false, blocked: BLOCKED.Fixed });
  });
});

describe("Thạch cùng màu dính lại", () => {
  it("Đẩy cho hai khối dâu chạm nhau: one piece, and it moves as one", () => {
    const lv = level(["########", "#@r.r..#", "#......#", "#.y...y#", "########"]);
    const first = step(lv, lv.start, "R");
    if (!first.ok) throw new Error("blocked");
    expect(first.outcome.stuck).toEqual([{ colour: JELLY_KIND.Strawberry, pieces: 1 }]);
    expect(first.outcome.solved).toBe(false);
    const board = play(lv, "RR");
    expect(pieceAt(board, at(lv, 4, 1))?.cells).toEqual([at(lv, 4, 1), at(lv, 5, 1)]);
  });

  it("Khác màu không dính: strawberry leaves pandan behind", () => {
    const lv = level(["#######", "#.....#", "#.rg..#", "#.@...#", "#....r#", "#######"]);
    const board = play(lv, "U");
    expect(pieceAt(board, at(lv, 2, 1))?.kinds).toEqual([JELLY_KIND.Strawberry]);
    expect(pieceAt(board, at(lv, 3, 2))?.kinds).toEqual([JELLY_KIND.Pandan]);
  });

  it("Chạm chéo không dính", () => {
    const lv = level(["######", "#@...#", "#.y..#", "#..y.#", "######"]);
    expect(lv.start.pieces).toHaveLength(2);
    expect(isSolved(lv, lv.start)).toBe(false);
  });
});

describe("Sương sáo dính mọi màu", () => {
  const bridge = level(["########", "#......#", "#.r.b.r#", "#......#", "#..@...#", "########"]);

  it("Nối hai khối dâu: one piece through the grass jelly, and the level is solved", () => {
    const glued = step(bridge, play(bridge, "ULLU"), "R");
    if (!glued.ok) throw new Error("blocked");
    expect(glued.outcome.glued).toEqual([JELLY_KIND.Strawberry]);
    expect(glued.outcome.stuck).toEqual([]);
    const solved = step(bridge, glued.board, "R");
    if (!solved.ok) throw new Error("blocked");
    expect(solved.outcome.stuck).toEqual([{ colour: JELLY_KIND.Strawberry, pieces: 1 }]);
    expect(solved.outcome.glued).toEqual([]);
    expect(solved.outcome.solved).toBe(true);
    expect(pieceAt(solved.board, at(bridge, 4, 2))?.kinds).toEqual([
      JELLY_KIND.Strawberry,
      JELLY_KIND.Grass,
      JELLY_KIND.Strawberry,
    ]);
  });

  it("Dính cả màu không muốn: pandan comes along", () => {
    const lv = level(["########", "#......#", "#@b.g..#", "#......#", "#r....r#", "########"]);
    const first = step(lv, lv.start, "R");
    if (!first.ok) throw new Error("blocked");
    expect(first.outcome.glued).toEqual([JELLY_KIND.Pandan]);
    const board = play(lv, "RR");
    expect(pieceAt(board, at(lv, 4, 2))?.cells).toEqual([at(lv, 4, 2), at(lv, 5, 2)]);
  });

  it("sticks to coconut and to other grass jelly", () => {
    const lv = level(["########", "#......#", "#@b.c..#", "#..b...#", "#r....r#", "########"]);
    const board = play(lv, "R");
    const piece = pieceAt(board, at(lv, 3, 2));
    expect(piece?.kinds).toEqual([JELLY_KIND.Grass, JELLY_KIND.Coconut, JELLY_KIND.Grass]);
  });

  it("Sương sáo không dính đá viên", () => {
    const lv = level(["########", "#......#", "#@b.i..#", "#......#", "#r....r#", "########"]);
    const board = play(lv, "R");
    expect(pieceAt(board, at(lv, 3, 2))?.kinds).toEqual([JELLY_KIND.Grass]);
    expect(pieceAt(board, at(lv, 4, 2))?.kinds).toEqual([JELLY_KIND.Ice]);
  });
});

describe("Đá viên", () => {
  it("Hai đá viên cạnh nhau: only the one pushed moves", () => {
    const lv = level(["#######", "#.....#", "#.ii..#", "#.@...#", "#r...r#", "#######"]);
    const board = play(lv, "U");
    expect(pieceAt(board, at(lv, 2, 1))?.kinds).toEqual([JELLY_KIND.Ice]);
    expect(pieceAt(board, at(lv, 3, 2))?.kinds).toEqual([JELLY_KIND.Ice]);
  });
});

describe("Thạch dừa dính tường", () => {
  const tray = level(["#######", "#.....#", "#..c..#", "#..@..#", "#.....#", "#r...r#", "#######"]);

  it("Đẩy thạch dừa tới sát tường: it stays, and pushing it sideways is blocked", () => {
    const up = step(tray, tray.start, "U");
    if (!up.ok) throw new Error("blocked");
    expect(up.outcome.fixed).toBe(true);
    expect(pieceAt(up.board, at(tray, 3, 1))?.fixed).toBe(true);
    const beside = play(tray, "URU");
    expect(step(tray, beside, "L")).toEqual({ ok: false, blocked: BLOCKED.Fixed });
  });

  it("Thạch dừa sát tường ngay từ đầu", () => {
    const lv = level(["#######", "#c....#", "#..c@.#", "#.....#", "#r...r#", "#######"]);
    expect(pieceAt(lv.start, at(lv, 1, 1))?.fixed).toBe(true);
    expect(pieceAt(lv.start, at(lv, 3, 2))?.fixed).toBe(false);
  });

  it("Dính vào khối đứng yên: the two are one piece, fixed", () => {
    const lv = level(["#######", "#.....#", "#.....#", "#c.c@.#", "#.....#", "#r...r#", "#######"]);
    const result = step(lv, lv.start, "L");
    expect(result.ok && result.outcome.fixed).toBe(true);
    const board = play(lv, "L");
    expect(pieceAt(board, at(lv, 2, 3))).toEqual({
      cells: [at(lv, 1, 3), at(lv, 2, 3)],
      kinds: [JELLY_KIND.Coconut, JELLY_KIND.Coconut],
      fixed: true,
    });
  });

  it("grass jelly joined to a fixed coconut is fixed too, and said so", () => {
    const lv = level(["#######", "#.....#", "#.....#", "#c.b@.#", "#.....#", "#r...r#", "#######"]);
    const result = step(lv, lv.start, "L");
    if (!result.ok) throw new Error("blocked");
    expect(result.outcome.fixed).toBe(true);
    expect(pieceAt(result.board, at(lv, 2, 3))?.fixed).toBe(true);
  });

  it("a wall touching only at a corner does not fix it", () => {
    const lv = level(["#######", "#....@#", "#.#...#", "#..c..#", "#.....#", "#r...r#", "#######"]);
    expect(pieceAt(lv.start, at(lv, 3, 3))?.fixed).toBe(false);
  });
});

describe("Qua màn", () => {
  const lv = level(["########", "#@r.r..#", "#......#", "#.g...g#", "########"]);

  it("Còn một màu chưa gom: strawberry is one piece, pandan still two", () => {
    expect(isSolved(lv, play(lv, "R"))).toBe(false);
  });

  it("Gom xong mọi màu: then no move happens", () => {
    const one = level(["########", "#@r.r..#", "#......#", "#.g....#", "########"]);
    const result = step(one, one.start, "R");
    expect(result.ok && result.outcome.solved).toBe(true);
    if (!result.ok) throw new Error("blocked");
    expect(step(one, result.board, "D")).toEqual({ ok: false, blocked: BLOCKED.Solved });
  });
});
