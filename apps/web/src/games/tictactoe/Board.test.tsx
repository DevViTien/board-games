import { tictactoe, type TicTacToeMove, type TicTacToeState } from "@board-games/games/tictactoe";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { type BoardProps, defaultBoardLayout } from "../types";
import { TicTacToeBoard } from "./Board";

const EMPTY: TicTacToeState = tictactoe.setup();

function boardProps(
  state: TicTacToeState,
  overrides: Partial<BoardProps<TicTacToeState, TicTacToeMove>> = {},
): BoardProps<TicTacToeState, TicTacToeMove> {
  return {
    state,
    legalMoves: tictactoe.legalMoves(state),
    onMove: vi.fn(),
    disabled: false,
    result: tictactoe.result(state),
    lastEntry: null,
    viewer: null,
    layout: defaultBoardLayout,
    ...overrides,
  };
}

/** A board whose parent applies each move and re-renders, like the play screen does. */
function PlayableBoard() {
  const [state, setState] = useState(EMPTY);
  return (
    <TicTacToeBoard
      {...boardProps(state, {
        onMove: (move) => {
          setState(tictactoe.applyMove(state, move));
        },
      })}
    />
  );
}

const cellNamed = (name: string) => screen.getByRole("button", { name });

describe("TicTacToeBoard", () => {
  it("shows nine cells named by row, column and content", () => {
    const state = tictactoe.applyMove(EMPTY, { cell: 1 });
    renderWithIntl(<TicTacToeBoard {...boardProps(state)} />);

    expect(screen.getAllByRole("button")).toHaveLength(9);
    expect(cellNamed("Hàng 1, cột 2, X")).toBeInTheDocument();
    expect(cellNamed("Hàng 3, cột 3, trống")).toBeInTheDocument();
  });

  it("names cells in the player's language", () => {
    renderWithIntl(<TicTacToeBoard {...boardProps(EMPTY)} />, { locale: "en" });

    expect(cellNamed("Row 2, column 2, empty")).toBeInTheDocument();
  });

  it("describes the cell of the last move as such, and only that one", () => {
    const state = tictactoe.applyMove(tictactoe.applyMove(EMPTY, { cell: 0 }), { cell: 5 });
    renderWithIntl(<TicTacToeBoard {...boardProps(state, { lastEntry: { move: { cell: 5 } } })} />);

    expect(cellNamed("Hàng 2, cột 3, O")).toHaveAccessibleDescription("Nước vừa đi");
    expect(cellNamed("Hàng 1, cột 1, X")).not.toHaveAccessibleDescription();
    // Hidden, so it is read only as the description of that cell.
    expect(screen.queryByText("Nước vừa đi")).not.toBeVisible();
  });

  it("reports the move for an empty cell", async () => {
    const onMove = vi.fn();
    renderWithIntl(<TicTacToeBoard {...boardProps(EMPTY, { onMove })} />);

    await userEvent.click(cellNamed("Hàng 2, cột 2, trống"));

    expect(onMove).toHaveBeenCalledWith({ cell: 4 });
  });

  it("ignores a marked cell, which is shown as not selectable", async () => {
    const onMove = vi.fn();
    const state = tictactoe.applyMove(EMPTY, { cell: 4 });
    renderWithIntl(<TicTacToeBoard {...boardProps(state, { onMove })} />);

    const marked = cellNamed("Hàng 2, cột 2, X");
    await userEvent.click(marked);

    expect(onMove).not.toHaveBeenCalled();
    expect(marked).toHaveAttribute("aria-disabled", "true");
  });

  it("makes every cell unselectable when disabled", async () => {
    const onMove = vi.fn();
    renderWithIntl(<TicTacToeBoard {...boardProps(EMPTY, { onMove, disabled: true })} />);

    for (const cell of screen.getAllByRole("button")) {
      expect(cell).toHaveAttribute("aria-disabled", "true");
    }
    await userEvent.click(cellNamed("Hàng 1, cột 1, trống"));
    expect(onMove).not.toHaveBeenCalled();
  });

  it("keeps focus on the cell played with Enter, and Tab moves on through the board", async () => {
    renderWithIntl(<PlayableBoard />);
    const user = userEvent.setup();

    // Tab to the centre cell (the fifth button) and play it with the keyboard.
    for (let press = 0; press < 5; press += 1) await user.tab();
    expect(cellNamed("Hàng 2, cột 2, trống")).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(cellNamed("Hàng 2, cột 2, X")).toHaveFocus();
    await user.tab();
    expect(cellNamed("Hàng 2, cột 3, trống")).toHaveFocus();
  });

  it("lets Tab reach marked cells so their content can be heard", async () => {
    const state = tictactoe.applyMove(EMPTY, { cell: 0 });
    renderWithIntl(<TicTacToeBoard {...boardProps(state)} />);

    await userEvent.tab();

    expect(cellNamed("Hàng 1, cột 1, X")).toHaveFocus();
  });

  it("marks the last move by a dashed ring inside its tile, apart from the focus ring outside", () => {
    const state = tictactoe.applyMove(EMPTY, { cell: 4 });
    renderWithIntl(<TicTacToeBoard {...boardProps(state, { lastEntry: { move: { cell: 4 } } })} />);

    const last = cellNamed("Hàng 2, cột 2, X");
    const ring = last.querySelector("span[aria-hidden]");
    expect(ring).toHaveClass("border-dashed", "border-game-last-move", "absolute", "inset-1.5");
    // The focus ring is the shared one, an outline outside the tile.
    expect(last).toHaveClass("focus-ring");
    expect(cellNamed("Hàng 1, cột 1, trống").querySelector("span[aria-hidden]")).toBeNull();
  });

  it("draws X and O in the game's two mark colours, none in the accent", () => {
    const state = tictactoe.applyMove(tictactoe.applyMove(EMPTY, { cell: 0 }), { cell: 1 });
    renderWithIntl(<TicTacToeBoard {...boardProps(state)} />);

    expect(cellNamed("Hàng 1, cột 1, X").querySelector("svg")).toHaveClass("text-game-mark-1");
    expect(cellNamed("Hàng 1, cột 2, O").querySelector("svg")).toHaveClass("text-game-mark-2");
    expect(document.querySelector("[class*='accent']")).toBeNull();
  });

  it("shows an empty tile that cannot be chosen unlike one that can, without hovering", () => {
    const { unmount } = renderWithIntl(<TicTacToeBoard {...boardProps(EMPTY)} />);
    const playable = cellNamed("Hàng 1, cột 1, trống");
    expect(playable).toHaveClass("border-game-line");
    expect(playable).not.toHaveClass("border-dashed");
    unmount();

    renderWithIntl(<TicTacToeBoard {...boardProps(EMPTY, { disabled: true })} />);
    expect(cellNamed("Hàng 1, cột 1, trống")).toHaveClass("border-dashed");
  });
});

