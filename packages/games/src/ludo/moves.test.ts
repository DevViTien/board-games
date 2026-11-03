import { describe, expect, it } from "vitest";

import { IN_STABLE, LUDO_COLOUR, type LudoColour, OWN_GATE } from "./constants";
import { kickedAt, targetOf } from "./moves";
import { choices, moveHorse, position, roll } from "./test-positions";
import { cellOf, progressAt } from "./track";

const { Red, Blue, Yellow } = LUDO_COLOUR;
const S = IN_STABLE;

/** The progress of a horse of `colour` standing where a Red horse at `redProgress` would. */
function seenFromRed(colour: LudoColour, redProgress: number): number {
  return progressAt(colour, cellOf(Red, redProgress));
}

describe("Ra quân", () => {
  it("Gieo 6 ra quân", () => {
    const state = position({ horses: { 0: [S, S, S, S] }, die: 6 });

    expect(choices(state)).toEqual([0, 1, 2, 3]);
    expect(targetOf(state, 0, 0, 6)).toBe(0);
  });

  it("Gieo số khác không ra quân", () => {
    const state = position({ horses: { 0: [S, 10, S, S] }, die: 5 });

    expect(choices(state)).toEqual([1]);
  });

  it("Ô xuất phát có ngựa mình", () => {
    const state = position({ horses: { 0: [0, S, S, S] }, die: 6 });

    expect(choices(state)).toEqual([0]);
    expect(targetOf(state, 0, 1, 6)).toBeNull();
  });

  it("Ra quân đá ngựa đối thủ", () => {
    const yellowOnRedStart = seenFromRed(Yellow, 0);
    const state = position({ horses: { 0: [S, S, S, S], 2: [yellowOnRedStart] }, die: 6 });

    const after = moveHorse(state, 0);

    expect(after.horses[0]?.[0]).toBe(0);
    expect(after.horses[2]?.[0]).toBe(IN_STABLE);
    expect(after.last).toMatchObject({ kicked: { player: 2, horse: 0, from: yellowOnRedStart } });
  });
});

describe("Đường đi", () => {
  it("Đi tới chân chuồng của mình", () => {
    const state = position({ horses: { 0: [OWN_GATE - 3] }, die: 3 });

    expect(choices(state)).toEqual([0]);
    expect(moveHorse(state, 0).horses[0]?.[0]).toBe(OWN_GATE);
  });

  it("Không đi quá chân chuồng", () => {
    const state = position({ horses: { 0: [OWN_GATE - 2] } });

    expect(targetOf(state, 0, 0, 5)).toBeNull();
    // Rolled 5 with no other horse out: the turn passes.
    expect(roll(state, 5)).toMatchObject({ toMove: 1, die: null, last: { lost: true } });
  });
});

describe("Đi trên đường chung", () => {
  it("Đi đúng số ô", () => {
    // "Ô thứ 10" counts the start cell as 1: progress 9.
    const state = position({ horses: { 0: [9] }, die: 5 });

    expect(moveHorse(state, 0).horses[0]?.[0]).toBe(14);
  });

  it("Không vượt ngựa đối thủ", () => {
    const state = position({ horses: { 0: [20], 1: [seenFromRed(Blue, 22)] } });

    expect(targetOf(state, 0, 0, 4)).toBeNull();
  });

  it("Không vượt ngựa mình", () => {
    const state = position({ horses: { 0: [20, 22] } });

    expect(targetOf(state, 0, 0, 4)).toBeNull();
    expect(targetOf(state, 0, 1, 4)).toBe(26);
  });

  it("Không đứng chung ô với ngựa mình", () => {
    const state = position({ horses: { 0: [20, 24] } });

    expect(targetOf(state, 0, 0, 4)).toBeNull();
  });

  it("Đá ngựa đối thủ", () => {
    const yellow = seenFromRed(Yellow, 24);
    const state = position({ horses: { 0: [20], 2: [S, yellow] }, die: 4 });

    const after = moveHorse(state, 0);

    expect(after.horses[0]?.[0]).toBe(24);
    expect(after.horses[2]?.[1]).toBe(IN_STABLE);
    expect(after.last).toMatchObject({ kicked: { player: 2, horse: 1, from: yellow } });
  });

  it("does not kick when landing on an empty cell", () => {
    const state = position({ horses: { 0: [20] } });

    expect(kickedAt(state, 0, 24)).toBeNull();
  });
});

