import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JELLY_GATHER_ATTEMPT_KEY_PREFIX, JELLY_GATHER_PROGRESS_KEY } from "@/config/storage-keys";
import { renderWithIntl } from "@/test/render-with-intl";

import { JellyBoard } from "./Board";
import { LevelList } from "./LevelList";
import { findLevel, LEVELS } from "./levels";
import { PlayLevel, SolvedPanel } from "./PlayLevel";
import type { Level } from "./rules/types";
import { refreshProgress } from "./use-progress";

// Spec `jelly-gather`, the screens: play, the solved panel, the level list, the board's drawing.

function level(id: string): Level {
  const found = findLevel(id);
  if (found === undefined) throw new Error(`no level ${id}`);
  return found;
}

const BRIDGE = level("2-1"); // ULLURR solves it; it has the grass jelly hint.

beforeEach(() => {
  window.localStorage.clear();
  refreshProgress();
});
afterEach(() => {
  window.localStorage.clear();
  refreshProgress();
  vi.restoreAllMocks();
});

const KEYS = { U: "ArrowUp", D: "ArrowDown", L: "ArrowLeft", R: "ArrowRight" } as const;
const press = (moves: string) => {
  for (const move of moves) fireEvent.keyDown(window, { key: KEYS[move as keyof typeof KEYS] });
};
/** The count by the title: the only paragraph that is just "<n> bước". */
const steps = () =>
  screen.getByText(
    (_, element) => element?.tagName === "P" && /^\d+ bước$/.test(element.textContent),
  ).textContent;
const status = () => screen.getByRole("status");

