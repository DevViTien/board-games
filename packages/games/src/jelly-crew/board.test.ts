import { describe, expect, it } from "vitest";

import { jellyCrewOpenDoors, jellyCrewSettle, jellyCrewStep } from "./board";
import { JELLY_CREW_BLOCKED, JELLY_CREW_MAP } from "./constants";
import { parseJellyCrewLayout } from "./layout";
import type { JellyCrewBoard, JellyCrewLayout, JellyCrewPiece } from "./types";

/**
 * A layout built for one test. The format needs a mold whose kind is on the board: each test
 * layout has one ice block `i` in a corner and its mold `I` on the last floor cell of row 1.
 */
function testLayout(rows: readonly string[]): JellyCrewLayout {
  const playerCount = rows.join("").replace(/[^1-4]/gu, "").length;
  const moldAt = rows[1]?.lastIndexOf(".") ?? -1;
  const molds = rows.map((row, y) =>
    Array.from({ length: row.length }, (_, x) => (y === 1 && x === moldAt ? "I" : ".")).join(""),
  );
  return parseJellyCrewLayout({ map: JELLY_CREW_MAP.Kitchen, playerCount, rows, molds });
}

/** The board of `layout` with these characters and pieces (and its ice block), settled. */
function boardOf(
  layout: JellyCrewLayout,
  chars: readonly number[],
  pieces: readonly JellyCrewPiece[],
): JellyCrewBoard {
  const ice = layout.start.pieces.filter((piece) => piece.kinds[0] === "ice");
  return { chars, pieces: jellyCrewSettle(layout, [...pieces, ...ice]) };
}

const jelly = (kind: JellyCrewPiece["kinds"][number], ...cells: number[]): JellyCrewPiece => ({
  cells,
  kinds: cells.map(() => kind),
});

/** Strips the ice block every test layout carries, to compare what moved. */
const withoutIce = (board: JellyCrewBoard) =>
  board.pieces.filter((piece) => !piece.kinds.includes("ice"));

describe("Đi và đẩy thạch", () => {
  const layout = testLayout(["#########", "#1......#", "#.......#", "#.....2i#", "#########"]);
  const at = (x: number, y: number) => y * layout.width + x;

  it("walks onto an empty cell", () => {
    const step = jellyCrewStep(layout, layout.start, 0, "D");
    expect(step.ok && step.board.chars[0]).toBe(at(1, 2));
  });

  it("Bước bị chặn: a wall in the way", () => {
    expect(jellyCrewStep(layout, layout.start, 0, "U")).toEqual({
      ok: false,
      blocked: JELLY_CREW_BLOCKED.Wall,
    });
  });

  it("Đẩy cả dãy: a strawberry pushed into a mango moves it too", () => {
    const board = boardOf(
      layout,
      [at(2, 1), at(6, 3)],
      [jelly("strawberry", at(3, 1)), jelly("mango", at(4, 1))],
    );
    const step = jellyCrewStep(layout, board, 0, "R");
    if (!step.ok) throw new Error(step.blocked);
    expect(step.board.chars[0]).toBe(at(3, 1));
    expect(withoutIce(step.board)).toEqual([
      jelly("strawberry", at(4, 1)),
      jelly("mango", at(5, 1)),
    ]);
    expect(step.pushedKinds).toEqual(["strawberry", "mango"]);
  });

  it("the edge of the board: a pushed piece cannot go into the wall", () => {
    const board = boardOf(layout, [at(6, 1), at(6, 3)], [jelly("strawberry", at(7, 1))]);
    expect(jellyCrewStep(layout, board, 0, "R")).toEqual({
      ok: false,
      blocked: JELLY_CREW_BLOCKED.PushWall,
    });
  });

  it("Không đi vào nhân vật khác", () => {
    const board = boardOf(layout, [at(5, 3), at(6, 3)], []);
    expect(jellyCrewStep(layout, board, 0, "R")).toEqual({
      ok: false,
      blocked: JELLY_CREW_BLOCKED.Seat,
      seat: 1,
    });
  });

  it("Nhân vật khác chặn khối bị đẩy", () => {
    const board = boardOf(layout, [at(4, 2), at(6, 2)], [jelly("strawberry", at(5, 2))]);
    expect(jellyCrewStep(layout, board, 0, "R")).toEqual({
      ok: false,
      blocked: JELLY_CREW_BLOCKED.PushSeat,
      seat: 1,
    });
  });

  it("a piece of several cells is held back by any one of them", () => {
    const tall = jelly("mango", at(4, 1), at(4, 2));
    const up = boardOf(layout, [at(4, 3), at(6, 3)], [tall]);
    expect(jellyCrewStep(layout, up, 0, "U")).toEqual({
      ok: false,
      blocked: JELLY_CREW_BLOCKED.PushWall,
    });
    // Pushed right by its lower cell, the whole piece moves.
    const right = jellyCrewStep(layout, boardOf(layout, [at(3, 2), at(6, 3)], [tall]), 0, "R");
    expect(right.ok && withoutIce(right.board)).toEqual([jelly("mango", at(5, 1), at(5, 2))]);
  });
});

