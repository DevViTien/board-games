import {
  createSession,
  ENGINE_ERROR,
  fromRecord,
  RECORD_VERSION,
  toRecord,
} from "@board-games/engine";
import { describe, expect, it } from "vitest";

import { chess } from "../chess";
import { jellyCrewFilled, jellyCrewSettle } from "./board";
import {
  JELLY_CREW_BLOCKED,
  JELLY_CREW_MAP,
  JELLY_CREW_MAX_MOVES,
  JELLY_CREW_REASON,
  type JellyCrewMapId,
  type JellyCrewMove,
} from "./constants";
import { jellyCrewLayout } from "./layouts";
import { JELLY_CREW_SOLUTIONS } from "./layouts.solutions";
import {
  jellyCrew,
  jellyCrewHolding,
  jellyCrewMove,
  jellyCrewMoveParts,
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
    expect(jellyCrew.legalMoves(current), `${move} after ${String(current.moves)} moves`).toContain(
      move,
    );
    return jellyCrew.applyMove(current, move);
  }, state);
}

const KITCHEN_2 = jellyCrewLayout(Kitchen, 2);
const at = (x: number, y: number) => y * KITCHEN_2.width + x;
const seatsWithMoves = (state: JellyCrewState) =>
  new Set(jellyCrew.legalMoves(state).map((move) => jellyCrew.moverOf(move)));

describe("Bản đồ và người chơi", () => {
  it("Ván hai người trên bản đồ mặc định", () => {
    const state = jellyCrew.setup({ playerCount: 2, options: jellyCrew.defaultOptions });
    expect(state.map).toBe(Kitchen);
    expect(state.board).toEqual(KITCHEN_2.start);
    expect(state.board.chars).toHaveLength(2);
    expect(seatsWithMoves(state)).toEqual(new Set([0, 1]));
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

  it("declares a cooperative game of 2 to 4 players, played freely, without AI", () => {
    expect(jellyCrew.meta).toMatchObject({
      players: { min: 2, max: 4 },
      supportsAI: false,
      cooperative: true,
      freePlay: true,
    });
  });
});

describe("Đi tự do", () => {
  it("Hai người đi xen nhau", () => {
    const state = play(start(), ["0D", "0D", "0D", "1D"]);
    expect(state.steps).toBe(4);
    expect(state.board.chars).toEqual([at(1, 4), at(17, 2)]);
    expect(jellyCrew.legalMoves(state).some((move) => move.endsWith("end"))).toBe(false);
  });

  it("Bước bị chặn", () => {
    const state = start();
    expect(jellyCrew.legalMoves(state)).not.toContain("1U");
    expect(jellyCrewTryStep(state, 1, "U")).toEqual({
      ok: false,
      blocked: JELLY_CREW_BLOCKED.Wall,
    });
    expect(jellyCrew.legalMoves(state)).toContain("0D");
  });

  it("names the seat of every move, and lists them seat by seat: steps, then reset", () => {
    expect(jellyCrew.legalMoves(play(start(), ["0D"]))).toEqual([
      "0U",
      "0D",
      "0R",
      "0reset",
      "1D",
      "1L",
      "1reset",
    ]);
    expect(jellyCrew.moverOf("1L")).toBe(1);
    expect(jellyCrewMoveParts("3reset")).toEqual({ seat: 3, action: "reset" });
    expect(jellyCrewMove(2, "U")).toBe("2U");
  });

  it("Phát lại nước của nhiều ghế: the record rebuilds the same board and steps", () => {
    const moves = (JELLY_CREW_SOLUTIONS["kitchen-2"] ?? []).slice(0, 12);
    const created = createSession(jellyCrew, { playerCount: 2 });
    if (!created.ok) throw new Error(created.error);
    const record = {
      ...toRecord(created.value),
      version: RECORD_VERSION,
      entries: moves.map((move) => ({ move })),
    };
    const rebuilt = fromRecord(jellyCrew, JSON.parse(JSON.stringify(record)));
    if (!rebuilt.ok) throw new Error(rebuilt.error);
    const last = rebuilt.value.states.at(-1);
    expect(last).toEqual(play(start(), moves));
    expect(rebuilt.value.entries.map(({ move }) => jellyCrew.moverOf(move))).toEqual(
      moves.map((move) => Number(move[0])),
    );
  });
});

describe("Đặt lại bản đồ", () => {
  it("Đặt lại giữa ván", () => {
    const before = play(start(3), ["0D", "1D", "0R", "2U"]);
    const reset = play(before, ["1reset"]);
    expect(reset.board).toEqual(jellyCrewLayout(Kitchen, 3).start);
    expect(reset.steps).toBe(before.steps);
    expect(reset.last).toMatchObject({ seat: 1, action: "reset" });
    expect(seatsWithMoves(reset)).toEqual(new Set([0, 1, 2]));
  });

  it("Bàn chưa đổi", () => {
    expect(jellyCrew.legalMoves(start()).some((move) => move.endsWith("reset"))).toBe(false);
    // Back where everything started, a step and its step back: still nothing to reset.
    const back = play(start(), ["0D", "0U"]);
    expect(jellyCrew.legalMoves(back).some((move) => move.endsWith("reset"))).toBe(false);
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

describe("Giới hạn an toàn của ván", () => {
  it("Chạm giới hạn", () => {
    const nearly = { ...play(start(), ["0D"]), moves: JELLY_CREW_MAX_MOVES - 1 };
    const over = play(nearly, ["0U"]);
    expect(jellyCrew.result(over)).toEqual({ kind: "draw", reason: JELLY_CREW_REASON.TooLong });
    expect(jellyCrew.legalMoves(over)).toEqual([]);
  });

  it("Thắng ở nước cuối", () => {
    const moves = JELLY_CREW_SOLUTIONS["kitchen-2"] ?? [];
    const beforeLast = play(start(), moves.slice(0, -1));
    const won = play({ ...beforeLast, moves: JELLY_CREW_MAX_MOVES - 1 }, moves.slice(-1));
    expect(jellyCrew.result(won)?.reason).toBe(JELLY_CREW_REASON.Filled);
  });

  it("counts a reset as a move, not a step", () => {
    const state = play(start(), ["0D", "0reset"]);
    expect(state.moves).toBe(2);
    expect(state.steps).toBe(1);
  });
});

describe("what a move did", () => {
  it("tells a door opening when a character steps onto its plate, and closing when it leaves", () => {
    const state = play(start(), ["1D", "1D", "1D", "1L"]);
    expect(state.last).toMatchObject({ seat: 1, action: "L", opened: [], closed: [] });
    const onPlate = play(state, ["1L"]);
    expect(onPlate.last).toMatchObject({ seat: 1, action: "L", opened: ["circle"], closed: [] });
    expect(jellyCrewHolding(onPlate, 1)).toBe("circle");
    expect(play(onPlate, ["1R"]).last?.closed).toEqual(["circle"]);
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
  it("Đọc cờ cùng phe: Đội gom thạch is cooperative and played freely, Cờ vua neither", () => {
    expect(jellyCrew.meta.cooperative).toBe(true);
    expect(jellyCrew.meta.freePlay).toBe(true);
    expect(chess.meta).not.toHaveProperty("cooperative");
    expect(chess.meta).not.toHaveProperty("freePlay");
  });
});