describe("PlayLevel", () => {
  it("Mở một màn: title, no moves, the hint, the pad and an undo that says why it cannot", () => {
    renderWithIntl(<PlayLevel level={BRIDGE} />);
    expect(screen.getByRole("heading", { level: 1, name: "Màn 2-1" })).toBeVisible();
    expect(steps()).toBe("0 bước");
    expect(screen.getByText(/Sương sáo dính với mọi màu/)).toBeVisible();
    const pad = screen.getByRole("group", { name: "Điều khiển" });
    for (const name of ["Lên", "Xuống", "Sang trái", "Sang phải"]) {
      expect(within(pad).getByRole("button", { name })).toBeVisible();
    }
    const undo = within(pad).getByRole("button", { name: "Hoàn tác" });
    expect(undo).toHaveAttribute("aria-disabled", "true");
    expect(undo).toHaveAccessibleDescription("Chưa có bước nào để hoàn tác.");
    expect(screen.getByRole("link", { name: "Danh sách màn" })).toHaveAttribute(
      "href",
      "/puzzles/jelly-gather",
    );
  });

  it("Chơi bằng bàn phím: an arrow moves like its button, and is said", async () => {
    renderWithIntl(<PlayLevel level={BRIDGE} />);
    press("U");
    expect(steps()).toBe("1 bước");
    await waitFor(() => expect(status()).toHaveTextContent("Hàng 4, cột 4."));
    fireEvent.click(screen.getByRole("button", { name: "Sang trái" }));
    expect(steps()).toBe("2 bước");
    fireEvent.keyDown(window, { key: "w" });
    expect(steps()).toBe("3 bước");
  });

  it("Phím tắt của trình duyệt: Ctrl + D, ⌘ + R and Shift + arrow do nothing here", () => {
    renderWithIntl(<PlayLevel level={BRIDGE} />);
    press("U");
    fireEvent.keyDown(window, { key: "d", ctrlKey: true });
    fireEvent.keyDown(window, { key: "r", metaKey: true });
    fireEvent.keyDown(window, { key: "ArrowLeft", shiftKey: true });
    expect(steps()).toBe("1 bước");
  });

  it("Menu ngôn ngữ đang mở: its arrows and letters stay in the menu", async () => {
    const user = userEvent.setup();
    renderWithIntl(<PlayLevel level={BRIDGE} />);
    await user.click(screen.getByRole("button", { name: /Ngôn ngữ/ }));
    const menu = await screen.findByRole("menu");
    await user.keyboard("{ArrowDown}{ArrowLeft}a");
    expect(menu).toBeInTheDocument();
    expect(steps()).toBe("0 bước");
  });

  it("Bị chặn hai lần liền: said both times", async () => {
    renderWithIntl(<PlayLevel level={BRIDGE} />);
    press("D");
    await waitFor(() => expect(status()).toHaveTextContent("Không đi được: tường."));
    press("D");
    expect(status()).toHaveTextContent("");
    await waitFor(() => expect(status()).toHaveTextContent("Không đi được: tường."));
    expect(steps()).toBe("0 bước");
  });

  it("Chơi lại rồi đổi ý, and R held down restarts once", async () => {
    renderWithIntl(<PlayLevel level={BRIDGE} />);
    press("ULL");
    fireEvent.keyDown(window, { key: "r" });
    expect(steps()).toBe("0 bước");
    fireEvent.keyDown(window, { key: "r", repeat: true });
    fireEvent.click(screen.getByRole("button", { name: "Hoàn tác" }));
    expect(steps()).toBe("3 bước");
    await waitFor(() => expect(status()).toHaveTextContent("Hoàn tác. 3 bước."));
  });

  it("Thông báo khi dính, then the solved panel in place of the pad, focus on what is next", async () => {
    renderWithIntl(<PlayLevel level={BRIDGE} />);
    press("ULLUR");
    await waitFor(() =>
      expect(status()).toHaveTextContent("Đẩy thạch dâu. Sương sáo dính thạch dâu."),
    );
    press("R");
    await waitFor(() => expect(status()).toHaveTextContent("Dính lại: thạch dâu còn 1 khối."));
    expect(status()).toHaveTextContent("Gom xong! 6 bước.");
    expect(screen.getByRole("heading", { name: "Gom xong!" })).toBeVisible();
    expect(screen.queryByRole("group", { name: "Điều khiển" })).not.toBeInTheDocument();
    expect(screen.getByText("Ít bước nhất có thể!")).toBeVisible();
    const next = screen.getByRole("link", { name: "Màn tiếp" });
    expect(next).toHaveAttribute("href", "/puzzles/jelly-gather/2-2");
    expect(next).toHaveFocus();
    // No hint once solved; no move any more.
    expect(screen.queryByText(/Sương sáo dính với mọi màu/)).not.toBeInTheDocument();
    press("L");
    expect(steps()).toBe("6 bước");
  });

  it("Hoàn tác from the solved panel: the pad comes back with the focus on its undo", () => {
    renderWithIntl(<PlayLevel level={BRIDGE} />);
    press("ULLURR");
    fireEvent.keyDown(window, { key: "z" });
    expect(screen.queryByRole("heading", { name: "Gom xong!" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hoàn tác" })).toHaveFocus();
    expect(steps()).toBe("5 bước");
  });

  it("Chơi lại màn from the solved panel: the pad comes back with the focus on it", () => {
    renderWithIntl(<PlayLevel level={BRIDGE} />);
    press("ULLURR");
    fireEvent.click(screen.getByRole("button", { name: "Chơi lại màn" }));
    expect(screen.queryByRole("heading", { name: "Gom xong!" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hoàn tác" })).toHaveFocus();
    expect(steps()).toBe("0 bước");
  });

  it("Mở lại màn đã giải: the solved board and panel", () => {
    window.localStorage.setItem(
      `${JELLY_GATHER_ATTEMPT_KEY_PREFIX}2-1`,
      JSON.stringify({ format: 1, version: BRIDGE.version, history: "ULLURR", updatedAt: 1 }),
    );
    window.localStorage.setItem(
      JELLY_GATHER_PROGRESS_KEY,
      JSON.stringify({ format: 1, best: { "2-1": { moves: 6, version: BRIDGE.version } } }),
    );
    refreshProgress();
    renderWithIntl(<PlayLevel level={BRIDGE} />);
    expect(screen.getByRole("heading", { name: "Gom xong!" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Chơi lại màn" })).toBeVisible();
    expect(screen.getByText(/tốt nhất 6 bước/)).toBeVisible();
  });

  it("Vuốt: a swipe on the board is one move, a small one is none", () => {
    renderWithIntl(<PlayLevel level={BRIDGE} />);
    const board = document.querySelector("[data-jelly-board]")?.parentElement;
    if (!board) throw new Error("no board");
    fireEvent.pointerDown(board, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(board, { clientX: 104, clientY: 60 });
    expect(steps()).toBe("1 bước");
    fireEvent.pointerDown(board, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(board, { clientX: 110, clientY: 108 });
    expect(steps()).toBe("1 bước");
  });

  it("Mô tả bàn: one entry a row, runs told once", () => {
    renderWithIntl(<PlayLevel level={BRIDGE} />);
    const rows = within(screen.getByRole("list", { name: "Mô tả bàn" })).getAllByRole("listitem");
    expect(rows).toHaveLength(BRIDGE.height);
    expect(rows[0]).toHaveTextContent("Hàng 1: 8 ô tường");
    expect(rows[2]).toHaveTextContent(
      "Hàng 3: 1 ô tường, 1 ô trống, 1 ô thạch dâu, 1 ô trống, 1 ô sương sáo, 1 ô trống, 1 ô thạch dâu, 1 ô tường",
    );
    expect(rows[4]).toHaveTextContent("Hàng 5: 1 ô tường, 2 ô trống, bạn, 3 ô trống, 1 ô tường");
  });

  it("Màn không mở đầu cơ chế: no hint", () => {
    renderWithIntl(<PlayLevel level={level("2-2")} />);
    expect(screen.queryByText(/Sương sáo dính với mọi màu/)).not.toBeInTheDocument();
  });
});

describe("PlayLevel motion", () => {
  type Call = [Keyframe[], KeyframeAnimationOptions];
  let calls: Call[];
  beforeEach(() => {
    calls = [];
    Object.defineProperty(SVGElement.prototype, "animate", {
      configurable: true,
      value: (...args: Call) => {
        calls.push(args);
      },
    });
  });
  afterEach(() => {
    Reflect.deleteProperty(SVGElement.prototype, "animate");
  });

  it("Khôi phục không trượt: a go restored from this browser shows with no motion", () => {
    window.localStorage.setItem(
      `${JELLY_GATHER_ATTEMPT_KEY_PREFIX}2-1`,
      JSON.stringify({ format: 1, version: BRIDGE.version, history: "ULLU", updatedAt: 1 }),
    );
    refreshProgress();
    renderWithIntl(<PlayLevel level={BRIDGE} />);
    expect(steps()).toBe("4 bước");
    expect(calls).toEqual([]);
  });

  it("a push that sticks: a slide then a settle, 200 ms in all at most", () => {
    renderWithIntl(<PlayLevel level={BRIDGE} />);
    press("ULLU");
    calls = [];
    press("R");
    expect(calls.length).toBeGreaterThan(1);
    const settles = calls.filter(([, options]) => (options.delay ?? 0) > 0);
    expect(settles.length).toBeGreaterThan(0);
    for (const [, options] of calls) {
      expect((Number(options.delay) || 0) + Number(options.duration)).toBeLessThanOrEqual(200);
    }
  });

  it("Bước không đi được: the player nudges towards the wall and back", () => {
    renderWithIntl(<PlayLevel level={BRIDGE} />);
    press("D");
    expect(calls).toHaveLength(1);
    expect(steps()).toBe("0 bước");
  });
});

describe("SolvedPanel", () => {
  it("Màn cuối: no next level; restart, undo and the list", () => {
    const last = LEVELS.at(-1);
    if (last === undefined) throw new Error("no levels");
    renderWithIntl(
      <SolvedPanel
        level={last}
        steps={last.minMoves + 3}
        best={last.minMoves + 1}
        onRestart={vi.fn()}
        onUndo={vi.fn()}
        firstRef={{ current: null }}
      />,
    );
    expect(screen.queryByRole("link", { name: "Màn tiếp" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chơi lại màn" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Hoàn tác" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Danh sách màn" })).toBeVisible();
    expect(screen.getByText(`${last.minMoves + 3} bước`)).toBeVisible();
    expect(screen.getByText(`${last.minMoves + 1} bước`)).toBeVisible();
    expect(screen.getByText(`${last.minMoves} bước`)).toBeVisible();
    expect(screen.queryByText("Ít bước nhất có thể!")).not.toBeInTheDocument();
  });
});

describe("JellyBoard", () => {
  it("draws a sign for every kind, one shape for a stuck piece, and a pin on a fixed coconut", () => {
    const coconut = level("3-2"); // its coconut in the corner is fixed from the start.
    renderWithIntl(<JellyBoard level={coconut} board={coconut.start} face="D" motion={null} />);
    const pieces = document.querySelectorAll("[data-piece]");
    expect(pieces).toHaveLength(coconut.start.pieces.length);
    expect(document.querySelectorAll("[data-fixed] [data-pin]")).toHaveLength(1);
  });

  it("Khôi phục không trượt: no motion when shown, one each new move, none for the same move again", () => {
    const animate = vi.fn();
    Object.defineProperty(SVGElement.prototype, "animate", { value: animate, configurable: true });
    const motion = {
      serial: 1,
      direction: "R" as const,
      slid: new Set([BRIDGE.start.player + 1]),
      settled: new Set<number>(),
    };
    const view = renderWithIntl(
      <JellyBoard level={BRIDGE} board={BRIDGE.start} face="D" motion={null} />,
    );
    expect(animate).not.toHaveBeenCalled();
    view.rerender(<JellyBoard level={BRIDGE} board={BRIDGE.start} face="R" motion={motion} />);
    expect(animate).toHaveBeenCalled();
    animate.mockClear();
    view.rerender(<JellyBoard level={BRIDGE} board={BRIDGE.start} face="R" motion={motion} />);
    expect(animate).not.toHaveBeenCalled();
    Reflect.deleteProperty(SVGElement.prototype, "animate");
  });

  it("Giảm chuyển động: nothing slides", () => {
    const animate = vi.fn();
    Object.defineProperty(SVGElement.prototype, "animate", { value: animate, configurable: true });
    // jsdom has no matchMedia: this one asks for reduced motion.
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: query.includes("reduce"),
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    });
    const view = renderWithIntl(
      <JellyBoard level={BRIDGE} board={BRIDGE.start} face="D" motion={null} />,
    );
    view.rerender(
      <JellyBoard
        level={BRIDGE}
        board={BRIDGE.start}
        face="R"
        motion={{ serial: 1, direction: "R", slid: new Set(), settled: new Set() }}
      />,
    );
    expect(animate).not.toHaveBeenCalled();
    Reflect.deleteProperty(SVGElement.prototype, "animate");
    Reflect.deleteProperty(window, "matchMedia");
  });
});

describe("LevelList", () => {
  it("Lần đầu vào: every chapter, nothing solved, start at 1-1, how to play open", () => {
    renderWithIntl(<LevelList />);
    expect(screen.getByRole("heading", { level: 1, name: "Gom thạch" })).toBeVisible();
    for (const name of [
      "Chương 1 · Dính lại",
      "Chương 2 · Sương sáo",
      "Chương 3 · Thạch dừa",
      "Chương 4 · Khuôn",
      "Chương 5 · Kho đá",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeVisible();
    }
    const links = screen.getAllByRole("link", { name: /^Màn \d-\d, chưa giải$/ });
    expect(links).toHaveLength(LEVELS.length);
    expect(screen.getByRole("link", { name: "Bắt đầu: màn 1-1" })).toHaveAttribute(
      "href",
      "/puzzles/jelly-gather/1-1",
    );
    expect(screen.getByText("Cách chơi").closest("details")).toHaveAttribute("open");
  });

  it("Màn chơi dở gần nhất: solved marked with its best, continue at the level in progress", () => {
    const first = level("1-1");
    window.localStorage.setItem(
      JELLY_GATHER_PROGRESS_KEY,
      JSON.stringify({
        format: 1,
        best: { "1-1": { moves: first.minMoves + 5, version: first.version } },
      }),
    );
    window.localStorage.setItem(
      `${JELLY_GATHER_ATTEMPT_KEY_PREFIX}1-2`,
      JSON.stringify({ format: 1, version: level("1-2").version, history: "U", updatedAt: 9 }),
    );
    refreshProgress();
    renderWithIntl(<LevelList />);
    expect(
      screen.getByRole("link", { name: `Màn 1-1, đã giải, ${first.minMoves + 5} bước` }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Tiếp tục: màn 1-2" })).toHaveAttribute(
      "href",
      "/puzzles/jelly-gather/1-2",
    );
    expect(screen.getByText("Cách chơi").closest("details")).not.toHaveAttribute("open");
    expect(screen.getByText(`Đã giải 1/${LEVELS.length} màn.`, { exact: false })).toBeVisible();
  });

  it("updates when another tab solves a level", () => {
    renderWithIntl(<LevelList />);
    act(() => {
      window.localStorage.setItem(
        JELLY_GATHER_PROGRESS_KEY,
        JSON.stringify({
          format: 1,
          best: { "1-1": { moves: 40, version: level("1-1").version } },
        }),
      );
      window.dispatchEvent(new StorageEvent("storage", { key: JELLY_GATHER_PROGRESS_KEY }));
    });
    expect(screen.getByRole("link", { name: "Màn 1-1, đã giải, 40 bước" })).toBeVisible();
  });
});
