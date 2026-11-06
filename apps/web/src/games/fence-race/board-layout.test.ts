import { describe, expect, it } from "vitest";

import {
  cellName,
  columnName,
  edgeCellName,
  fenceFrame,
  fenceOnSide,
  fieldRows,
  gatePost,
  gateTransform,
  hatPlaces,
  labelSize,
  plotKind,
  rowName,
  screenSide,
} from "./board-layout";

const TWO = { rows: 11, columns: 9, cell: 30, gutter: 16, turned: false };

describe("the names of the board", () => {
  it("names columns from the left and rows from the bottom", () => {
    expect(columnName(0)).toBe("A");
    expect(columnName(8)).toBe("I");
    expect(rowName(10, 11)).toBe(1);
    expect(rowName(0, 11)).toBe(11);
    expect(cellName({ row: 6, col: 2 }, 9)).toBe("C3");
    expect(cellName({ row: 0, col: 4 }, 11)).toBe("E11");
  });

  it("calls a cell along an edge the same whichever way the board is turned", () => {
    expect(edgeCellName(TWO, "top", 0)).toBe("A");
    expect(edgeCellName({ ...TWO, turned: true }, "top", 0)).toBe("I");
    expect(edgeCellName(TWO, "left", 0)).toBe("11");
    expect(edgeCellName({ ...TWO, turned: true }, "left", 0)).toBe("1");
  });

  it("puts an edge of the board on the other edge of a turned screen", () => {
    expect(screenSide("top", false)).toBe("top");
    expect(screenSide("top", true)).toBe("bottom");
    expect(screenSide("left", true)).toBe("right");
  });
});

describe("the fields", () => {
  it("gives every cell one of three kinds, the same for both players", () => {
    const kinds = new Set<number>();
    for (let row = 0; row < 11; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        const kind = plotKind(row, col, 11);
        expect([0, 1, 2]).toContain(kind);
        kinds.add(kind);
      }
    }
    expect(kinds.size).toBe(3);
  });

  it("keeps the rows of a field inside the field", () => {
    for (const kind of [0, 1, 2]) {
      for (const turned of [false, true]) {
        const path = fieldRows(kind, turned, 100, 100, 30);
        expect(path).not.toBe("");
        const numbers = [...path.matchAll(/-?\d+(\.\d+)?/g)].map(([value]) => Number(value));
        for (const value of numbers) {
          expect(Math.abs(value - 100)).toBeLessThanOrEqual(15);
        }
      }
    }
  });
});

describe("a fence's frame", () => {
  it("has its middle on the crossing, along a row or a column of the screen", () => {
    const along = fenceFrame(TWO, { row: 4, col: 3, dir: "h" });
    expect(along).toMatchObject({ x: 16 + 4 * 30, y: 16 + 5 * 30, along: true });
    expect(along.transform).not.toContain("rotate");

    const across = fenceFrame(TWO, { row: 4, col: 3, dir: "v" });
    expect(across.along).toBe(false);
    expect(across.transform).toContain("rotate(90)");
  });

  it("is a little shorter than two cells, so two in a line read as two", () => {
    expect(fenceFrame(TWO, { row: 4, col: 3, dir: "h" }).length).toBeLessThan(60);
  });

  it("stays thick enough on a small cell", () => {
    expect(fenceFrame({ ...TWO, cell: 18.9 }, { row: 0, col: 0, dir: "h" }).thick).toBe(4.5);
  });

  it("is at the same place for both players' screens, seen turned", () => {
    const turned = { ...TWO, turned: true };
    const frame = fenceFrame(turned, { row: 4, col: 3, dir: "h" });

    expect(frame).toMatchObject({ x: 16 + (9 - 4) * 30, y: 16 + (11 - 5) * 30 });
  });
});

describe("the gates", () => {
  it("keeps a post and the names large enough to read", () => {
    expect(gatePost(18.9, 14)).toBeGreaterThanOrEqual(11);
    expect(labelSize(14)).toBeGreaterThanOrEqual(10);
    expect(labelSize(40)).toBeLessThanOrEqual(15);
  });

  it("maps a gate drawn along the top onto each edge", () => {
    expect(gateTransform("top", 300, 400)).toBe("matrix(1 0 0 1 0 0)");
    expect(gateTransform("bottom", 300, 400)).toBe("matrix(1 0 0 -1 0 400)");
    expect(gateTransform("left", 300, 400)).toBe("matrix(0 1 1 0 0 0)");
    expect(gateTransform("right", 300, 400)).toBe("matrix(0 1 -1 0 300 0)");
  });
});

describe("the pawns in a cell", () => {
  it("gives each pawn its own place", () => {
    for (const count of [1, 2, 3, 4]) {
      const places = hatPlaces(TWO, { row: 5, col: 4 }, count);
      expect(places).toHaveLength(count);
      expect(new Set(places.map(({ x, y }) => `${x}:${y}`)).size).toBe(count);
    }
  });

  it("keeps them inside the cell", () => {
    const centre = { x: 16 + 4.5 * 30, y: 16 + 5.5 * 30 };
    for (const count of [2, 4]) {
      for (const { x, y, radius } of hatPlaces(TWO, { row: 5, col: 4 }, count)) {
        expect(Math.abs(x - centre.x) + radius).toBeLessThanOrEqual(15);
        expect(Math.abs(y - centre.y) + radius).toBeLessThanOrEqual(15);
      }
    }
  });
});

describe("fenceOnSide", () => {
  const across = { row: 4, col: 3, dir: "h" as const };
  const along = { row: 4, col: 3, dir: "v" as const };

  it("finds a fence over either of its two cells, on the side it closes", () => {
    expect(fenceOnSide([across], { row: 4, col: 3 }, { dr: 1, dc: 0 })).toBe(across);
    expect(fenceOnSide([across], { row: 4, col: 4 }, { dr: 1, dc: 0 })).toBe(across);
    expect(fenceOnSide([across], { row: 5, col: 3 }, { dr: -1, dc: 0 })).toBe(across);
    expect(fenceOnSide([along], { row: 4, col: 3 }, { dr: 0, dc: 1 })).toBe(along);
    expect(fenceOnSide([along], { row: 5, col: 3 }, { dr: 0, dc: 1 })).toBe(along);
    expect(fenceOnSide([along], { row: 4, col: 4 }, { dr: 0, dc: -1 })).toBe(along);
  });

  it("does not find it on the other sides or past its ends", () => {
    expect(fenceOnSide([across], { row: 4, col: 3 }, { dr: -1, dc: 0 })).toBeUndefined();
    expect(fenceOnSide([across], { row: 4, col: 5 }, { dr: 1, dc: 0 })).toBeUndefined();
    expect(fenceOnSide([along], { row: 6, col: 3 }, { dr: 0, dc: 1 })).toBeUndefined();
  });
});