/** Plays the cells given (0–8, X first) from an empty board. */
const played = (...cells: readonly number[]) =>
  cells.reduce((state, cell) => tictactoe.applyMove(state, { cell }), EMPTY);

describe("Bàn Tic-tac-toe hiển thị hàng thắng", () => {
  it("Thắng theo hàng ngang: the three tiles of row 1 are described and crossed out", () => {
    // X takes the top row while O plays the middle row.
    const { container } = renderWithIntl(
      <TicTacToeBoard
        {...boardProps(played(0, 3, 1, 4, 2), { lastEntry: { move: { cell: 2 } } })}
      />,
    );

    for (const name of ["Hàng 1, cột 1, X", "Hàng 1, cột 2, X"]) {
      expect(cellNamed(name)).toHaveAccessibleDescription("Thuộc hàng thắng");
    }
    expect(cellNamed("Hàng 1, cột 3, X")).toHaveAccessibleDescription(
      "Nước vừa đi Thuộc hàng thắng",
    );
    expect(cellNamed("Hàng 2, cột 1, O")).not.toHaveAccessibleDescription();
    // The winning tiles have an ink edge, so the win reads by shape; the line runs under the marks.
    expect(cellNamed("Hàng 1, cột 2, X")).toHaveClass("border-fg");
    expect(cellNamed("Hàng 2, cột 1, O")).not.toHaveClass("border-fg");
    expect(cellNamed("Hàng 1, cột 1, X").querySelector("svg")).toHaveClass("z-[2]");
    const stroke = container.querySelector("[data-winning-line]");
    expect(stroke).toHaveAttribute("aria-hidden", "true");
    for (const path of stroke?.querySelectorAll("path") ?? []) {
      expect(path).toHaveClass("animate-draw-line", "motion-reduce:animate-none");
    }
  });

  it("Thắng theo đường chéo: the anti-diagonal's tiles are described", () => {
    // O takes the diagonal from the top right to the bottom left.
    renderWithIntl(<TicTacToeBoard {...boardProps(played(0, 2, 1, 4, 3, 6))} />);

    for (const name of ["Hàng 1, cột 3, O", "Hàng 2, cột 2, O", "Hàng 3, cột 1, O"]) {
      expect(cellNamed(name)).toHaveAccessibleDescription("Thuộc hàng thắng");
    }
    expect(cellNamed("Hàng 1, cột 1, X")).not.toHaveAccessibleDescription();
  });

  it("marks both lines when the last move completed two at once", () => {
    // X: 0, 2, 6, 8, then 4 completes both diagonals.
    const { container } = renderWithIntl(
      <TicTacToeBoard {...boardProps(played(0, 1, 2, 3, 6, 5, 8, 7, 4))} />,
    );

    expect(container.querySelectorAll("[data-winning-line]")).toHaveLength(2);
    for (const name of [
      "Hàng 1, cột 1, X",
      "Hàng 1, cột 3, X",
      "Hàng 2, cột 2, X",
      "Hàng 3, cột 1, X",
      "Hàng 3, cột 3, X",
    ]) {
      expect(cellNamed(name)).toHaveAccessibleDescription(/Thuộc hàng thắng/);
    }
  });

  it("draws no line while nobody has won", () => {
    const { container } = renderWithIntl(<TicTacToeBoard {...boardProps(played(0, 4))} />);

    expect(container.querySelector("[data-winning-line]")).toBeNull();
  });
});
