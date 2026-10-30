import { tictactoe, type TicTacToeMove, type TicTacToeState } from "@board-games/games";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import type { BoardProps } from "../types";
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
});