describe("Gieo 1 nhảy tới chân chuồng kế tiếp", () => {
  it("Nhảy khi đường trống", () => {
    // Progress 4: the next gate (13) is 9 cells ahead.
    const state = position({ horses: { 0: [4] }, die: 1 });

    expect(choices(state)).toEqual([0]);
    expect(targetOf(state, 0, 0, 1)).toBe(13);
  });

  it("Đường bị chắn thì đi 1 ô", () => {
    const state = position({ horses: { 0: [4], 1: [seenFromRed(Blue, 7)] } });

    expect(targetOf(state, 0, 0, 1)).toBe(5);
  });

  it("Chân chuồng có ngựa mình thì đi 1 ô (G1)", () => {
    const state = position({ horses: { 0: [4, 13] } });

    expect(targetOf(state, 0, 0, 1)).toBe(5);
  });

  it("Nhảy tới chân chuồng có ngựa đối thủ (G2)", () => {
    const yellow = seenFromRed(Yellow, 13);
    const state = position({ horses: { 0: [4], 2: [yellow] }, die: 1 });

    const after = moveHorse(state, 0);

    expect(after.horses[0]?.[0]).toBe(13);
    expect(after.horses[2]?.[0]).toBe(IN_STABLE);
  });

  it("Dừng ở chân chuồng của mình (G3)", () => {
    const state = position({ horses: { 0: [45] }, die: 1 });

    const after = moveHorse(state, 0);

    expect(after.horses[0]?.[0]).toBe(OWN_GATE);
  });

  it("Đứng trên một chân chuồng: jumps to the next one, 14 cells on (G4)", () => {
    // Progress 13 is Blue's gate.
    const state = position({ horses: { 0: [13] } });

    expect(targetOf(state, 0, 0, 1)).toBe(27);
  });

  it("Chân chuồng của màu không có người chơi (G6)", () => {
    const state = position({ players: 2, horses: { 0: [6] }, die: 1 });

    expect(targetOf(state, 0, 0, 1)).toBe(13);
  });

  it("goes up to step 1 from its own gate instead of jumping (G5)", () => {
    const state = position({ horses: { 0: [OWN_GATE] } });

    expect(targetOf(state, 0, 0, 1)).toBe(OWN_GATE + 1);
  });

  it("offers only the jump for a horse that can jump, the player still choosing the horse (G7)", () => {
    const state = position({ horses: { 0: [4, 30] }, die: 1 });

    expect(choices(state)).toEqual([0, 1]);
    expect(targetOf(state, 0, 0, 1)).toBe(13);
    expect(targetOf(state, 0, 1, 1)).toBe(41);
  });

  it("jumps from one cell before a gate: the jump is a single cell", () => {
    const state = position({ horses: { 0: [12] } });

    expect(targetOf(state, 0, 0, 1)).toBe(13);
  });

  it("moves one cell onto a horse just ahead and kicks it", () => {
    const blue = seenFromRed(Blue, 5);
    const state = position({ horses: { 0: [4], 1: [blue] }, die: 1 });

    const after = moveHorse(state, 0);

    expect(after.horses[0]?.[0]).toBe(5);
    expect(after.horses[1]?.[0]).toBe(IN_STABLE);
  });
});

describe("Lên chuồng đích", () => {
  it("Lên thẳng bậc 4", () => {
    const state = position({ horses: { 0: [OWN_GATE] }, die: 4 });

    expect(moveHorse(state, 0).horses[0]?.[0]).toBe(OWN_GATE + 4);
  });

  it("Bậc thấp hơn bị chắn (G8)", () => {
    const state = position({ horses: { 0: [OWN_GATE, OWN_GATE + 2] } });

    expect(targetOf(state, 0, 0, 4)).toBeNull();
    expect(targetOf(state, 0, 0, 2)).toBeNull();
    expect(targetOf(state, 0, 0, 1)).toBe(OWN_GATE + 1);
  });

  it("Lên từng bậc", () => {
    const state = position({ horses: { 0: [OWN_GATE + 3] } });

    expect(targetOf(state, 0, 0, 4)).toBe(OWN_GATE + 4);
  });

  it("Gieo sai số không lên bậc", () => {
    const state = position({ horses: { 0: [OWN_GATE + 3] } });

    expect(targetOf(state, 0, 0, 5)).toBeNull();
    expect(targetOf(state, 0, 0, 3)).toBeNull();
  });

  it("does not climb onto a taken step", () => {
    const state = position({ horses: { 0: [OWN_GATE + 3, OWN_GATE + 4] } });

    expect(targetOf(state, 0, 0, 4)).toBeNull();
  });

  it("Bậc 6 không đi nữa", () => {
    const state = position({ horses: { 0: [OWN_GATE + 6] } });

    for (const face of [1, 2, 3, 4, 5, 6]) expect(targetOf(state, 0, 0, face)).toBeNull();
  });

  it("never kicks a horse in a home column", () => {
    const state = position({ horses: { 0: [OWN_GATE + 2] } });

    expect(kickedAt(state, 1, OWN_GATE + 2)).toBeNull();
  });
});
