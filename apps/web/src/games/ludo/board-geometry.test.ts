import { describe, expect, it } from "vitest";

import {
  fromScreen,
  HIT_CELLS,
  hitRadius,
  HORSE_RISE,
  horseCentre,
  nearestHorse,
  toFramePercent,
  VIEW_BOX,
  VIEW_HEIGHT,
  VIEW_TOP,
} from "./board-geometry";
import { GRID } from "./board-layout";

describe("board geometry", () => {
  it("shows the grid with room above its top row", () => {
    expect(VIEW_BOX).toBe("0 -0.3 15 15.3");
    expect(VIEW_HEIGHT).toBeCloseTo(15.3);
  });

  it("places the corners of the room and of the grid in the frame", () => {
    expect(toFramePercent({ x: 0, y: VIEW_TOP })).toEqual({ left: 0, top: 0 });
    const bottomRight = toFramePercent({ x: GRID, y: GRID });
    expect(bottomRight.left).toBeCloseTo(100);
    expect(bottomRight.top).toBeCloseTo(100);
    // The top of the grid sits the room's height down the frame.
    expect(toFramePercent({ x: 0, y: 0 }).top).toBeCloseTo((0.3 / 15.3) * 100);
  });

  it("turns a point of the screen back into the same point of the board", () => {
    const box = { left: 20, top: 100, width: 300, height: 306 };
    const point = { x: 7.5, y: 3.25 };
    const { left, top } = toFramePercent(point);
    const back = fromScreen(
      box,
      box.left + (left / 100) * box.width,
      box.top + (top / 100) * box.height,
    );
    expect(back.x).toBeCloseTo(point.x);
    expect(back.y).toBeCloseTo(point.y);
  });

  it("puts a horse's visual centre above the centre of its square", () => {
    expect(horseCentre({ x: 8.5, y: 0.5 })).toEqual({ x: 8.5, y: 0.5 - HORSE_RISE });
  });

  it("makes a hit target at least 24 px, and 1.36 cells on a wide board", () => {
    // 360 px wide: a cell is 22 px, 1.36 cells is 30 px.
    expect(hitRadius(330) * 2).toBeCloseTo(HIT_CELLS);
    // A tiny board: 24 px win.
    expect(hitRadius(150) * 2 * (150 / GRID)).toBeCloseTo(24);
  });

  it("finds the nearest horse within the radius, of every horse given", () => {
    const horses = [
      { key: "a", centre: { x: 1, y: 1 } },
      { key: "b", centre: { x: 2, y: 1 } },
    ];
    expect(nearestHorse(horses, { x: 1.6, y: 1 }, 0.7)).toBe("b");
    expect(nearestHorse(horses, { x: 1.4, y: 1 }, 0.7)).toBe("a");
    expect(nearestHorse(horses, { x: 5, y: 5 }, 0.7)).toBeNull();
  });
});
