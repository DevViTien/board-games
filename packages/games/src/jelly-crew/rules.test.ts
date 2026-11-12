import { createSession, ENGINE_ERROR } from "@board-games/engine";
import { describe, expect, it } from "vitest";

import { chess } from "../chess";
import { jellyCrewFilled, jellyCrewSettle } from "./board";
import {
  JELLY_CREW_BLOCKED,
  JELLY_CREW_MAP,
  JELLY_CREW_REASON,
  type JellyCrewMapId,
  type JellyCrewMove,
} from "./constants";
import { jellyCrewLayout } from "./layouts";
import { JELLY_CREW_SOLUTIONS } from "./layouts.solutions";
import {
  jellyCrew,
  jellyCrewHolding,
  jellyCrewRound,
  jellyCrewTryStep,
  parseJellyCrewOptions,
} from "./rules";
import type { JellyCrewState } from "./types";

const { Kitchen, Market } = JELLY_CREW_MAP;

function start(playerCount = 2, map: JellyCrewMapId = Kitchen): JellyCrewState {
  return jellyCrew.setup({ playerCount, options: { map } });
}

function play(state: JellyCrewState, moves: readonly JellyCrewMove[]): JellyCrewState {
  return moves.reduce((current, move) => {
    expect(jellyCrew.legalMoves(current), `${move} at turn ${String(current.turnsDone)}`).toContain(
      move,
    );
    return jellyCrew.applyMove(current, move);
  }, state);
}

const KITCHEN_2 = jellyCrewLayout(Kitchen, 2);
const at = (x: number, y: number) => y * KITCHEN_2.width + x;
const STEPS: readonly JellyCrewMove[] = ["U", "D", "L", "R"];
const stepsIn = (state: JellyCrewState) =>
  jellyCrew.legalMoves(state).filter((move) => STEPS.includes(move));

describe("Bản đồ và người chơi", () => {
  it("Ván hai người trên bản đồ mặc định", () => {
    const state = jellyCrew.setup({ playerCount: 2, options: jellyCrew.defaultOptions });
    expect(state.map).toBe(Kitchen);
    expect(state.board).toEqual(KITCHEN_2.start);
    expect(state.board.chars).toHaveLength(2);
    expect(jellyCrew.currentPlayer(state)).toBe(0);
  });

  it("Mỗi số người một bố cục", () => {
    for (const playerCount of [2, 3, 4]) {
      const state = start(playerCount, Market);
      expect(state.board.chars).toHaveLength(playerCount);
      const layout = jellyCrewLayout(Market, playerCount);
      expect(layout.width).toBeLessThanOrEqual(19);
      expect(layout.height).toBeLessThanOrEqual(13);
    }
  });

  it("Tuỳ chọn lạ", () => {
    expect(parseJellyCrewOptions({ map: "castle" })).toBeNull();
    expect(parseJellyCrewOptions({ map: Kitchen, steps: 3 })).toBeNull();
    expect(parseJellyCrewOptions({})).toEqual({ map: Kitchen });
    const session = createSession(jellyCrew, { playerCount: 2, options: { map: "castle" } });
    expect(session).toEqual({ ok: false, error: ENGINE_ERROR.InvalidOptions });
  });

  it("declares a cooperative game of 2 to 4 players without AI", () => {
    expect(jellyCrew.meta).toMatchObject({
      players: { min: 2, max: 4 },
      supportsAI: false,
      cooperative: true,
    });
  });
});

