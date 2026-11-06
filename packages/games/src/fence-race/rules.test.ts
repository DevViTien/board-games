import {
  createRng,
  createSession,
  currentState,
  ENGINE_ERROR,
  playMove,
} from "@board-games/engine";
import { describe, expect, it } from "vitest";

import { type Fence, fenceRaceDistance } from "./board";
import { FENCE_RACE_ISSUE, FENCE_RACE_REASON } from "./constants";
import { fenceRace, fenceRaceFenceIssue, type FenceRaceMove } from "./rules";
import { cell, colFence, legalKeys, position, rowFence, stepTo } from "./test-positions";

const fenceMove = (fence: { row: number; col: number; dir: "h" | "v" }): FenceRaceMove => ({
  kind: "fence",
  ...fence,
});
const breakMove = (fence: { row: number; col: number; dir: "h" | "v" }): FenceRaceMove => ({
  kind: "break",
  ...fence,
});
const keyOf = fenceRace.moveKey;

describe("Bàn và người chơi", () => {
  it("Ván mới hai người", () => {
    const state = fenceRace.setup({ playerCount: 2, options: {} });

    expect(state.rows).toBe(11);
    expect(state.columns).toBe(9);
    expect(state.pawns).toEqual([cell("E1"), cell("E11")]);
    expect(state.fencesLeft).toEqual([9, 9]);
    expect(state.breaksLeft).toEqual([1, 1]);
    expect(fenceRace.currentPlayer(state)).toBe(0);
    expect(state.lastFrom).toBeNull();
  });

  it("Ván mới bốn người", () => {
    const state = fenceRace.setup({ playerCount: 4, options: {} });

    expect([state.rows, state.columns]).toEqual([9, 9]);
    // Bottom, left, top, right.
    expect(state.pawns).toEqual([cell("E1", 4), cell("A5", 4), cell("E9", 4), cell("I5", 4)]);
    expect(state.fencesLeft).toEqual([4, 4, 4, 4]);
    expect(state.breaksLeft).toEqual([1, 1, 1, 1]);
  });

  it("Ván mới ba người", () => {
    const state = fenceRace.setup({ playerCount: 3, options: {} });

    expect([state.rows, state.columns]).toEqual([9, 9]);
    // Bottom, top, left.
    expect(state.pawns).toEqual([cell("E1", 3), cell("E9", 3), cell("A5", 3)]);
    expect(state.fencesLeft).toEqual([6, 6, 6]);
    expect(state.breaksLeft).toEqual([1, 1, 1]);
  });

  it("has no rule options", () => {
    expect(fenceRace.defaultOptions).toEqual({});
    expect("optionChoices" in fenceRace).toBe(false);
    expect(fenceRace.meta.players).toEqual({ min: 2, max: 4 });
  });

  it("gives the turn to each seat in order", () => {
    let state = fenceRace.setup({ playerCount: 4, options: {} });
    const seen: number[] = [];
    for (let move = 0; move < 5; move += 1) {
      seen.push(fenceRace.currentPlayer(state));
      const [first] = fenceRace.legalMoves(state);
      if (first === undefined) throw new Error("no move");
      state = fenceRace.applyMove(state, first);
    }
    expect(seen).toEqual([0, 1, 2, 3, 0]);
  });
});

describe("Mỗi lượt một việc", () => {
  it("Đặt rào thì không đi quân", () => {
    const state = position();
    const after = fenceRace.applyMove(state, fenceMove(rowFence(5, "C")));

    expect(after.pawns).toEqual(state.pawns);
    expect(after.fencesLeft).toEqual([8, 9]);
    expect(after.fences).toEqual([rowFence(5, "C")]);
    expect(fenceRace.currentPlayer(after)).toBe(1);
    expect(after.moveCount).toBe(1);
  });

  it("Nước không hợp lệ bị từ chối", () => {
    const started = createSession(fenceRace, { playerCount: 2, options: {} });
    if (!started.ok) throw new Error(started.error);
    const before = currentState(started.value);

    const refused = playMove(fenceRace, started.value, stepTo("E3"), createRng(1));

    expect(refused).toEqual({ ok: false, error: ENGINE_ERROR.IllegalMove });
    expect(currentState(started.value)).toBe(before);
    expect(fenceRace.currentPlayer(currentState(started.value))).toBe(0);
  });
});

