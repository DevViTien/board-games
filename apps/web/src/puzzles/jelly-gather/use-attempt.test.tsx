import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { JELLY_GATHER_ATTEMPT_KEY_PREFIX, JELLY_GATHER_PROGRESS_KEY } from "@/config/storage-keys";

import { findLevel } from "./levels";
import { currentFrame } from "./rules/history";
import { useAttempt } from "./use-attempt";
import { refreshProgress, useProgress } from "./use-progress";

// Spec `jelly-gather`, "Lưu tiến độ và màn đang chơi dở", through the hooks on jsdom's localStorage.

const bridge = findLevel("2-1");
if (bridge === undefined) throw new Error("no level 2-1");

beforeEach(() => {
  window.localStorage.clear();
  refreshProgress();
});
afterEach(() => {
  window.localStorage.clear();
  refreshProgress();
});

const saved = (id: string) =>
  JSON.parse(window.localStorage.getItem(`${JELLY_GATHER_ATTEMPT_KEY_PREFIX}${id}`) ?? "null") as {
    history: string;
  } | null;

describe("useAttempt", () => {
  it("starts a level nobody played, with nothing to undo or restart", () => {
    const { result } = renderHook(() => useAttempt(bridge));
    expect(result.current.attempt?.history).toBe("");
    expect(result.current.canUndo).toBe(false);
    let restarted = true;
    act(() => {
      restarted = result.current.restart();
    });
    expect(restarted).toBe(false);
    expect(saved("2-1")).toBeNull();
  });

  it("writes every change, and a blocked move writes nothing", () => {
    const { result } = renderHook(() => useAttempt(bridge));
    act(() => {
      result.current.move("U");
      result.current.move("L");
    });
    expect(saved("2-1")?.history).toBe("UL");
    act(() => {
      result.current.move("D");
      result.current.move("D");
    });
    // The second D walks into the wall: not written.
    expect(saved("2-1")?.history).toBe("ULD");
  });

  it("takes moves pressed faster than renders", () => {
    const { result } = renderHook(() => useAttempt(bridge));
    act(() => {
      for (const move of "ULLUR") result.current.move(move as "U");
    });
    expect(result.current.attempt?.history).toBe("ULLUR");
  });

  it("Tải lại giữa màn: the go comes back, and undo still goes one move back", () => {
    window.localStorage.setItem(
      `${JELLY_GATHER_ATTEMPT_KEY_PREFIX}2-1`,
      JSON.stringify({ format: 1, version: bridge.version, history: "ULL", updatedAt: 1 }),
    );
    refreshProgress();
    const { result } = renderHook(() => useAttempt(bridge));
    expect(result.current.attempt && currentFrame(result.current.attempt).steps).toBe(3);
    let left: number | undefined;
    act(() => {
      left = result.current.undo()?.steps;
    });
    expect(left).toBe(2);
    expect(result.current.attempt && currentFrame(result.current.attempt).steps).toBe(2);
    expect(saved("2-1")?.history).toBe("UL");
  });

  it("remembers the solve, and the level is solved when opened again", () => {
    const first = renderHook(() => useAttempt(bridge));
    act(() => {
      for (const move of "ULLURR") first.result.current.move(move as "U");
    });
    expect(first.result.current.solved).toBe(true);
    expect(first.result.current.best).toBe(6);
    expect(window.localStorage.getItem(JELLY_GATHER_PROGRESS_KEY)).toContain('"2-1"');
    first.unmount();

    const again = renderHook(() => useAttempt(bridge));
    expect(again.result.current.solved).toBe(true);
    expect(again.result.current.best).toBe(6);
  });
});

describe("useProgress", () => {
  it("reads again after nobody was listening (left the puzzle and came back)", () => {
    const first = renderHook(() => useProgress());
    expect(first.result.current?.best.size).toBe(0);
    first.unmount();
    window.localStorage.setItem(
      JELLY_GATHER_PROGRESS_KEY,
      JSON.stringify({ format: 1, best: { "2-1": { moves: 7, version: bridge.version } } }),
    );
    const again = renderHook(() => useProgress());
    expect(again.result.current?.best.get("2-1")).toBe(7);
  });

  it("reads again when another tab writes", () => {
    const { result } = renderHook(() => useProgress());
    expect(result.current?.best.size).toBe(0);
    act(() => {
      window.localStorage.setItem(
        JELLY_GATHER_PROGRESS_KEY,
        JSON.stringify({ format: 1, best: { "2-1": { moves: 8, version: bridge.version } } }),
      );
      window.dispatchEvent(new StorageEvent("storage", { key: JELLY_GATHER_PROGRESS_KEY }));
    });
    expect(result.current?.best.get("2-1")).toBe(8);
  });
});
