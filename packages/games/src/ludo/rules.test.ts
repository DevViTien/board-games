import { createRng, listOptionChoices, playMove } from "@board-games/engine";
import { deepFreeze } from "@board-games/engine/testing";
import { describe, expect, it } from "vitest";

import { IN_STABLE, LUDO_COLOUR, OWN_GATE } from "./constants";
import { ludo } from "./rules";
import { choices, moveHorse, newGame, play, position, roll, stateOf } from "./test-positions";

const S = IN_STABLE;
const step = (k: number) => OWN_GATE + k;

describe("Bàn và người chơi", () => {
  it("declares 2–4 players, the Vietnamese folk category, about 20 minutes and the AI", () => {
    expect(ludo.meta).toEqual({
      players: { min: 2, max: 4 },
      category: "vn-folk",
      durationMinutes: 20,
      supportsAI: true,
    });
  });

  it("offers no rule option to choose", () => {
    expect(listOptionChoices(ludo)).toEqual([]);
  });

  it("Ván 4 người mới", () => {
    const state = stateOf(newGame(4));

    expect(state.colours).toEqual([0, 1, 2, 3]);
    expect(state.horses).toEqual([
      [S, S, S, S],
      [S, S, S, S],
      [S, S, S, S],
      [S, S, S, S],
    ]);
    expect(ludo.currentPlayer(state)).toBe(0);
    expect(ludo.legalMoves(state)).toEqual([{ type: "roll" }]);
  });

  it("Ván 2 người ngồi đối diện (G10)", () => {
    const state = stateOf(newGame(2));

    expect(state.colours).toEqual([LUDO_COLOUR.Red, LUDO_COLOUR.Yellow]);
    expect(state.horses).toHaveLength(2);
  });

  it("gives three players the first three colours", () => {
    expect(stateOf(newGame(3)).colours).toEqual([0, 1, 2]);
  });

  it("Thứ tự lượt", () => {
    // Red brings a horse out and moves it 3 (two turns), then Blue, Yellow, Red.
    const session = play(newGame(3), [{ roll: 6 }, { horse: 0 }, { roll: 3 }, { horse: 0 }]);
    expect(stateOf(session).toMove).toBe(1);

    const blueLost = play(session, [{ roll: 3 }]);
    expect(stateOf(blueLost).toMove).toBe(2);
    const yellowLost = play(blueLost, [{ roll: 2 }]);
    expect(stateOf(yellowLost).toMove).toBe(0);
  });
});

describe("Gieo rồi chọn ngựa", () => {
  it("Lượt bắt đầu bằng gieo: six faces, equally likely", () => {
    const state = position({ horses: { 0: [10] } });

    expect(ludo.legalMoves(state)).toEqual([{ type: "roll" }]);
    expect(ludo.outcomes(state, { type: "roll" })).toEqual(
      [1, 2, 3, 4, 5, 6].map((face) => ({ outcome: face, weight: 1 })),
    );
  });

  it("Sau khi gieo chỉ chọn ngựa", () => {
    const state = roll(position({ horses: { 0: [10, 30] } }), 4);

    expect(state.die).toBe(4);
    expect(ludo.legalMoves(state)).toEqual([
      { type: "move", horse: 0 },
      { type: "move", horse: 1 },
    ]);
    expect(ludo.outcomes(state, { type: "move", horse: 0 })).toEqual([]);
  });

  it("rolls through the session with the engine's generator, the face kept in the record", () => {
    const played = playMove(ludo, newGame(2), { type: "roll" }, createRng(7));

    expect(played.ok).toBe(true);
    if (!played.ok) return;
    const [entry] = played.value.entries;
    expect(entry?.move).toEqual({ type: "roll" });
    expect([1, 2, 3, 4, 5, 6]).toContain(entry?.outcome);
  });

  it("refuses a roll without a face and a horse that cannot move", () => {
    const state = position({ horses: { 0: [10] }, die: 3 });

    expect(() => ludo.applyMove(position(), { type: "roll" })).toThrow();
    expect(() => ludo.applyMove(state, { type: "move", horse: 1 })).toThrow();
  });
});