describe("Đi quân", () => {
  it("goes one cell along a row or a column, and not outside the board", () => {
    // In a corner, only two steps.
    const state = position({ pawns: ["A1", "E11"] });
    const steps = fenceRace.legalMoves(state).filter((move) => move.kind === "step");

    expect(steps.map(keyOf).toSorted()).toEqual(
      [keyOf(stepTo("A2")), keyOf(stepTo("B1"))].toSorted(),
    );
  });

  it("never goes diagonally or two cells at once", () => {
    const keys = legalKeys(position({ pawns: ["E5", "A11"] }));

    for (const name of ["D4", "D6", "F4", "F6", "E7", "E3", "C5", "G5"]) {
      expect(keys).not.toContain(keyOf(stepTo(name)));
    }
    for (const name of ["E6", "E4", "D5", "F5"]) expect(keys).toContain(keyOf(stepTo(name)));
  });

  it("Bị rào ngăn", () => {
    // Between rows 5 and 6, over columns E and F.
    const keys = legalKeys(position({ pawns: ["E5", "A11"], fences: [rowFence(5, "E")] }));

    expect(keys).not.toContain(keyOf(stepTo("E6")));
    for (const name of ["E4", "D5", "F5"]) expect(keys).toContain(keyOf(stepTo(name)));
  });

  it.each([
    ["below", rowFence(4, "E"), "E4"],
    ["on the left", colFence("D", 5), "D5"],
    ["on the right", colFence("E", 5), "F5"],
  ])("does not go through a fence %s", (_side, fence, name) => {
    expect(legalKeys(position({ pawns: ["E5", "A11"], fences: [fence] }))).not.toContain(
      keyOf(stepTo(name)),
    );
  });

  it("Đứng chung ô", () => {
    const state = position({ pawns: ["E5", "E6"] });
    expect(legalKeys(state)).toContain(keyOf(stepTo("E6")));

    const after = fenceRace.applyMove(state, stepTo("E6"));

    expect(after.pawns).toEqual([cell("E6"), cell("E6")]);
  });

  it("lets all four pawns share a cell", () => {
    const state = position({ players: 4, pawns: ["E4", "E5", "E5", "E5"] });

    const after = fenceRace.applyMove(state, stepTo("E5", 4));

    expect(after.pawns).toEqual([cell("E5", 4), cell("E5", 4), cell("E5", 4), cell("E5", 4)]);
  });

  it("Không nhảy qua quân", () => {
    const keys = legalKeys(position({ pawns: ["E5", "E6"] }));

    expect(keys).not.toContain(keyOf(stepTo("E7")));
  });

  it("remembers the cell a step left, until the next move that is not a step", () => {
    const state = position();

    const stepped = fenceRace.applyMove(state, stepTo("E2"));
    expect(stepped.lastFrom).toEqual(cell("E1"));

    const fenced = fenceRace.applyMove(stepped, fenceMove(rowFence(2, "A")));
    expect(fenced.lastFrom).toBeNull();
  });
});

