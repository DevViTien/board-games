import {
  forbiddenTriangle,
  type ForbiddenTriangleMove,
  type ForbiddenTriangleState,
  lineOf,
} from "@board-games/games/forbidden-triangle";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { defaultBoardLayout } from "../types";
import { ForbiddenTriangleBoard } from "./Board";
import {
  useForbiddenTriangleMoveLabel,
  useForbiddenTriangleResultDetail,
  useForbiddenTriangleSeatSummary,
} from "./words";

const [A, B, C, D, E] = [0, 1, 2, 3, 4];

/** Plays the lines joining each pair, in turn from Đỏ. */
function play(pairs: readonly (readonly [number, number])[], guests: 5 | 6 | 7 = 6) {
  return pairs.reduce(
    (state, [a, b]) => forbiddenTriangle.applyMove(state, { line: lineOf(guests, a, b) }),
    forbiddenTriangle.setup({ playerCount: 2, options: { guests } }),
  );
}

function renderBoard(state: ForbiddenTriangleState, { disabled = false } = {}) {
  const onMove = vi.fn<(move: ForbiddenTriangleMove) => void>();
  const view = renderWithIntl(
    <ForbiddenTriangleBoard
      state={state}
      legalMoves={disabled ? [] : forbiddenTriangle.legalMoves(state)}
      onMove={onMove}
      disabled={disabled}
      result={forbiddenTriangle.result(state)}
      lastEntry={state.last === null ? null : { move: { line: state.last } }}
      viewer={null}
      layout={defaultBoardLayout}
    />,
  );
  return { onMove, view };
}

const guest = (letter: string) =>
  within(screen.getByRole("group", { name: /^Bàn tiệc/u })).getByRole("button", {
    name: new RegExp(`^Khách ${letter}[:,]`, "u"),
  });

/** Đỏ has A–B and B–C, Xanh D–E: Đỏ to move again. */
const RED_CORNER = [
  [A, B],
  [D, E],
  [B, C],
  [A, E],
] as const;

