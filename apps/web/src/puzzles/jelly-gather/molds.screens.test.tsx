import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { JELLY_GATHER_ATTEMPT_KEY_PREFIX } from "@/config/storage-keys";
import { renderWithIntl } from "@/test/render-with-intl";

import { JellyBoard } from "./Board";
import { LevelList } from "./LevelList";
import { PlayLevel } from "./PlayLevel";
import { parseLevel } from "./rules/parse-level";
import { refreshProgress } from "./use-progress";

// Spec `jelly-gather` (add-jelly-gather-molds) on screen: molds drawn, the "Khuôn n/m" chip, the
// solved title, what screen readers hear, chapter 5's credit.

// Two strawberries and a two-cell mold below them: RRULLULDD solves it.
const BAR = parseLevel({
  id: "4-1",
  version: 1,
  minMoves: 9,
  rows: ["#######", "#.....#", "#.r.r.#", "#..@..#", "#.....#", "#######"],
  molds: [".......", ".......", ".......", ".......", ".RR....", "......."],
});

const KEYS = { U: "ArrowUp", D: "ArrowDown", L: "ArrowLeft", R: "ArrowRight" } as const;
const press = (moves: string) => {
  for (const move of moves) fireEvent.keyDown(window, { key: KEYS[move as keyof typeof KEYS] });
};
const chip = () => screen.getByText(/^Khuôn \d+\/\d+$/);

beforeEach(() => {
  window.localStorage.clear();
  refreshProgress();
});
afterEach(() => {
  window.localStorage.clear();
  refreshProgress();
});

describe("a level with molds", () => {
  it("draws its molds, and marks those that fit", () => {
    const { container, rerender } = renderWithIntl(
      <JellyBoard level={BAR} board={BAR.start} face="D" motion={null} />,
    );
    expect(container.querySelectorAll("[data-mold]")).toHaveLength(2);
    expect(container.querySelectorAll("[data-mold-over]")).toHaveLength(0);
    // The strawberry bar in place: both molds covered and fitted.
    const bar = {
      player: BAR.start.player,
      pieces: [{ cells: [29, 30], kinds: ["strawberry", "strawberry"] as const, fixed: false }],
    };
    rerender(<JellyBoard level={BAR} board={bar} face="D" motion={null} />);
    expect(container.querySelectorAll("[data-mold-over][data-fitted]")).toHaveLength(2);
  });

  it("Tiến độ khuôn: the chip follows the board, after an undo too", async () => {
    renderWithIntl(<PlayLevel level={BAR} />);
    expect(chip()).toHaveTextContent("Khuôn 0/2");
    expect(screen.getByText("0 trên 2 ô khuôn đã vừa")).toHaveClass("sr-only");
    press("RRULLULDD");
    expect(chip()).toHaveTextContent("Khuôn 2/2");
    expect(screen.getByRole("heading", { name: "Vừa khuôn!" })).toBeVisible();
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Khuôn 2/2. Vừa khuôn! 9 bước."),
    );
    fireEvent.keyDown(window, { key: "z" });
    expect(chip()).toHaveTextContent("Khuôn 0/2");
  });

  it("Mô tả bàn: molds, and what lies on them", () => {
    renderWithIntl(<PlayLevel level={BAR} />);
    const rows = within(screen.getByRole("list", { name: "Mô tả bàn" })).getAllByRole("listitem");
    expect(rows[4]).toHaveTextContent("Hàng 5: 1 ô tường, 2 ô khuôn dâu, 3 ô trống, 1 ô tường");
    press("DL");
    const after = within(screen.getByRole("list", { name: "Mô tả bàn" })).getAllByRole("listitem");
    expect(after[4]).toHaveTextContent("Hàng 5: 1 ô tường, 1 ô khuôn dâu, bạn trên khuôn dâu");
  });

  it("a level without molds has no chip", () => {
    const plain = parseLevel({
      id: "1-1",
      version: 1,
      minMoves: 4,
      rows: ["#######", "#.....#", "#.r.r.#", "#..@..#", "#######"],
    });
    renderWithIntl(<PlayLevel level={plain} />);
    expect(screen.queryByText(/^Khuôn /)).not.toBeInTheDocument();
  });
});

describe("a level with molds, more", () => {
  it("Tiến độ khuôn sau khi tải lại: the chip of a restored go", () => {
    window.localStorage.setItem(
      `${JELLY_GATHER_ATTEMPT_KEY_PREFIX}4-1`,
      JSON.stringify({ format: 1, version: BAR.version, history: "RRULLULDD", updatedAt: 1 }),
    );
    refreshProgress();
    renderWithIntl(<PlayLevel level={BAR} />);
    expect(chip()).toHaveTextContent("Khuôn 2/2");
    expect(screen.getByText("2 trên 2 ô khuôn đã vừa")).toBeInTheDocument();
  });

  it("Sai loại trên khuôn vẫn thấy khuôn: its frame, unfitted, and the description", () => {
    const wrong = parseLevel({
      id: "4-2",
      version: 1,
      minMoves: 1,
      rows: ["######", "#@g..#", "#..r.#", "######"],
      molds: ["......", "...R..", "......", "......"],
    });
    const { container } = renderWithIntl(<PlayLevel level={wrong} />);
    press("R");
    const over = container.querySelector('[data-mold-over="strawberry"]');
    expect(over).not.toBeNull();
    expect(over).not.toHaveAttribute("data-fitted");
    const rows = within(screen.getByRole("list", { name: "Mô tả bàn" })).getAllByRole("listitem");
    expect(rows[1]).toHaveTextContent("1 ô thạch lá dứa trên khuôn dâu");
    expect(chip()).toHaveTextContent("Khuôn 0/1");
  });
});

describe("the level list", () => {
  it("Ghi nguồn trên danh sách màn: chapter 5 names Boxoban and links to the licences", () => {
    renderWithIntl(<LevelList />);
    const chapter = screen
      .getByRole("heading", { level: 2, name: "Chương 5 · Kho đá" })
      .closest("section");
    if (chapter === null) throw new Error("no chapter 5");
    expect(chapter).toHaveTextContent("Màn từ bộ Boxoban của DeepMind, giấy phép Apache 2.0");
    expect(within(chapter).getByRole("link", { name: "Giấy phép bên thứ ba" })).toHaveAttribute(
      "href",
      "/third-party-licenses.txt",
    );
  });
});