describe("Đặt rào", () => {
  it("places a fence in every free position when the board is empty", () => {
    const fences = fenceRace.legalMoves(position()).filter((move) => move.kind === "fence");

    // 10 × 8 crossings, two directions each.
    expect(fences).toHaveLength(160);
  });

  it("Rào đè nhau", () => {
    const state = position({ fences: [rowFence(4, "C")] });
    const fence = rowFence(4, "D");

    expect(legalKeys(state)).not.toContain(keyOf(fenceMove(fence)));
    expect(fenceRaceFenceIssue(state, fence)).toEqual({
      code: FENCE_RACE_ISSUE.Overlap,
      fence: rowFence(4, "C"),
    });
    // The same place, and a place along the column.
    expect(fenceRaceFenceIssue(state, rowFence(4, "C"))?.code).toBe(FENCE_RACE_ISSUE.Overlap);
    const columns = position({ fences: [colFence("C", 4)] });
    expect(fenceRaceFenceIssue(columns, colFence("C", 5))?.code).toBe(FENCE_RACE_ISSUE.Overlap);
    // Two cells along, they only touch.
    expect(fenceRaceFenceIssue(state, rowFence(4, "E"))).toBeNull();
  });

  it("Rào cắt nhau", () => {
    const fence = rowFence(4, "C");
    const state = position({ fences: [fence] });
    const across = colFence("C", 4);

    // The same crossing: the same anchor, the other way.
    expect({ row: across.row, col: across.col }).toEqual({ row: fence.row, col: fence.col });
    expect(legalKeys(state)).not.toContain(keyOf(fenceMove(across)));
    expect(fenceRaceFenceIssue(state, across)).toEqual({ code: FENCE_RACE_ISSUE.Cross, fence });
    // At the fence's end: not its middle, so allowed.
    expect(fenceRaceFenceIssue(state, colFence("B", 4))).toBeNull();
  });

  it("Hết rào", () => {
    const state = position({ fencesLeft: [0, 9] });

    expect(fenceRace.legalMoves(state).some((move) => move.kind === "fence")).toBe(false);
    expect(fenceRaceFenceIssue(state, rowFence(4, "C"))).toEqual({
      code: FENCE_RACE_ISSUE.NoFences,
    });
  });

  it.each([
    [{ row: -1, col: 0, dir: "h" as const }],
    [{ row: 0, col: -1, dir: "v" as const }],
    [{ row: 10, col: 0, dir: "h" as const }],
    [{ row: 0, col: 8, dir: "v" as const }],
  ])("refuses a fence off the board: %o", (fence) => {
    expect(fenceRaceFenceIssue(position(), fence)).toEqual({ code: FENCE_RACE_ISSUE.OutOfBoard });
  });

  it("keeps the fences in one order, whatever order they were placed in", () => {
    const [first, second] = [rowFence(8, "A"), colFence("F", 2)];
    const one = fenceRace.applyMove(
      fenceRace.applyMove(position(), fenceMove(first)),
      fenceMove(second),
    );
    const other = fenceRace.applyMove(
      fenceRace.applyMove(position(), fenceMove(second)),
      fenceMove(first),
    );

    expect(one.fences).toEqual(other.fences);
  });
});