describe("Thạch dính nhau", () => {
  const layout = testLayout(["#########", "#1......#", "#......i#", "#########"]);
  const at = (x: number, y: number) => y * layout.width + x;

  it("Cùng màu dính lại: two strawberries become one piece, pushed together after", () => {
    const board = boardOf(
      layout,
      [at(1, 1)],
      [jelly("strawberry", at(2, 1)), jelly("strawberry", at(4, 1))],
    );
    const step = jellyCrewStep(layout, board, 0, "R");
    if (!step.ok) throw new Error(step.blocked);
    expect(withoutIce(step.board)).toEqual([jelly("strawberry", at(3, 1), at(4, 1))]);
    const next = jellyCrewStep(layout, step.board, 0, "R");
    expect(next.ok && withoutIce(next.board)).toEqual([jelly("strawberry", at(4, 1), at(5, 1))]);
  });

  it("Đá viên không dính: ice and strawberry stay apart", () => {
    const board = boardOf(
      layout,
      [at(1, 1)],
      [jelly("ice", at(2, 1)), jelly("strawberry", at(4, 1))],
    );
    const step = jellyCrewStep(layout, board, 0, "R");
    if (!step.ok) throw new Error(step.blocked);
    expect(withoutIce(step.board)).toEqual([jelly("strawberry", at(4, 1))]);
    // Pushing the strawberry away from below leaves the ice where it is.
    const strawberryAway = jellyCrewStep(layout, { ...step.board, chars: [at(4, 2)] }, 0, "U");
    expect(strawberryAway.ok).toBe(false);
  });

  it("grass jelly sticks two colours into one piece", () => {
    const board = boardOf(
      layout,
      [at(1, 1)],
      [jelly("strawberry", at(2, 1)), jelly("grass", at(4, 1)), jelly("mango", at(5, 1))],
    );
    expect(withoutIce(board)).toHaveLength(2);
    const step = jellyCrewStep(layout, board, 0, "R");
    if (!step.ok) throw new Error(step.blocked);
    expect(withoutIce(step.board)).toEqual([
      { cells: [at(3, 1), at(4, 1), at(5, 1)], kinds: ["strawberry", "grass", "mango"] },
    ]);
  });

  it("ice never sticks to grass jelly", () => {
    const board = boardOf(layout, [at(1, 1)], [jelly("grass", at(2, 1)), jelly("ice", at(3, 1))]);
    expect(board.pieces).toHaveLength(3);
  });
});

