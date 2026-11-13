import { describe, expect, it } from "vitest";

import { jellyCrewNextOptions } from "./next-map";

const WON = { kind: "win", winners: [0, 1, 2], reason: "filled" } as const;

describe("Độ khó và bản đồ tiếp theo", () => {
  it("Sang bản đồ kế tiếp: suggests the map after the one won, in the setup screen's order", () => {
    expect(jellyCrewNextOptions(WON, { map: "kitchen" })).toEqual({ map: "dessert-shop" });
    expect(jellyCrewNextOptions(WON, { map: "market" })).toEqual({ map: "coconut-grove" });
    expect(jellyCrewNextOptions(WON, { map: "jelly-factory" })).toEqual({ map: "moon-festival" });
  });

  it("Thắng bản đồ cuối: suggests nothing", () => {
    expect(jellyCrewNextOptions(WON, { map: "moon-festival" })).toBeNull();
  });

  it("Bỏ cuộc thì không gợi ý: nothing after a game given up or too long", () => {
    expect(
      jellyCrewNextOptions({ kind: "draw", reason: "resigned" }, { map: "kitchen" }),
    ).toBeNull();
    expect(
      jellyCrewNextOptions({ kind: "draw", reason: "too-long" }, { map: "kitchen" }),
    ).toBeNull();
  });

  it("suggests nothing for options it does not know", () => {
    expect(jellyCrewNextOptions(WON, { map: "castle" })).toBeNull();
    expect(jellyCrewNextOptions(WON, null)).toBeNull();
  });
});