describe("Luôn còn đường về đích", () => {
  // The pawn at I1 in a corner: closed above already, so its only way out is to the left.
  const corner = [rowFence(1, "H")];
  const lastWay = colFence("G", 1);

  it("Bịt kín đường của đối thủ", () => {
    const state = position({ pawns: ["I1", "A11"], fences: corner, toMove: 1 });

    expect(legalKeys(state)).not.toContain(keyOf(fenceMove(lastWay)));
    expect(fenceRaceFenceIssue(state, lastWay)).toEqual({
      code: FENCE_RACE_ISSUE.Seals,
      seats: [0],
    });
  });

  it("Bịt kín đường của chính mình", () => {
    const state = position({ pawns: ["I1", "A11"], fences: corner, toMove: 0 });

    expect(legalKeys(state)).not.toContain(keyOf(fenceMove(lastWay)));
    expect(fenceRaceFenceIssue(state, lastWay)).toEqual({
      code: FENCE_RACE_ISSUE.Seals,
      seats: [0],
    });
  });

  it("refuses a fence that seals a third player, and names everyone it seals", () => {
    // Seat 2 of three (from the left, gate on the right), in the same corner as seat 0.
    const state = position({
      players: 3,
      pawns: ["I1", "A9", "H1"],
      fences: [rowFence(1, "H", 3)],
      toMove: 1,
    });

    expect(fenceRaceFenceIssue(state, colFence("G", 1, 3))).toEqual({
      code: FENCE_RACE_ISSUE.Seals,
      seats: [0, 2],
    });
  });

  it("refuses a pocket with cells of the gate's edge but no way to the gate", () => {
    // Seat 0 at A11 on the top edge: the pocket A11, B11, A10, B10 holds top cells outside the gate.
    const state = position({
      pawns: ["B10", "E11"],
      fences: [rowFence(9, "A")],
      toMove: 1,
    });

    expect(fenceRaceDistance(state, 0)).toBe(2);
    expect(fenceRaceFenceIssue(state, colFence("B", 10))).toEqual({
      code: FENCE_RACE_ISSUE.Seals,
      seats: [0],
    });
  });

  it("Quân khác không chắn đường", () => {
    // Seat 0 at H1, closed above and on the right: its only way out is G1, where seat 1 stands.
    const state = position({
      pawns: ["H1", "G1"],
      fences: [rowFence(1, "G"), colFence("H", 1)],
    });
    const away = rowFence(5, "A");

    expect(fenceRaceFenceIssue(state, away)).toBeNull();
    expect(legalKeys(state)).toContain(keyOf(stepTo("G1")));
    // Counted through the other pawn: left to G1 and F1, then up ten rows.
    expect(fenceRaceDistance(state, 0)).toBe(12);
  });

  it("allows a fence that only makes a way longer", () => {
    const state = position({ pawns: ["E1", "E11"] });
    const fence = rowFence(1, "E");

    expect(fenceRaceFenceIssue(state, fence)).toBeNull();
    expect(fenceRaceDistance(state, 0)).toBe(10);
    expect(fenceRaceDistance(fenceRace.applyMove(state, fenceMove(fence)), 0)).toBe(11);
  });

  it("counts the steps to the gate, not to the edge", () => {
    // At A10: one step to A11 reaches the top edge but not its gate, which starts at column C.
    expect(fenceRaceDistance(position({ pawns: ["A10", "E11"] }), 0)).toBe(3);
  });
});

describe("Phá rào", () => {
  const fence = rowFence(6, "C");

  it("Phá rào của người khác", () => {
    const placed = fenceRace.applyMove(position({ toMove: 1 }), fenceMove(fence));
    expect(placed.toMove).toBe(0);
    expect(placed.fencesLeft).toEqual([9, 8]);

    const broken = fenceRace.applyMove(placed, breakMove(fence));

    expect(broken.fences).toEqual([]);
    expect(broken.breaksLeft).toEqual([0, 1]);
    // No fence goes back to anyone.
    expect(broken.fencesLeft).toEqual([9, 8]);
    expect(broken.toMove).toBe(1);
  });

  it("Đã phá một lần", () => {
    const state = position({ fences: [fence], breaksLeft: [0, 1] });

    expect(fenceRace.legalMoves(state).some((move) => move.kind === "break")).toBe(false);
    expect(
      fenceRace.legalMoves({ ...state, toMove: 1 }).some((move) => move.kind === "break"),
    ).toBe(true);
  });

  it("Chưa có rào", () => {
    expect(fenceRace.legalMoves(position()).some((move) => move.kind === "break")).toBe(false);
  });

  it("offers every fence on the board, whoever placed it", () => {
    const fences = [fence, colFence("F", 2)];
    const breaks = fenceRace
      .legalMoves(position({ fences }))
      .filter((move) => move.kind === "break");

    expect(breaks.map(keyOf).toSorted()).toEqual(
      fences.map((one) => keyOf(breakMove(one))).toSorted(),
    );
  });

  it("frees the place: a fence can go back where one was broken", () => {
    const state = position({ fences: [fence] });
    expect(legalKeys(state)).not.toContain(keyOf(fenceMove(fence)));

    const broken = fenceRace.applyMove(state, breakMove(fence));

    expect(legalKeys(broken)).toContain(keyOf(fenceMove(fence)));
  });
});