describe("Lượt nhiều bước", () => {
  it("Đủ 5 bước thì chờ Xong lượt", () => {
    const state = play(start(), ["D", "D", "D", "D", "R"]);
    expect(state.taken).toBe(5);
    expect(jellyCrew.currentPlayer(state)).toBe(0);
    expect(stepsIn(state)).toEqual([]);
    expect(jellyCrew.legalMoves(state)).toContain("end");
    expect(jellyCrewTryStep(state, "R")).toEqual({
      ok: false,
      blocked: JELLY_CREW_BLOCKED.NoSteps,
    });
  });

  it("Xong lượt khi chưa đi", () => {
    const plate = at(15, 4);
    const state: JellyCrewState = {
      ...start(),
      turn: 1,
      turnsDone: 1,
      board: { ...KITCHEN_2.start, chars: [at(1, 1), plate] },
    };
    const next = play(state, ["end"]);
    expect(jellyCrew.currentPlayer(next)).toBe(0);
    expect(next.board.chars[1]).toBe(plate);
    expect(jellyCrewHolding(next, 1)).toBe("circle");
  });

  it("Bước bị chặn", () => {
    const state = start();
    expect(jellyCrew.legalMoves(state)).not.toContain("U");
    expect(jellyCrewTryStep(state, "U")).toEqual({ ok: false, blocked: JELLY_CREW_BLOCKED.Wall });
    expect(state.taken).toBe(0);
  });

  it("passes the turn in seat order, back to the first", () => {
    let state = start(3);
    const seats = [];
    for (let turn = 0; turn < 4; turn += 1) {
      seats.push(jellyCrew.currentPlayer(state));
      state = play(state, ["end"]);
    }
    expect(seats).toEqual([0, 1, 2, 0]);
    expect(jellyCrewRound(state)).toBe(2);
  });

  it("lists the moves in order: steps, end, back, reset", () => {
    expect(jellyCrew.legalMoves(play(start(), ["D"]))).toEqual([
      "U",
      "D",
      "R",
      "end",
      "back",
      "reset",
    ]);
  });
});

describe("Lùi bước trong lượt", () => {
  it("Lùi một bước đẩy", () => {
    const afterOne = play(start(), ["D"]);
    const pushed = play(afterOne, ["R"]);
    expect(pushed.last?.pushed).toEqual(["strawberry"]);
    const back = play(pushed, ["back"]);
    expect(back.board).toEqual(afterOne.board);
    expect(back.taken).toBe(1);
    expect(back.steps).toBe(1);
  });

  it("Lùi bước thứ năm", () => {
    const back = play(start(), ["D", "D", "D", "D", "R", "back"]);
    expect(back.taken).toBe(4);
    expect(stepsIn(back).length).toBeGreaterThan(0);
  });

  it("Không lùi qua lượt trước", () => {
    const state = play(start(), ["D", "end"]);
    expect(jellyCrew.legalMoves(state)).not.toContain("back");
  });

  it("Hết lượt lùi", () => {
    const state = play(start(), [
      ...(["D", "back", "D", "back", "D", "back", "D", "back", "D", "back"] as const),
      "D",
    ]);
    expect(state.backs).toBe(5);
    expect(jellyCrew.legalMoves(state)).not.toContain("back");
    expect(jellyCrew.legalMoves(play(state, ["end"]))).not.toContain("back");
  });
});

describe("Đặt lại bản đồ", () => {
  it("Đặt lại giữa ván", () => {
    const fiveRounds = Array.from({ length: 15 }, (): JellyCrewMove => "end");
    const before = play(start(3), [...fiveRounds, "D", "end", "D"]);
    expect(jellyCrewRound(before)).toBe(6);
    expect(jellyCrew.currentPlayer(before)).toBe(1);
    const reset = play(before, ["reset"]);
    expect(reset.board).toEqual(jellyCrewLayout(Kitchen, 3).start);
    expect(jellyCrew.currentPlayer(reset)).toBe(2);
    expect(jellyCrewRound(reset)).toBe(6);
    expect(reset.steps).toBe(2);
    expect(reset.last?.move).toBe("reset");
  });

  it("Bàn chưa đổi", () => {
    expect(jellyCrew.legalMoves(start())).not.toContain("reset");
    // Back where everything started, a step and its step back: still nothing to reset.
    expect(jellyCrew.legalMoves(play(start(), ["D", "U"]))).not.toContain("reset");
  });
});