describe("Thao tác", () => {
  it("Nối bằng hai lần chạm: A then C draws A–C", async () => {
    const { onMove } = renderBoard(play([]));
    const user = userEvent.setup();

    await user.click(guest("A"));
    expect(guest("A")).toHaveAttribute("aria-pressed", "true");
    await user.click(guest("C"));

    expect(onMove).toHaveBeenCalledWith({ line: lineOf(6, A, C) });
  });

  it("Bỏ chọn: Esc, or the same guest again, lets go of the first guest", async () => {
    const { onMove } = renderBoard(play([]));
    const user = userEvent.setup();

    await user.click(guest("A"));
    await user.keyboard("{Escape}");
    expect(guest("A")).toHaveAttribute("aria-pressed", "false");
    await user.click(guest("B"));
    await user.click(guest("B"));
    expect(guest("B")).toHaveAttribute("aria-pressed", "false");
    expect(onMove).not.toHaveBeenCalled();
  });

  it("goes round the table with the arrow keys, one Tab stop, and chooses with Enter", async () => {
    const { onMove } = renderBoard(play([]));
    const user = userEvent.setup();

    await user.tab();
    expect(guest("A")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(guest("F")).toHaveFocus();
    await user.keyboard("{Enter}{ArrowRight}{ArrowRight}{Enter}");

    // F, then two steps on: B. The line F–B.
    expect(onMove).toHaveBeenCalledWith({ line: lineOf(6, 5, B) });
  });

  it("does not take a guest already joined to the first one", async () => {
    const { onMove } = renderBoard(play([[A, B]]));
    const user = userEvent.setup();

    await user.click(guest("B"));
    expect(guest("A")).toHaveAttribute("aria-disabled", "true");
    expect(guest("A")).toHaveAccessibleName("Khách A: đã có dây đỏ với B");
    await user.click(guest("A"));
    expect(onMove).not.toHaveBeenCalled();
  });

  it("does nothing while the board is locked", async () => {
    const { onMove } = renderBoard(play([]), { disabled: true });
    const user = userEvent.setup();

    await user.click(guest("A"));
    await user.click(guest("B"));
    expect(onMove).not.toHaveBeenCalled();
    expect(guest("A")).toHaveAttribute("aria-disabled", "true");
  });
});

describe("Cảnh báo nước tự thua", () => {
  it("Xác nhận nước tự thua: marks the danger, asks, and Không nối draws nothing", async () => {
    const { onMove } = renderBoard(play(RED_CORNER));
    const user = userEvent.setup();

    await user.click(guest("A"));
    // Tên của khách khi đã chọn khách thứ nhất.
    expect(guest("C")).toHaveAccessibleName("Khách C: nối A–C sẽ khép tam giác đỏ A–B–C");
    expect(guest("D")).toHaveAccessibleName("Khách D: nối A–D an toàn");
    expect(screen.getByText(/⚠\uFE0E là dây sẽ khép tam giác của bạn/u)).toBeVisible();

    await user.click(guest("C"));
    const dialog = screen.getByRole("dialog", { name: "Nối A–C?" });
    expect(dialog).toHaveTextContent("Dây này khép tam giác A–B–C của bạn: bạn sẽ thua ngay.");
    await user.click(within(dialog).getByRole("button", { name: "Không nối" }));

    expect(onMove).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("draws the line once confirmed", async () => {
    const { onMove } = renderBoard(play(RED_CORNER));
    const user = userEvent.setup();

    await user.click(guest("A"));
    await user.click(guest("C"));
    await user.click(screen.getByRole("button", { name: "Vẫn nối" }));

    expect(onMove).toHaveBeenCalledWith({ line: lineOf(6, A, C) });
  });
});

describe("Hiển thị bàn", () => {
  it("Dây hai màu khác nét: red solid, blue dashed, undrawn dotted and thinner", () => {
    const { view } = renderBoard(
      play([
        [A, B],
        [C, D],
      ]),
    );

    const red = view.container.querySelector('[data-line="A–B"]');
    const blue = view.container.querySelector('[data-line="C–D"]');
    const undrawn = view.container.querySelector('[data-line="A–C"]');
    expect(red).toHaveAttribute("data-owner", "red");
    expect(red).not.toHaveAttribute("stroke-dasharray");
    expect(blue).toHaveAttribute("data-owner", "blue");
    expect(blue).toHaveAttribute("stroke-dasharray");
    expect(undrawn).toHaveAttribute("data-owner", "none");
    expect(Number(undrawn?.getAttribute("stroke-width"))).toBeLessThan(
      Number(red?.getAttribute("stroke-width")),
    );
  });

  it("shows whose turn it is on the table's edge, in the mover's colour", () => {
    const { view } = renderBoard(play([[A, B]]));

    expect(view.container.querySelector("[data-turn]")).toHaveAttribute("data-turn", "blue");
  });

  it("Tam giác thua tô nổi: the triangle Đỏ closed", () => {
    const { view } = renderBoard(play([...RED_CORNER, [A, C]]), { disabled: true });

    expect(view.container.querySelector("[data-lost-triangle]")).toHaveAttribute(
      "data-lost-triangle",
      "A–B–C",
    );
  });

  it("names each guest with its lines, and describes the table", () => {
    renderBoard(
      play([
        [A, B],
        [C, B],
      ]),
    );

    expect(guest("B")).toHaveAccessibleName("Khách B: dây đỏ với A; dây xanh với C");
    expect(guest("E")).toHaveAccessibleName("Khách E: chưa có dây");
    expect(screen.getByRole("group", { name: "Bàn tiệc 6 khách" })).toHaveAccessibleDescription(
      "Dây đỏ: A–B. Dây xanh: B–C. Dây vừa nối: B–C.",
    );
  });

  it("fits seven guests, each touch target at least 44 px", () => {
    renderBoard(play([], 7));

    const guests = within(screen.getByRole("group", { name: "Bàn tiệc 7 khách" })).getAllByRole(
      "button",
    );
    expect(guests.map((button) => button.textContent)).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
    for (const button of guests) expect(button).toHaveClass("min-h-11", "min-w-11");
  });
});

/** Renders what the game's words say of a state, one line each. */
function Words({ state }: { readonly state: ForbiddenTriangleState }) {
  const move = useForbiddenTriangleMoveLabel();
  const resultDetail = useForbiddenTriangleResultDetail();
  const summary = useForbiddenTriangleSeatSummary();
  const result = forbiddenTriangle.result(state);
  return (
    <ul>
      <li>{state.last === null ? "no move" : move({ line: state.last }, state)}</li>
      <li>{result === null ? "no result" : (resultDetail(result, state) ?? "no detail")}</li>
      <li>{summary(0, state).full}</li>
      <li>{summary(1, state).full}</li>
    </ul>
  );
}

function wordsOf(state: ForbiddenTriangleState): string[] {
  const view = renderWithIntl(<Words state={state} />);
  const lines = screen.getAllByRole("listitem").map((item) => item.textContent);
  view.unmount();
  return lines;
}

describe("words", () => {
  it("Đọc nước đi và kết quả: nối A–C, and the triangle closed", () => {
    expect(wordsOf(play([...RED_CORNER, [A, C]])).slice(0, 2)).toEqual([
      "nối A–C",
      "Đỏ khép tam giác A–B–C.",
    ]);
  });

  it("tells a draw at five guests", () => {
    const ring = [
      [A, B],
      [B, C],
      [C, D],
      [D, E],
      [E, A],
    ] as const;
    const diagonals = [
      [A, C],
      [C, E],
      [E, B],
      [B, D],
      [D, A],
    ] as const;
    const state = play(
      ring.flatMap((pair, index) => [pair, diagonals[index] ?? pair]),
      5,
    );

    expect(wordsOf(state)[1]).toBe("Đã nối hết dây, không ai khép tam giác.");
  });

  it("Đếm dây an toàn: 11 for Đỏ, 12 for Xanh", () => {
    expect(
      wordsOf(
        play([
          [A, B],
          [D, E],
          [B, C],
        ]),
      ).slice(2),
    ).toEqual(["Còn 11 dây an toàn", "Còn 12 dây an toàn"]);
  });

  it("counts the lines each one drew once the game is over", () => {
    expect(wordsOf(play([...RED_CORNER, [A, C]])).slice(2)).toEqual([
      "3 dây đã nối",
      "2 dây đã nối",
    ]);
  });

  it("says every line closes a triangle for the player to move with none safe", () => {
    // Đỏ to move, every line left closing a red triangle: Đỏ took a star from A and its ring.
    const state = {
      ...play([]),
      lines: play([]).lines.map((_owner, line) => (line < 5 ? 0 : null)),
      toMove: 0,
    } as const;
    expect(wordsOf({ ...state, lines: state.lines })[2]).toBe("Nước nào cũng khép tam giác");
  });
});

describe("a smaller table after a larger one", () => {
  it("keeps a Tab stop on the board when the guest focused last is gone", async () => {
    const user = userEvent.setup();
    const { view } = renderBoard(play([], 7));
    await user.tab();
    await user.keyboard("{End}");
    expect(guest("G")).toHaveFocus();

    const five = play([], 5);
    view.rerender(
      <ForbiddenTriangleBoard
        state={five}
        legalMoves={forbiddenTriangle.legalMoves(five)}
        onMove={vi.fn()}
        disabled={false}
        result={null}
        lastEntry={null}
        viewer={null}
        layout={defaultBoardLayout}
      />,
    );

    expect(guest("A")).toHaveAttribute("tabindex", "0");
  });
});