describe("Thắng khi về đích", () => {
  it.each(["C1", "D1", "E1", "F1", "G1"])("Về đích: seat two reaches %s", (name) => {
    const above = `${name[0]}2`;
    const state = position({ pawns: ["A5", above], toMove: 1 });

    const after = fenceRace.applyMove(state, stepTo(name));

    expect(fenceRace.result(after)).toEqual({
      kind: "win",
      winners: [1],
      reason: FENCE_RACE_REASON.Goal,
    });
    expect(fenceRace.legalMoves(after)).toEqual([]);
    expect(fenceRace.candidateMoves(after)).toEqual([]);
  });

  it.each(["A1", "B1", "H1", "I1"])("Ô ngoài cổng không tính: %s", (name) => {
    const above = `${name[0]}2`;
    const state = position({ pawns: ["A5", above], toMove: 1 });

    const after = fenceRace.applyMove(state, stepTo(name));

    expect(fenceRace.result(after)).toBeNull();
  });

  it("Ô ngoài cổng không tính: the pawn walks along the edge into the gate", () => {
    const state = position({ pawns: ["A5", "B1"], toMove: 1 });

    const after = fenceRace.applyMove(state, stepTo("C1"));

    expect(fenceRace.result(after)?.kind).toBe("win");
    expect(fenceRaceDistance(state, 1)).toBe(1);
  });

  it("Ô ngoài cổng không tính: a fence along the edge keeps the pawn out", () => {
    const state = position({ pawns: ["A5", "B1"], fences: [colFence("B", 1)], toMove: 1 });

    expect(legalKeys(state)).not.toContain(keyOf(stepTo("C1")));
    expect(fenceRaceDistance(state, 1)).toBe(5);
  });

  it("Cổng của người khác không tính", () => {
    // Seat 0 of four, going up, steps onto the left edge's gate of seat 3 and the right's of seat 1.
    const left = position({ players: 4, pawns: ["B5"] });
    expect(fenceRace.result(fenceRace.applyMove(left, stepTo("A5", 4)))).toBeNull();
    const right = position({ players: 4, pawns: ["H5"] });
    expect(fenceRace.result(fenceRace.applyMove(right, stepTo("I5", 4)))).toBeNull();
    // And onto the gate on its own starting edge, seat 2's.
    const own = position({ players: 4, pawns: ["E2"] });
    expect(fenceRace.result(fenceRace.applyMove(own, stepTo("E1", 4)))).toBeNull();
  });

  it("ends a game of four as soon as one player arrives", () => {
    const state = position({ players: 4, pawns: ["E8"] });

    const after = fenceRace.applyMove(state, stepTo("E9", 4));

    expect(fenceRace.result(after)).toEqual({
      kind: "win",
      winners: [0],
      reason: FENCE_RACE_REASON.Goal,
    });
  });

  it.each([
    [0, "E8", "E9"],
    [1, "H5", "I5"],
    [2, "E2", "E1"],
    [3, "B5", "A5"],
  ])("seat %i of four arrives in the gate opposite its start", (seat, from, to) => {
    const pawns: (string | undefined)[] = [undefined, undefined, undefined, undefined];
    pawns[seat] = from;
    const after = fenceRace.applyMove(position({ players: 4, pawns, toMove: seat }), stepTo(to, 4));

    expect(fenceRace.result(after)).toMatchObject({ winners: [seat] });
  });

  it("the gate on the left and right edges is rows 3 to 7", () => {
    for (const [row, wins] of [
      [2, false],
      [3, true],
      [7, true],
      [8, false],
    ] as const) {
      const state = position({ players: 4, pawns: [undefined, `H${row}`], toMove: 1 });
      const after = fenceRace.applyMove(state, stepTo(`I${row}`, 4));
      expect(fenceRace.result(after) !== null, `row ${row}`).toBe(wins);
    }
  });
});

