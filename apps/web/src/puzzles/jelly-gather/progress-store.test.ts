import { describe, expect, it } from "vitest";

import { JELLY_GATHER_ATTEMPT_KEY_PREFIX, JELLY_GATHER_PROGRESS_KEY } from "@/config/storage-keys";

import {
  browserStorage,
  continueLevel,
  type KeyValue,
  loadAttempt,
  PROGRESS_FORMAT,
  readProgress,
  recordSolve,
  saveAttempt,
} from "./progress-store";
import { currentFrame, startAttempt } from "./rules/history";
import { parseLevel } from "./rules/parse-level";
import type { LevelId } from "./rules/types";

// Spec `jelly-gather`, "Lưu tiến độ và màn đang chơi dở" and "Danh sách màn" ("Tiếp tục").

const ROWS = ["########", "#......#", "#.r.b.r#", "#......#", "#..@...#", "########"];
const make = (id: LevelId, version = 1) => parseLevel({ id, version, minMoves: 6, rows: ROWS });
const LEVELS = [make("1-1"), make("1-2"), make("1-3"), make("1-4"), make("1-5")];
const [L11, L12, , L14, L15] = LEVELS as [
  ReturnType<typeof make>,
  ReturnType<typeof make>,
  ReturnType<typeof make>,
  ReturnType<typeof make>,
  ReturnType<typeof make>,
];

function memory(initial: Record<string, string> = {}): KeyValue & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const json = (value: unknown) => JSON.stringify(value);
const attemptKey = (id: string) => `${JELLY_GATHER_ATTEMPT_KEY_PREFIX}${id}`;

describe("readProgress", () => {
  it("reads nothing from an empty or missing storage", () => {
    expect(readProgress(memory(), LEVELS)).toEqual({ best: new Map(), attempts: new Map() });
    expect(readProgress(null, LEVELS)).toEqual({ best: new Map(), attempts: new Map() });
  });

  it("Dữ liệu lưu hỏng: a bad entry costs only its own level", () => {
    const store = memory({
      [JELLY_GATHER_PROGRESS_KEY]: json({
        format: PROGRESS_FORMAT,
        best: {
          "1-1": { moves: 7, version: 1 },
          "1-2": "nonsense",
          "1-3": { moves: 2, version: 1 },
          "9-9": { moves: 7, version: 1 },
        },
      }),
      [attemptKey("1-4")]: "{not json",
      [attemptKey("1-5")]: json({ format: 1, version: 1, history: "UL", updatedAt: 5 }),
    });
    const progress = readProgress(store, LEVELS);
    // 1-3's count is below the level's fewest moves: it cannot be true.
    expect([...progress.best]).toEqual([["1-1", 7]]);
    expect([...progress.attempts]).toEqual([["1-5", { history: "UL", updatedAt: 5 }]]);
  });

  it("drops a level whose design changed since it was saved", () => {
    const store = memory();
    recordSolve(store, L11, 9);
    saveAttempt(store, L12, "UL", 1);
    const changed = [make("1-1", 2), make("1-2", 2)];
    expect(readProgress(store, changed)).toEqual({ best: new Map(), attempts: new Map() });
  });

  it("survives a storage that throws", () => {
    const throwing: KeyValue = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => undefined,
    };
    expect(readProgress(throwing, LEVELS).best.size).toBe(0);
    expect(() => {
      recordSolve(throwing, L11, 6);
      saveAttempt(throwing, L11, "U", 1);
    }).not.toThrow();
  });

  it("finds this browser's localStorage", () => {
    expect(browserStorage()).toBe(window.localStorage);
  });
});

describe("recordSolve", () => {
  it("Kỷ lục chỉ giữ số nhỏ hơn", () => {
    const store = memory();
    recordSolve(store, L12, 10);
    recordSolve(store, L12, 13);
    expect(readProgress(store, LEVELS).best.get("1-2")).toBe(10);
    recordSolve(store, L12, 8);
    expect(readProgress(store, LEVELS).best.get("1-2")).toBe(8);
  });

  it("Hai tab: a solve in one tab keeps the other tab's", () => {
    const store = memory();
    // Each tab only ever writes through recordSolve, which reads the storage again first.
    recordSolve(store, L11, 6);
    recordSolve(store, L12, 7);
    expect([...readProgress(store, LEVELS).best]).toEqual([
      ["1-1", 6],
      ["1-2", 7],
    ]);
  });

  it("leaves alone what a newer version of the app saved", () => {
    const newer = json({ format: PROGRESS_FORMAT + 1, anything: true });
    const store = memory({ [JELLY_GATHER_PROGRESS_KEY]: newer, [attemptKey("1-1")]: newer });
    recordSolve(store, L11, 6);
    saveAttempt(store, L11, "U", 1);
    expect(store.data.get(JELLY_GATHER_PROGRESS_KEY)).toBe(newer);
    expect(store.data.get(attemptKey("1-1"))).toBe(newer);
  });
});

describe("loadAttempt", () => {
  it("Tải lại giữa màn: the saved go comes back, its undos with it", () => {
    const store = memory();
    saveAttempt(store, L11, "ULL", 1);
    const attempt = loadAttempt(L11, readProgress(store, LEVELS));
    expect(attempt.history).toBe("ULL");
    expect(currentFrame(attempt).steps).toBe(3);
  });

  it("starts again when the saved go does not replay", () => {
    const store = memory();
    saveAttempt(store, L11, "DDDD", 1);
    expect(loadAttempt(L11, readProgress(store, LEVELS))).toEqual(startAttempt(L11));
  });
});

describe("continueLevel", () => {
  it("Lần đầu vào: the first level", () => {
    expect(continueLevel(LEVELS, readProgress(memory(), LEVELS))?.id).toBe("1-1");
  });

  it("Màn chơi dở gần nhất: the unsolved go changed last, not a solved one", () => {
    const store = memory();
    saveAttempt(store, L14, "UL", 10);
    saveAttempt(store, L15, "ULLURR", 20);
    recordSolve(store, L15, 6);
    expect(continueLevel(LEVELS, readProgress(store, LEVELS))?.id).toBe("1-4");
  });

  it("skips a go with nothing in it, and is the first unsolved level otherwise", () => {
    const store = memory();
    recordSolve(store, L11, 6);
    saveAttempt(store, L14, "", 30);
    expect(continueLevel(LEVELS, readProgress(store, LEVELS))?.id).toBe("1-2");
  });

  it("is nothing once every level is solved", () => {
    const store = memory();
    for (const level of LEVELS) recordSolve(store, level, 6);
    expect(continueLevel(LEVELS, readProgress(store, LEVELS))).toBeUndefined();
  });
});