describe("Mất lượt", () => {
  it("Mọi ngựa còn trong chuồng", () => {
    const session = play(newGame(4), [{ roll: 3 }]);
    const state = stateOf(session);

    expect(state.toMove).toBe(1);
    expect(state.die).toBeNull();
    expect(ludo.legalMoves(state)).toEqual([{ type: "roll" }]);
    expect(session.entries).toEqual([{ move: { type: "roll" }, outcome: 3 }]);
    expect(state.last).toEqual({ kind: "roll", player: 0, face: 3, lost: true, again: false });
  });
});

describe("Gieo 6 được gieo thêm", () => {
  it("Gieo 6 rồi gieo thêm", () => {
    const state = moveHorse(roll(position(), 6), 0);

    expect(state.toMove).toBe(0);
    expect(state.die).toBeNull();
    expect(state.last).toMatchObject({ kind: "move", again: true });
  });

  it("Gieo 6 không đi được vẫn gieo thêm (G9)", () => {
    // The only horse on the track stands 3 cells from its gate; the others are home.
    const stuck = roll(position({ horses: { 0: [OWN_GATE - 3, step(6), step(5), step(4)] } }), 6);
    expect(stuck.toMove).toBe(0);
    expect(stuck.die).toBeNull();
    expect(stuck.last).toEqual({ kind: "roll", player: 0, face: 6, lost: false, again: true });
    expect(choices(stuck)).toEqual([-1]);
  });

  it("Số khác thì chuyển lượt", () => {
    const state = moveHorse(roll(position({ horses: { 0: [10] } }), 5), 0);

    expect(state.toMove).toBe(1);
    expect(state.last).toMatchObject({ kind: "move", from: 10, to: 15, again: false });
  });
});

describe("Thắng", () => {
  it("Đủ bốn bậc cao", () => {
    const state = moveHorse(
      roll(position({ horses: { 0: [step(4), step(5), step(6), step(2)] } }), 3),
      3,
    );

    expect(state.winner).toBe(0);
    expect(ludo.result(state)).toEqual({ kind: "win", winners: [0] });
    expect(ludo.legalMoves(state)).toEqual([]);
  });

  it("ends at once even after a 6: no extra roll after the winning move (G12)", () => {
    // Only passing lets a 6 win (gate → step 6 over steps 3–5); the default rules never do.
    const state = moveHorse(
      roll(
        position({
          horses: { 0: [step(4), step(3), step(5), OWN_GATE] },
          options: { passing: "free" },
        }),
        6,
      ),
      3,
    );

    expect(state.winner).toBe(0);
    expect(state.last).toMatchObject({ again: false });
    expect(ludo.legalMoves(state)).toEqual([]);
  });

  it("Bốn ngựa trong chuồng đích nhưng chưa đủ bậc cao", () => {
    const state = position({ horses: { 0: [step(1), step(4), step(5), step(6)] } });

    expect(ludo.result(state)).toBeNull();
    expect(ludo.legalMoves(state)).toEqual([{ type: "roll" }]);
  });
});

describe("Ván luôn đi tiếp và kết thúc", () => {
  it("Chuồng đích luôn lên được", () => {
    const state = roll(position({ horses: { 0: [step(1), step(4), step(5), step(6)] } }), 2);

    expect(choices(state)).toEqual([0]);
    expect(moveHorse(state, 0).horses[0]?.[0]).toBe(step(2));
  });
});

describe("pure rules", () => {
  it("never modify the state they are given", () => {
    const before = deepFreeze(position({ horses: { 0: [10, S], 2: [S, 0] } }));

    const rolled = deepFreeze(roll(before, 6));
    moveHorse(rolled, 0);
    moveHorse(rolled, 1);
    ludo.legalMoves(rolled);

    expect(before.die).toBeNull();
    expect(rolled.horses[0]).toEqual([10, S, S, S]);
  });
});