describe("Giới hạn lượt", () => {
  /** A position just before the last move, seat 0 to move a step that does not arrive. */
  const lastMove = (pawns: readonly string[], players = 2, moveCount = 199, toMove = 0) =>
    position({ players, pawns, moveCount, toMove });

  it("Hết lượt có người gần đích hơn", () => {
    const after = fenceRace.applyMove(lastMove(["E8", "E7"]), stepTo("E9"));

    expect(after.moveCount).toBe(200);
    expect(fenceRace.result(after)).toEqual({
      kind: "win",
      winners: [0],
      reason: FENCE_RACE_REASON.TurnLimit,
    });
    expect(fenceRace.legalMoves(after)).toEqual([]);
  });

  it("Hết lượt bằng nhau", () => {
    // Seat 0 ends on E9, two steps from row 11; seat 1 at E3, two steps from row 1.
    const after = fenceRace.applyMove(lastMove(["E8", "E3"]), stepTo("E9"));

    expect(fenceRace.result(after)).toEqual({ kind: "draw", reason: FENCE_RACE_REASON.TurnLimit });
  });

  it("ends in a draw between any two nearest, even with other players further away", () => {
    // Four players: seats 0 and 2 both one step from their gates, seats 1 and 3 further.
    const state = position({
      players: 4,
      pawns: ["E7", "A5", "E2", "I5"],
      moveCount: 199,
      toMove: 0,
    });

    const after = fenceRace.applyMove(state, stepTo("E8", 4));

    expect(fenceRace.result(after)).toEqual({ kind: "draw", reason: FENCE_RACE_REASON.TurnLimit });
  });

  it("Về đích ở nước cuối", () => {
    const after = fenceRace.applyMove(lastMove(["E10", "E2"]), stepTo("E11"));

    expect(fenceRace.result(after)).toEqual({
      kind: "win",
      winners: [0],
      reason: FENCE_RACE_REASON.Goal,
    });
  });

  it("counts a fence or a break as a move of the game", () => {
    const fenced = fenceRace.applyMove(lastMove(["E8", "E7"]), fenceMove(rowFence(1, "A")));
    expect(fenceRace.result(fenced)?.reason).toBe(FENCE_RACE_REASON.TurnLimit);

    const broken = fenceRace.applyMove(
      position({ pawns: ["E8", "E7"], moveCount: 199, fences: [rowFence(1, "A")] }),
      breakMove(rowFence(1, "A")),
    );
    expect(fenceRace.result(broken)?.reason).toBe(FENCE_RACE_REASON.TurnLimit);
  });

  it("is 198 moves with three players, 200 with two and four", () => {
    const three = fenceRace.applyMove(
      lastMove(["E1", "E9", "A5"], 3, 197),
      fenceMove(rowFence(1, "A", 3)),
    );
    expect(three.moveCount).toBe(198);
    expect(fenceRace.result(three)?.reason).toBe(FENCE_RACE_REASON.TurnLimit);

    const notYet = fenceRace.applyMove(
      lastMove(["E1", "E9", "A5"], 3, 196),
      fenceMove(rowFence(1, "A", 3)),
    );
    expect(fenceRace.result(notYet)).toBeNull();

    const four = fenceRace.applyMove(
      lastMove(["E1", "A5", "E9", "I5"], 4, 198),
      fenceMove(rowFence(1, "A", 4)),
    );
    expect(fenceRace.result(four)).toBeNull();
  });
});

describe("moveKey", () => {
  it("names each kind of move as the design says", () => {
    expect(keyOf({ kind: "step", row: 3, col: 4 })).toBe("s:3:4");
    expect(keyOf({ kind: "fence", row: 3, col: 4, dir: "h" })).toBe("f:h:3:4");
    expect(keyOf({ kind: "break", row: 3, col: 4, dir: "v" })).toBe("b:v:3:4");
  });
});