describe("Thắng khi đầy khuôn", () => {
  it("Ô khuôn cuối được lấp", () => {
    const moves = JELLY_CREW_SOLUTIONS["kitchen-3"] ?? [];
    const won = play(start(3), moves);
    expect(jellyCrew.result(won)).toEqual({
      kind: "win",
      winners: [0, 1, 2],
      reason: JELLY_CREW_REASON.Filled,
    });
    expect(jellyCrew.legalMoves(won)).toEqual([]);
    expect(won.last?.molds).toEqual({ fitted: 6, total: 6 });
  });

  it("Sai loại trên khuôn", () => {
    const wrong = {
      chars: KITCHEN_2.start.chars,
      pieces: jellyCrewSettle(KITCHEN_2, [
        { cells: [at(8, 2), at(9, 2)], kinds: ["mango", "mango"] },
        { cells: [at(10, 2), at(11, 2)], kinds: ["strawberry", "strawberry"] },
      ]),
    };
    expect(jellyCrewFilled(KITCHEN_2, wrong)).toBe(false);
  });
});

describe("Giới hạn vòng", () => {
  const ends = (count: number) => Array.from({ length: count }, (): JellyCrewMove => "end");

  it("Hết vòng", () => {
    const over = play(start(), ends(KITCHEN_2.rounds * 2));
    expect(jellyCrew.result(over)).toEqual({ kind: "draw", reason: JELLY_CREW_REASON.OutOfRounds });
    expect(jellyCrew.legalMoves(over)).toEqual([]);
    expect(jellyCrewRound(over)).toBe(KITCHEN_2.rounds);
  });

  it("Thắng ở lượt cuối", () => {
    const moves = JELLY_CREW_SOLUTIONS["kitchen-2"] ?? [];
    const beforeLast = play(start(), moves.slice(0, -1));
    const lastTurn = { ...beforeLast, turnsDone: KITCHEN_2.rounds * 2 - 1 };
    const won = play(lastTurn, moves.slice(-1));
    expect(jellyCrew.result(won)?.reason).toBe(JELLY_CREW_REASON.Filled);
  });
});

describe("what a move did", () => {
  it("tells a door opening when a character steps onto its plate", () => {
    const state = play(start(), ["end", "D", "D", "D", "L"]);
    expect(state.last).toMatchObject({ seat: 1, move: "L", opened: [], closed: [] });
    const onPlate = play(state, ["L"]);
    expect(onPlate.last).toMatchObject({ seat: 1, move: "L", opened: ["circle"], closed: [] });
    expect(play(onPlate, ["back"]).last?.closed).toEqual(["circle"]);
  });

  it("keeps the trail of the latest turn with steps, through an end", () => {
    const state = play(start(), ["D", "R", "end"]);
    expect(state.trail).toEqual({ seat: 0, cells: [at(1, 1), at(1, 2), at(2, 2)] });
    expect(play(state, ["end"]).trail).toEqual(state.trail);
    expect(play(state, ["D"]).trail).toEqual({ seat: 1, cells: [at(17, 1), at(17, 2)] });
  });

  it("tells the molds only when their count changes", () => {
    const moves = JELLY_CREW_SOLUTIONS["kitchen-2"] ?? [];
    const states = moves.reduce<JellyCrewState[]>(
      (all, move) => [...all, jellyCrew.applyMove(all.at(-1) ?? start(), move)],
      [],
    );
    const told = states.map((state) => state.last?.molds?.fitted ?? null).filter((n) => n !== null);
    expect(told).toEqual([1, 2, 3, 4]);
  });
});

describe("Khai báo game", () => {
  it("Đọc cờ cùng phe: Đội gom thạch is cooperative, Cờ vua is not", () => {
    expect(jellyCrew.meta.cooperative).toBe(true);
    expect(chess.meta).not.toHaveProperty("cooperative");
  });
});
