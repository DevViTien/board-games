import { describe, expect, it } from "vitest";

import {
  canUndo,
  currentFrame,
  isAttemptSolved,
  KEPT_HISTORY,
  MAX_HISTORY,
  playMove,
  replay,
  RESTART,
  restart,
  startAttempt,
  undo,
} from "./history";
import { parseLevel } from "./parse-level";
import { solve } from "./solver";
import { type Direction, JELLY_KIND } from "./types";

// Spec `jelly-gather`: "Số bước và hoàn tác", "Chơi lại màn", and the saved history read back.

const bridge = parseLevel({
  id: "2-1",
  version: 1,
  minMoves: 6,
  rows: ["########", "#......#", "#.r.b.r#", "#......#", "#..@...#", "########"],
});
// An open tray where the player can walk back and forth for ever.
const tray = parseLevel({
  id: "1-1",
  version: 1,
  minMoves: 1,
  rows: ["#######", "#@....#", "#.....#", "#r...r#", "#######"],
});

const playAll = (moves: string, from = startAttempt(bridge)) => {
  let attempt = from;
  for (const move of moves) attempt = playMove(attempt, move as Direction).attempt;
  return attempt;
};

describe("Số bước và hoàn tác", () => {
  it("counts moves and keeps blocked ones out of the history", () => {
    const attempt = playAll("UD");
    expect(currentFrame(attempt).steps).toBe(2);
    const blocked = playMove(attempt, "D");
    expect(blocked.result.ok).toBe(false);
    expect(blocked.attempt).toBe(attempt);
  });

  it("Hoàn tác một lần dính: the two strawberries are apart again", () => {
    const glued = playAll("ULLUR");
    const both = playMove(glued, "R").attempt;
    expect(isAttemptSolved(both)).toBe(true);
    const back = undo(both);
    expect(currentFrame(back)).toEqual(currentFrame(glued));
    expect(
      currentFrame(back).board.pieces.filter((p) => p.kinds.includes(JELLY_KIND.Strawberry)),
    ).toHaveLength(2);
  });

  it("Hoàn tác về đầu màn: five moves, five undos, and nothing left to undo", () => {
    let attempt = playAll("ULLUR");
    for (let count = 0; count < 5; count += 1) attempt = undo(attempt);
    expect(currentFrame(attempt)).toEqual({ board: bridge.start, steps: 0 });
    expect(canUndo(attempt)).toBe(false);
    expect(undo(attempt)).toBe(attempt);
  });

  it("takes no move once solved", () => {
    const solved = playAll("ULLURR");
    expect(playMove(solved, "D").attempt).toBe(solved);
  });
});

describe("Chơi lại màn", () => {
  it("Chơi lại rồi đổi ý: undo brings back the board and the count", () => {
    const played = playAll("ULLUR");
    const again = restart(played);
    expect(currentFrame(again)).toEqual({ board: bridge.start, steps: 0 });
    expect(again.history).toBe(`ULLUR${RESTART}`);
    expect(canUndo(again)).toBe(true);
    expect(currentFrame(undo(again))).toEqual(currentFrame(played));
  });

  it("Chơi lại khi chưa đi: nothing happens", () => {
    const fresh = startAttempt(bridge);
    expect(restart(fresh)).toBe(fresh);
    const afterRestart = restart(playAll("U"));
    expect(restart(afterRestart)).toBe(afterRestart);
  });

  it("counts moves from the last restart", () => {
    const attempt = playAll("UL", restart(playAll("ULL")));
    expect(currentFrame(attempt).steps).toBe(2);
  });
});

describe("replay", () => {
  it("rebuilds a saved history, undo and all", () => {
    const history = `ULL${RESTART}ULLUR`;
    const attempt = replay(bridge, history);
    expect(attempt?.history).toBe(history);
    expect(attempt && currentFrame(attempt)).toEqual(currentFrame(playAll("ULLUR")));
    expect(attempt && currentFrame(undo(undo(undo(undo(undo(undo(attempt)))))))).toEqual(
      currentFrame(playAll("ULL")),
    );
  });

  it.each([
    ["an unknown character", "ULx"],
    ["a blocked move", "UD" + "D"],
    ["a move after the level was solved", "ULLURRD"],
    ["a restart with nothing to restart", RESTART],
  ])("refuses %s", (_, history) => {
    expect(replay(bridge, history)).toBeNull();
  });

  it("takes a solved history and a restart after it", () => {
    expect(replay(bridge, "ULLURR")).not.toBeNull();
    expect(replay(bridge, `ULLURR${RESTART}U`)).not.toBeNull();
  });
});

describe("the history's limit", () => {
  it("forgets up to the first restart once too long, and still undoes the rest", () => {
    let attempt = restart(playMove(startAttempt(tray), "R").attempt);
    // Until the restart is forgotten: the history then falls back under the limit.
    while (attempt.history.includes(RESTART)) {
      attempt = playMove(attempt, attempt.history.length % 2 === 0 ? "R" : "L").attempt;
    }
    expect(attempt.history.length).toBeLessThanOrEqual(MAX_HISTORY);
    expect(attempt.history).not.toContain(RESTART);
    let undone = attempt;
    for (let left = attempt.history.length; left > 0; left -= 1) undone = undo(undone);
    expect(canUndo(undone)).toBe(false);
    expect(currentFrame(undone)).toEqual({ board: tray.start, steps: 0 });
  });

  it("Hoàn tác lùi được ít nhất 10 000 thao tác: a late restart is not forgotten", () => {
    let attempt = startAttempt(tray);
    for (let count = 0; count < 15_000; count += 1) {
      attempt = playMove(attempt, count % 2 === 0 ? "R" : "L").attempt;
    }
    attempt = restart(playMove(attempt, "R").attempt);
    while (attempt.history.length <= MAX_HISTORY) {
      const atStart = currentFrame(attempt).board.player === tray.start.player;
      attempt = playMove(attempt, atStart ? "R" : "L").attempt;
    }
    expect(attempt.history).toContain(RESTART);
    let undos = 0;
    for (let undone = attempt; canUndo(undone); undone = undo(undone)) undos += 1;
    expect(undos).toBeGreaterThanOrEqual(KEPT_HISTORY);
  });

  it("keeps everything when there is no restart to forget", () => {
    let attempt = startAttempt(tray);
    for (let count = 0; count <= MAX_HISTORY; count += 1) {
      attempt = playMove(attempt, count % 2 === 0 ? "R" : "L").attempt;
    }
    expect(attempt.history).toHaveLength(MAX_HISTORY + 1);
    // And it comes back whole after a reload.
    const back = replay(tray, attempt.history);
    expect(back && currentFrame(back)).toEqual(currentFrame(attempt));
  });
});

describe("solve", () => {
  it("finds the fewest moves", () => {
    const result = solve(bridge);
    expect(result.kind).toBe("solved");
    expect(result.kind === "solved" && result.moves).toHaveLength(6);
    if (result.kind === "solved") expect(isAttemptSolved(playAll(result.moves))).toBe(true);
  });

  it("says when a level cannot be solved", () => {
    // Strawberries against two different walls can never be pulled out to meet.
    const stuck = parseLevel({
      id: "1-1",
      version: 1,
      minMoves: 1,
      rows: ["#######", "#r....#", "#..@..#", "#....r#", "#######"],
    });
    expect(solve(stuck).kind).toBe("unsolvable");
  });

  it("stops at its limit", () => {
    expect(solve(bridge, 10).kind).toBe("too-big");
  });
});