describe("Dữ liệu sai dạng từ ngoài vào", () => {
  const NOT_MOVES: readonly (readonly [string, unknown])[] = [
    ["no kind", { row: 4, col: 3, dir: "h" }],
    ["an unknown kind", { kind: "zzz", row: 4, col: 3, dir: "h" }],
    ["a null kind", { kind: null, row: 4, col: 3, dir: "h" }],
    ["a kind from Object", { kind: "constructor", row: 4, col: 3, dir: "h" }],
    ["half a row", { kind: "fence", row: 1.5, col: 3, dir: "h" }],
    ["a row that is no number", { kind: "fence", row: Number.NaN, col: 3, dir: "h" }],
    ["a row as text", { kind: "fence", row: "1", col: 3, dir: "h" }],
    ["an unknown direction", { kind: "fence", row: 1, col: 3, dir: "x" }],
    ["no direction", { kind: "break", row: 1, col: 3 }],
    ["a step to half a cell", { kind: "step", row: 9.5, col: 4 }],
    ["a step as text", { kind: "step", row: "9", col: 4 }],
  ];

  it.each(NOT_MOVES)("is not a move: %s", (_name, move) => {
    expect(() => fenceRace.moveKey(move as FenceRaceMove)).toThrow();
  });

  it.each(NOT_MOVES)("playMove refuses %s, and it costs no fence and no break", (_name, move) => {
    const fence = rowFence(4, "C");
    const started = createSession(fenceRace, { playerCount: 2, options: {} });
    if (!started.ok) throw new Error(started.error);
    const placed = playMove(fenceRace, started.value, { kind: "fence", ...fence }, createRng(1));
    if (!placed.ok) throw new Error(placed.error);
    const replied = playMove(fenceRace, placed.value, stepTo("E10"), createRng(1));
    if (!replied.ok) throw new Error(replied.error);

    const refused = playMove(fenceRace, replied.value, move as FenceRaceMove, createRng(1));

    expect(refused.ok).toBe(false);
    const now = currentState(replied.value);
    expect(now.breaksLeft).toEqual([1, 1]);
    expect(now.fences).toEqual([fence]);
  });

  it.each([
    ["half a row", { row: 1.5, col: 3, dir: "h" }],
    ["half a column", { row: 1, col: 3.5, dir: "h" }],
    ["no number", { row: Number.NaN, col: 3, dir: "h" }],
    ["infinity", { row: Number.POSITIVE_INFINITY, col: 3, dir: "h" }],
    ["a row as text", { row: "1", col: 3, dir: "h" }],
    ["an unknown direction", { row: 1, col: 3, dir: "x" }],
  ])("a fence with %s is off the board", (_name, fence) => {
    const state = fenceRace.setup({ playerCount: 2, options: {} });

    expect(fenceRaceFenceIssue(state, fence as Fence)).toEqual({
      code: FENCE_RACE_ISSUE.OutOfBoard,
    });
  });
});

describe("Lần phá rào vừa rồi", () => {
  it("is remembered by the break, for the evaluation of the next player's answer", () => {
    const fence = rowFence(1, "E");
    const state = position({ pawns: ["E1", "D11"], fences: [fence] });

    const after = fenceRace.applyMove(state, { kind: "break", ...fence });

    expect(after.lastBroken).toEqual(fence);
  });

  it("is forgotten by any other move", () => {
    const fence = rowFence(1, "E");
    const state = position({ pawns: ["E1", "D11"], fences: [fence] });
    const broken = fenceRace.applyMove(state, { kind: "break", ...fence });

    expect(fenceRace.applyMove(broken, stepTo("D10")).lastBroken).toBeNull();
    expect(
      fenceRace.applyMove(broken, { kind: "fence", ...rowFence(5, "A") }).lastBroken,
    ).toBeNull();
  });
});
