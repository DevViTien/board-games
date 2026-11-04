import { describe, expect, it } from "vitest";

import {
  ABANDON_AFTER_MS,
  abandonClaim,
  type AbandonClaimView,
  leaveOutcome,
  type SeatPlay,
  seatPlays,
} from "./leaving";

const SELF = "self";
const STAND_IN = "stand-in";
const AI = "ai";

describe("seatPlays", () => {
  it("reads how each seat is played", () => {
    expect(
      seatPlays([
        { kind: "human", standIn: false },
        { kind: "human", standIn: true },
        { kind: "ai" },
        null,
      ]),
    ).toEqual([SELF, STAND_IN, AI, null]);
  });
});

describe("leaveOutcome", () => {
  it("ends a two-seat game, even of a game the AI plays (Cờ cá ngựa for two)", () => {
    expect(leaveOutcome([SELF, SELF], 1, true)).toBe("end");
  });

  it("hands the seat to the AI in a room of three while someone else plays", () => {
    expect(leaveOutcome([SELF, SELF, SELF], 1, true)).toBe("stand-in");
    expect(leaveOutcome([SELF, SELF, AI, AI], 0, true)).toBe("stand-in");
  });

  it("ends the game when the last player who plays their own seat leaves", () => {
    expect(leaveOutcome([STAND_IN, SELF, STAND_IN], 1, true)).toBe("end");
    expect(leaveOutcome([SELF, AI, AI, AI], 0, true)).toBe("end");
  });

  it("ends the game of a game the AI does not play, whatever the seats", () => {
    expect(leaveOutcome([SELF, SELF, SELF], 1, false)).toBe("end");
  });
});

describe("abandonClaim", () => {
  const ludo: readonly SeatPlay[] = [SELF, SELF, SELF];
  const claim = (view: Partial<AbandonClaimView>) =>
    abandonClaim({
      seats: ludo,
      toMove: 1,
      claimer: 0,
      turnIdleMs: ABANDON_AFTER_MS,
      ...view,
    });

  it("lets another seated player claim a turn of five minutes", () => {
    expect(ABANDON_AFTER_MS).toBe(300_000);
    expect(claim({})).toBe("ok");
  });

  it("is too early before five minutes", () => {
    expect(claim({ turnIdleMs: ABANDON_AFTER_MS - 10_000 })).toBe("too-early");
  });

  it("takes another threshold when given one", () => {
    expect(abandonClaim({ seats: ludo, toMove: 1, claimer: 0, turnIdleMs: 3_000 }, 2_000)).toBe(
      "ok",
    );
  });

  it("refuses a claim on one's own turn", () => {
    expect(claim({ claimer: 1 })).toBe("not-claimable");
  });

  it("refuses a claim on a seat the AI plays", () => {
    expect(claim({ seats: [SELF, AI, SELF] })).toBe("not-claimable");
    expect(claim({ seats: [SELF, STAND_IN, SELF] })).toBe("not-claimable");
  });

  it("refuses someone without a seat, or a turn that is not running", () => {
    expect(claim({ claimer: null })).toBe("not-claimable");
    expect(claim({ claimer: 5 })).toBe("not-claimable");
    expect(claim({ turnIdleMs: null })).toBe("not-claimable");
  });

  it("lets a player the AI stands in for claim the last player who plays", () => {
    expect(claim({ seats: [STAND_IN, SELF, STAND_IN] })).toBe("ok");
  });
});
