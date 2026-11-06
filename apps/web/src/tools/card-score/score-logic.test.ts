import { describe, expect, it } from "vitest";

import {
  nextRow,
  parseScore,
  pressDigits,
  roundState,
  savableScores,
  SCORE_LIMIT,
  type ScoreRow,
  toggleSign,
} from "./score-logic";

const rows = (...raws: readonly string[]): readonly ScoreRow[] =>
  raws.map((raw, index) => ({ playerId: `p${index + 1}`, raw }));

describe("parseScore", () => {
  it.each([
    ["12", 12],
    ["-12", -12],
    ["−12", -12],
    ["+35", 35],
    ["３５", 35],
    ["－５", -5],
    ["  7 ", 7],
    ["007", 7],
    ["0", 0],
    [String(SCORE_LIMIT), SCORE_LIMIT],
    [String(-SCORE_LIMIT), -SCORE_LIMIT],
  ])("reads %j as %d", (raw, score) => {
    expect(parseScore(raw)).toBe(score);
  });

  it("never gives -0", () => {
    expect(Object.is(parseScore("-0"), 0)).toBe(true);
  });

  it.each(["", " ", "-", "−", "+"])("counts %j as nothing typed yet", (raw) => {
    expect(parseScore(raw)).toBe("blank");
  });

  it.each(["12a", "1.000", "1,5", "--1", "1-", "10000000", "99999999999999999999"])(
    "refuses %j",
    (raw) => {
      expect(parseScore(raw)).toBe("invalid");
    },
  );
});

describe("roundState", () => {
  it("Người cuối được tự tính: three typed, the fourth worked out", () => {
    const state = roundState(rows("-10", "-20", "-5", ""));
    expect(state).toEqual({
      kind: "auto",
      playerId: "p4",
      value: 35,
      scores: { p1: -10, p2: -20, p3: -5, p4: 35 },
    });
    expect(savableScores(state)).toEqual({ p1: -10, p2: -20, p3: -5, p4: 35 });
  });

  it("Ô trống ở giữa danh sách: whoever is blank is the one worked out", () => {
    expect(roundState(rows("7", "", "3"))).toMatchObject({ playerId: "p2", value: -10 });
  });

  it("Ô chỉ có dấu trừ: a lone sign is blank", () => {
    expect(roundState(rows("5", "-", "2"))).toMatchObject({
      kind: "auto",
      playerId: "p2",
      value: -7,
    });
  });

  it("Số tự tính bằng 0: 0, never -0, and it can be saved", () => {
    const state = roundState(rows("5", "-5", ""));
    expect(state).toMatchObject({ kind: "auto", value: 0 });
    expect(Object.is(savableScores(state)?.p3, 0)).toBe(true);
  });

  it("Người ngồi ngoài một ván: a typed 0 is a score", () => {
    expect(roundState(rows("10", "-10", "0", "0", ""))).toMatchObject({ kind: "auto", value: 0 });
  });

  it("Có ô sai thì không tự tính: a wrong field wins over every other state", () => {
    expect(roundState(rows("12a", "5", ""))).toEqual({ kind: "invalid", playerIds: ["p1"] });
    expect(roundState(rows("12a", "", ""))).toEqual({ kind: "invalid", playerIds: ["p1"] });
    expect(roundState(rows("1.5", "x"))).toEqual({ kind: "invalid", playerIds: ["p1", "p2"] });
  });

  it("Số tự tính vượt giới hạn: cannot be saved", () => {
    const state = roundState(rows("9000000", "9000000", ""));
    expect(state).toEqual({ kind: "auto-too-large", playerId: "p3" });
    expect(savableScores(state)).toBeNull();
  });

  it("Số tự tính đúng bằng giới hạn: can", () => {
    expect(roundState(rows("9000000", "999999", ""))).toMatchObject({
      kind: "auto",
      value: -SCORE_LIMIT,
    });
  });

  it("Còn hai ô trống", () => {
    const state = roundState(rows("1", "-1", "", ""));
    expect(state).toEqual({ kind: "missing", count: 2 });
    expect(savableScores(state)).toBeNull();
  });

  it("nothing typed is its own state", () => {
    expect(roundState(rows("", "-"))).toEqual({ kind: "empty" });
  });

  it("Điền đủ mà lệch", () => {
    const state = roundState(rows("5", "5", "-5"));
    expect(state).toEqual({ kind: "mismatch", delta: 5 });
    expect(savableScores(state)).toBeNull();
  });

  it("Đã cân, also a round of zeros", () => {
    expect(roundState(rows("5", "-2", "-3"))).toMatchObject({ kind: "balanced" });
    expect(savableScores(roundState(rows("0", "0")))).toEqual({ p1: 0, p2: 0 });
  });
});

describe("the keypad", () => {
  it("Thay số đã nhập: the first digit in a field just chosen replaces its number and sign", () => {
    expect(pressDigits("-10", "5", true)).toBe("5");
    expect(pressDigits("-10", "5", false)).toBe("-105");
  });

  it("Đổi dấu khi chưa có số: a lone minus waits for its digits, even in a chosen field", () => {
    expect(pressDigits("-", "5", true)).toBe("-5");
    expect(pressDigits("", "5", true)).toBe("5");
  });

  it("drops leading zeros, keeps one zero, and takes 00", () => {
    expect(pressDigits("0", "5", false)).toBe("5");
    expect(pressDigits("", "0", false)).toBe("0");
    expect(pressDigits("0", "00", false)).toBe("0");
    expect(pressDigits("12", "00", false)).toBe("1200");
  });

  it("ignores a digit too many", () => {
    expect(pressDigits("1234567", "8", false)).toBe("1234567");
    expect(pressDigits("-1234567", "8", false)).toBe("-1234567");
    expect(pressDigits("123456", "00", false)).toBe("123456");
  });

  it("the sign key turns a number round, or waits on nothing", () => {
    expect(toggleSign("10")).toBe("-10");
    expect(toggleSign("-10")).toBe("10");
    expect(toggleSign("")).toBe("-");
    expect(toggleSign("-")).toBe("");
    // Pasted in another shape.
    expect(toggleSign("+35")).toBe("-35");
    expect(toggleSign("－35")).toBe("35");
    expect(toggleSign(" 7 ")).toBe("-7");
  });
});

describe("nextRow", () => {
  it("Tiếp tới ô trống kế tiếp, going round", () => {
    expect(nextRow(rows("", "1", "2", ""), 2)).toBe(3);
    expect(nextRow(rows("", "1", "2", ""), 3)).toBe(0);
  });

  it("a lone sign is still a blank row", () => {
    expect(nextRow(rows("1", "2", "-"), 0)).toBe(2);
  });

  it("Tiếp khi không còn ô trống: the next one, going round", () => {
    expect(nextRow(rows("1", "2", "3"), 0)).toBe(1);
    expect(nextRow(rows("1", "2", "3"), 2)).toBe(0);
  });

  it("the only blank row, already chosen: the next one", () => {
    expect(nextRow(rows("1", ""), 1)).toBe(0);
  });
});