describe("Nút và cửa", () => {
  // Door ● (A) and door ▲ (B) between two rooms; plate ● on the left, plate ▲ on the right.
  const layout = testLayout(["#########", "#1a.A..b#", "#...B.2.#", "#......i#", "#########"]);
  const at = (x: number, y: number) => y * layout.width + x;
  const doorA = at(4, 1);
  const doorB = at(4, 2);

  it("Đứng trên nút thì cửa mở: door ● opens, and the other walks through it", () => {
    const board = boardOf(layout, [at(2, 1), at(5, 1)], []);
    const open = jellyCrewOpenDoors(layout, board);
    expect(open.has(doorA)).toBe(true);
    expect(open.has(doorB)).toBe(false);
    expect(jellyCrewStep(layout, board, 1, "L").ok).toBe(true);
  });

  it("a closed door blocks like a wall, walking or pushing", () => {
    expect(jellyCrewStep(layout, boardOf(layout, [at(3, 2), at(6, 2)], []), 0, "R")).toEqual({
      ok: false,
      blocked: JELLY_CREW_BLOCKED.Door,
      group: "triangle",
    });
    const pushing = boardOf(layout, [at(2, 2), at(6, 2)], [jelly("strawberry", at(3, 2))]);
    expect(jellyCrewStep(layout, pushing, 0, "R")).toEqual({
      ok: false,
      blocked: JELLY_CREW_BLOCKED.PushDoor,
      group: "triangle",
    });
  });

  it("Thạch giữ nút: a piece pushed onto plate ▲ opens door ▲", () => {
    const board = boardOf(layout, [at(1, 1), at(5, 1)], [jelly("strawberry", at(6, 1))]);
    const step = jellyCrewStep(layout, board, 1, "R");
    if (!step.ok) throw new Error(step.blocked);
    expect(jellyCrewOpenDoors(layout, step.board).has(doorB)).toBe(true);
  });

  it("Rời nút thì cửa đóng", () => {
    const step = jellyCrewStep(layout, boardOf(layout, [at(2, 1), at(5, 1)], []), 0, "L");
    if (!step.ok) throw new Error(step.blocked);
    expect(jellyCrewOpenDoors(layout, step.board).has(doorA)).toBe(false);
    expect(jellyCrewStep(layout, step.board, 1, "L")).toEqual({
      ok: false,
      blocked: JELLY_CREW_BLOCKED.Door,
      group: "circle",
    });
  });

  it("Thạch kẹt trong cửa: a door holding jelly stays open, and the jelly can be pushed out", () => {
    const board = boardOf(layout, [at(3, 1), at(6, 2)], [jelly("strawberry", doorA)]);
    expect(jellyCrewOpenDoors(layout, board).has(doorA)).toBe(true);
    const out = jellyCrewStep(layout, board, 0, "R");
    if (!out.ok) throw new Error(out.blocked);
    expect(out.board.chars[0]).toBe(doorA);
    expect(jellyCrewOpenDoors(layout, out.board).has(doorA)).toBe(true);
    const away = jellyCrewStep(layout, out.board, 0, "R");
    if (!away.ok) throw new Error(away.blocked);
    expect(jellyCrewOpenDoors(layout, away.board).has(doorA)).toBe(false);
  });

  it("Bước từ nút vào cửa của nó: valid, and the door stays open with the character in it", () => {
    const tight = testLayout(["#######", "#1aA..#", "#....i#", "#######"]);
    const board = { chars: [2 + tight.width], pieces: tight.start.pieces };
    const step = jellyCrewStep(tight, board, 0, "R");
    if (!step.ok) throw new Error(step.blocked);
    expect(step.board.chars[0]).toBe(3 + tight.width);
    expect(jellyCrewOpenDoors(tight, step.board).has(3 + tight.width)).toBe(true);
  });

  it("a piece lying across a door keeps that door open while any of its cells is in it", () => {
    const across = jelly("mango", at(3, 1), doorA);
    const board = boardOf(layout, [at(1, 1), at(6, 2)], [across]);
    expect(jellyCrewOpenDoors(layout, board).has(doorA)).toBe(true);
    expect(jellyCrewOpenDoors(layout, board).has(doorB)).toBe(false);
  });
});
