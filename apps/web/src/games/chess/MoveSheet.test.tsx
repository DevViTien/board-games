import type { GameResult } from "@board-games/engine";
import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { MoveSheet } from "./MoveSheet";

const sheet = () => screen.getByRole("region", { name: "Sổ ghi" });
const rows = () => within(sheet()).getAllByRole("listitem");
const MATE = ["f3", "e5", "g4", "Qh4#"];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MoveSheet", () => {
  it("Sổ ghi sau ba nửa nước: numbered pairs, the newest marked", () => {
    renderWithIntl(<MoveSheet san={["e4", "e5", "Nf3"]} result={null} />);

    expect(rows()).toHaveLength(2);
    expect(rows()[0]).toHaveTextContent(/^1\..*Tốt e4.*Tốt e5$/);
    expect(rows()[1]).toHaveTextContent(/^2\..*Mã f3$/);
    const current = sheet().querySelectorAll("[aria-current='true']");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("Mã f3");
    // The knight is drawn, not written.
    expect(current[0]?.querySelector("[data-piece-figurine='n']")).not.toBeNull();
  });

  it("Hoàn tác bỏ nước khỏi sổ ghi: only the moves in effect", () => {
    const { rerender } = renderWithIntl(<MoveSheet san={["e4", "e5"]} result={null} />);

    rerender(<MoveSheet san={["e4"]} result={null} />);

    expect(rows()).toHaveLength(1);
    expect(rows()[0]).not.toHaveTextContent("e5");
  });

  it.each([
    [{ kind: "win", winners: [1], reason: "checkmate" }, "0–1", "Đen thắng"],
    [{ kind: "win", winners: [0], reason: "checkmate" }, "1–0", "Trắng thắng"],
    [{ kind: "draw", reason: "threefold-claim" }, "½–½", "Hoà"],
  ] as const)("Tỉ số khi kết thúc: %o", (result: GameResult, shown, words) => {
    renderWithIntl(<MoveSheet san={MATE} result={result} />);

    expect(within(sheet()).getByText(shown)).toBeInTheDocument();
    expect(within(sheet()).getByText(words)).toHaveClass("sr-only");
  });

  it("ends a mate with the mating move and the score", () => {
    renderWithIntl(<MoveSheet san={MATE} result={{ kind: "win", winners: [1] }} />);

    expect(rows().at(-1)).toHaveTextContent("Hậu h4, chiếu hết");
    expect(sheet()).toHaveTextContent(/0–1/);
  });

  it("says there is no move yet", () => {
    renderWithIntl(<MoveSheet san={[]} result={null} />);

    expect(within(sheet()).getByText("Chưa có nước nào")).toBeInTheDocument();
  });

  it("is a named frame the keyboard can focus, never a live region", () => {
    renderWithIntl(<MoveSheet san={["e4"]} result={null} />);

    expect(sheet()).toHaveAttribute("tabindex", "0");
    expect(sheet().closest("[aria-live]")).toBeNull();
    expect(sheet().querySelector("[aria-live]")).toBeNull();
  });

  it("scrolls its own frame to the newest move, never the page", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(900);
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(700);
    const { rerender } = renderWithIntl(<MoveSheet san={["e4"]} result={null} />);
    sheet().scrollTop = 0;
    sheet().scrollLeft = 0;

    rerender(<MoveSheet san={["e4", "e5"]} result={null} />);

    expect(sheet().scrollTop).toBe(900);
    expect(sheet().scrollLeft).toBe(700);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
