import { describe, expect, it } from "vitest";

import {
  addPlayer,
  addRound,
  CARD_SCORE_ERROR,
  CardScoreError,
  type CardScoreErrorCode,
  type CardScoreGroup,
  createGroup,
  deleteRound,
  displayName,
  editRound,
  MAX_PLAYERS,
  MAX_ROUNDS,
  newSessionDraft,
  playerHasScores,
  readGroup,
  removePlayer,
  renameGroup,
  renamePlayer,
  restPlayer,
  returnPlayer,
} from "./group";

const NOW = new Date("2026-11-07T12:00:00.000Z");
const LATER = new Date("2026-11-07T13:00:00.000Z");

const group = (names: readonly string[] = ["Lan", "Minh", "Hùng", "Tú"], name = "") =>
  createGroup({ id: "g1", name, playerNames: names }, NOW);

const expectCode = (run: () => unknown, code: CardScoreErrorCode) => {
  let caught: unknown;
  try {
    run();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(CardScoreError);
  expect((caught as CardScoreError).code).toBe(code);
};

describe("createGroup", () => {
  it("Tạo nhóm hợp lệ: everyone playing, no round yet, short ids", () => {
    const created = group();
    expect(created.players.map((p) => [p.id, p.name, p.active])).toEqual([
      ["p1", "Lan", true],
      ["p2", "Minh", true],
      ["p3", "Hùng", true],
      ["p4", "Tú", true],
    ]);
    expect(created.rounds).toEqual([]);
    expect(created.nextPlayerId).toBe(5);
    expect(readGroup(created)).toEqual({ kind: "saved", group: created });
  });

  it("Ít hơn hai người, and more than eight", () => {
    expectCode(() => group(["Lan"]), CARD_SCORE_ERROR.tooFewPlayers);
    expectCode(
      () => group(["a", "b", "c", "d", "e", "f", "g", "h", "i"]),
      CARD_SCORE_ERROR.tooManyPlayers,
    );
    expect(group(["a", "b", "c", "d", "e", "f", "g", "h"]).players).toHaveLength(8);
  });

  it("Tên trùng: whatever the case", () => {
    expectCode(() => group(["Lan", "lan"]), CARD_SCORE_ERROR.nameTaken);
  });

  it("a name the app does not accept", () => {
    expectCode(() => group(["Lan", "x".repeat(25)]), CARD_SCORE_ERROR.nameInvalid);
  });

  it("the group's name is optional, up to 40 characters", () => {
    expect(group(undefined, "  Team Dev ").name).toBe("Team Dev");
    expect(group(undefined, "x".repeat(40)).name).toHaveLength(40);
    // Nothing to see in it: no name, rather than a blank title.
    expect(group(undefined, "\u200b \u200b").name).toBe("");
    expectCode(() => group(undefined, "x".repeat(41)), CARD_SCORE_ERROR.groupNameInvalid);
  });
});

describe("displayName", () => {
  it("Nhóm không đặt tên: goes by those playing", () => {
    const unnamed = restPlayer(group(), "p4", NOW);
    expect(displayName(unnamed)).toBe("Lan, Minh, Hùng");
    expect(displayName(group(undefined, "Team Dev"))).toBe("Team Dev");
  });
});

describe("rounds", () => {
  const SCORES = { p1: 5, p2: -5, p3: 0, p4: 0 };

  it("adds a round, with when it was saved", () => {
    const added = addRound(group(), { id: "r1", scores: SCORES }, LATER);
    expect(added.rounds).toEqual([{ id: "r1", at: LATER.toISOString(), scores: SCORES }]);
    expect(added.updatedAt).toBe(LATER.toISOString());
  });

  it("Bấm lưu hai lần: the same round twice is one round", () => {
    const once = addRound(group(), { id: "r1", scores: SCORES }, NOW);
    expect(addRound(once, { id: "r1", scores: SCORES }, LATER)).toBe(once);
  });

  it("saved again with other numbers: the late answer's round is corrected, no second one", () => {
    const once = addRound(group(), { id: "r1", scores: { p1: 5, p2: -5 } }, NOW);
    const again = addRound(once, { id: "r1", scores: { p1: 9, p2: -9 } }, LATER);
    expect(again.rounds).toHaveLength(1);
    expect(again.rounds[0]?.scores).toEqual({ p1: 9, p2: -9 });
    expectCode(
      () => addRound(once, { id: "r1", scores: { p1: 9, p2: 9 } }, LATER),
      CARD_SCORE_ERROR.scoreMismatch,
    );
  });

  it("never a round that does not add up, or beyond the limit", () => {
    expectCode(
      () => addRound(group(), { id: "r1", scores: { p1: 5, p2: 5 } }, NOW),
      CARD_SCORE_ERROR.scoreMismatch,
    );
    expectCode(
      () => addRound(group(), { id: "r1", scores: { p1: 10_000_000, p2: -10_000_000 } }, NOW),
      CARD_SCORE_ERROR.scoreMismatch,
    );
  });

  it("Người chơi bị xoá ở tab khác: a score for someone not in the group is refused", () => {
    expectCode(
      () => addRound(group(), { id: "r1", scores: { p1: 1, p9: -1 } }, NOW),
      CARD_SCORE_ERROR.playerGone,
    );
  });

  it("Quá giới hạn số ván", () => {
    let full: CardScoreGroup = group();
    full = {
      ...full,
      rounds: Array.from({ length: MAX_ROUNDS }, (_, index) => ({
        id: `r${index}`,
        at: NOW.toISOString(),
        scores: {},
      })),
    };
    expectCode(
      () => addRound(full, { id: "new", scores: SCORES }, NOW),
      CARD_SCORE_ERROR.roundLimit,
    );
  });

  it("Sửa ván cũ: new scores, the same time", () => {
    const added = addRound(group(), { id: "r1", scores: SCORES }, NOW);
    const edited = editRound(added, "r1", { p1: 8, p2: -8, p3: 0, p4: 0 }, LATER);
    expect(edited.rounds[0]).toEqual({
      id: "r1",
      at: NOW.toISOString(),
      scores: { p1: 8, p2: -8, p3: 0, p4: 0 },
    });
  });

  it("an edit keeps the sums honest and its players the same", () => {
    const added = addRound(group(), { id: "r1", scores: { p1: 5, p2: -5 } }, NOW);
    expectCode(() => editRound(added, "r1", { p1: 5, p2: 5 }, NOW), CARD_SCORE_ERROR.scoreMismatch);
    expectCode(
      () => editRound(added, "r1", { p1: 5, p2: -5, p3: 0 }, NOW),
      CARD_SCORE_ERROR.playerGone,
    );
    expectCode(() => editRound(added, "r1", { p1: 5, p3: -5 }, NOW), CARD_SCORE_ERROR.playerGone);
    expectCode(() => editRound(added, "gone", { p1: 0, p2: 0 }, NOW), CARD_SCORE_ERROR.roundGone);
  });

  it("Xoá ván", () => {
    const added = addRound(group(), { id: "r1", scores: SCORES }, NOW);
    expect(deleteRound(added, "r1", LATER).rounds).toEqual([]);
    expectCode(() => deleteRound(added, "gone", LATER), CARD_SCORE_ERROR.roundGone);
  });
});

describe("players during a session", () => {
  it("Người mới vào giữa buổi: ids are never used twice", () => {
    const withNam = addPlayer(group(), "Nam", NOW);
    expect(withNam.players.at(-1)).toEqual({ id: "p5", name: "Nam", active: true });
    const without = removePlayer(withNam, "p5", NOW);
    expect(addPlayer(without, "Nam", NOW).players.at(-1)?.id).toBe("p6");
  });

  it("Đã đủ tám người: no ninth playing, none back", () => {
    const eight = group(["a", "b", "c", "d", "e", "f", "g", "h"]);
    expectCode(() => addPlayer(eight, "i", NOW), CARD_SCORE_ERROR.tooManyPlayers);
    const seven = restPlayer(eight, "p1", NOW);
    const full = addPlayer(seven, "i", NOW);
    expectCode(() => returnPlayer(full, "p1", NOW), CARD_SCORE_ERROR.tooManyPlayers);
  });

  it("Đã đủ mười sáu người", () => {
    let many = group(["a", "b", "c", "d", "e", "f", "g", "h"]);
    for (let index = 0; many.players.length < MAX_PLAYERS; index += 1) {
      many = addPlayer(
        restPlayer(many, many.players.find((p) => p.active)?.id ?? "", NOW),
        `n${index}`,
        NOW,
      );
    }
    const resting = restPlayer(many, many.players.find((p) => p.active)?.id ?? "", NOW);
    expectCode(() => addPlayer(resting, "last", NOW), CARD_SCORE_ERROR.playerLimit);
  });

  it("Người chơi nghỉ rồi chơi lại", () => {
    const resting = restPlayer(group(), "p4", NOW);
    expect(resting.players[3]?.active).toBe(false);
    expect(returnPlayer(resting, "p4", NOW).players[3]?.active).toBe(true);
  });

  it("Không còn đủ hai người", () => {
    const two = group(["Lan", "Minh"]);
    expectCode(() => restPlayer(two, "p1", NOW), CARD_SCORE_ERROR.tooFewPlayers);
    expectCode(() => removePlayer(two, "p1", NOW), CARD_SCORE_ERROR.tooFewPlayers);
  });

  it("only one without a score can be removed", () => {
    const played = addRound(group(), { id: "r1", scores: { p1: 1, p2: -1 } }, NOW);
    expect(playerHasScores(played, "p1")).toBe(true);
    expect(playerHasScores(played, "p3")).toBe(false);
    expectCode(() => removePlayer(played, "p1", NOW), CARD_SCORE_ERROR.playerHasScores);
    expect(removePlayer(played, "p3", NOW).players).toHaveLength(3);
  });

  it("Đổi tên: the scores stay with the id", () => {
    const played = addRound(group(), { id: "r1", scores: { p1: 1, p2: -1 } }, NOW);
    const renamed = renamePlayer(played, "p1", "Lan Anh", NOW);
    expect(renamed.players[0]?.name).toBe("Lan Anh");
    expect(renamed.rounds).toEqual(played.rounds);
    expect(renameGroup(renamed, "Team", NOW).name).toBe("Team");
  });

  it("a name may keep its own spelling, not take another's", () => {
    expect(renamePlayer(group(), "p1", "LAN", NOW).players[0]?.name).toBe("LAN");
    expectCode(() => renamePlayer(group(), "p1", "minh", NOW), CARD_SCORE_ERROR.nameTaken);
  });

  it("Thêm trùng tên người đã nghỉ: the error says who has it", () => {
    const resting = restPlayer(group(), "p4", NOW);
    try {
      addPlayer(resting, "Tú", NOW);
      expect.unreachable();
    } catch (error) {
      expect((error as CardScoreError).code).toBe(CARD_SCORE_ERROR.nameTaken);
      expect((error as CardScoreError).player?.id).toBe("p4");
    }
  });

  it("a player who is not there", () => {
    expectCode(() => restPlayer(group(), "p9", NOW), CARD_SCORE_ERROR.playerGone);
  });
});

describe("newSessionDraft", () => {
  it("Buổi mới: the name and those playing now", () => {
    const resting = restPlayer(group(undefined, "Team Dev"), "p4", NOW);
    expect(newSessionDraft(resting)).toEqual({
      name: "Team Dev",
      playerNames: ["Lan", "Minh", "Hùng"],
    });
  });
});

describe("readGroup", () => {
  it("a newer format is not touched, whatever it holds", () => {
    expect(readGroup({ format: 2, anything: true })).toEqual({ kind: "newer" });
  });

  it.each<[string, (saved: CardScoreGroup) => unknown]>([
    ["nothing", () => undefined],
    ["not an object", () => "x"],
    ["an older format", (g) => ({ ...g, format: 0 })],
    ["a score for an unknown player", (g) => withRound(g, { p9: 1 })],
    ["half a point", (g) => withRound(g, { p1: 0.5 })],
    ["a score beyond the limit", (g) => withRound(g, { p1: 10_000_000 })],
    ["two players with one id", (g) => ({ ...g, players: [...g.players, g.players[0]] })],
    ["a player id not below the counter", (g) => ({ ...g, nextPlayerId: 2 })],
    ["two rounds with one id", (g) => withRound(withRound(g, { p1: 0 }), { p1: 0 })],
  ])("%s reads as corrupt", (_, broken) => {
    expect(readGroup(broken(group()))).toEqual({ kind: "corrupt" });
  });

  it("a name that today's rules would refuse still reads", () => {
    const old = { ...group(), players: [{ id: "p1", name: "x".repeat(99), active: true }] };
    expect(readGroup(old).kind).toBe("saved");
  });
});

function withRound(saved: CardScoreGroup, scores: Record<string, number>) {
  return { ...saved, rounds: [...saved.rounds, { id: "same", at: "", scores }] };
}
