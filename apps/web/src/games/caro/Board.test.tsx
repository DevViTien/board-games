import { caro, type CaroMove, type CaroState } from "@board-games/games/caro";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { observeWidthAs } from "@/test/fake-resize-observer";
import { renderWithIntl } from "@/test/render-with-intl";

import type { BoardProps } from "../types";
import { CaroBoard } from "./Board";

const SIZE = 15;
const EMPTY: CaroState = caro.setup({
  playerCount: 2,
  options: { size: 15, rule: "blocked-ends" },
});

const at = (row: number, col: number) => (row - 1) * SIZE + (col - 1);

/** The state after playing `cells` in order, X first. */
function played(...cells: readonly number[]): CaroState {
  return cells.reduce((state, cell) => caro.applyMove(state, { cell }), EMPTY);
}

function boardProps(
  state: CaroState,
  overrides: Partial<BoardProps<CaroState, CaroMove>> = {},
): BoardProps<CaroState, CaroMove> {
  return {
    state,
    legalMoves: caro.legalMoves(state),
    onMove: vi.fn(),
    disabled: false,
    result: caro.result(state),
    lastEntry: null,
    viewer: null,
    ...overrides,
  };
}

/** A board whose parent applies each move and re-renders, like the play screen does. */
function PlayableBoard({ onMove }: { onMove?: (move: CaroMove) => void }) {
  const [state, setState] = useState(EMPTY);
  return (
    <CaroBoard
      {...boardProps(state, {
        onMove: (move) => {
          onMove?.(move);
          setState(caro.applyMove(state, move));
        },
        lastEntry: null,
      })}
    />
  );
}

const cellButton = (row: number, col: number) =>
  screen.getByRole("button", { name: new RegExp(`^Hàng ${row}, cột ${col},`) });
/** Checks the focused element is the cell at `row`, `col`, without searching the 225 cells by name. */
function expectFocusOn(row: number, col: number) {
  expect(document.activeElement).toHaveAccessibleName(new RegExp(`^Hàng ${row}, cột ${col},`));
}
/** Keys are typed at once: the board's handlers are what is tested, not typing speed. */
const keyboardUser = () => userEvent.setup({ delay: null });
const selectedCells = () => screen.queryAllByRole("gridcell", { selected: true });

/** Makes the board measure its cells as `px` CSS pixels wide (jsdom does no layout). */
function cellsMeasure(px: number) {
  observeWidthAs(px * SIZE);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Taps `element` with a finger. */
async function tap(user: ReturnType<typeof userEvent.setup>, element: Element) {
  await user.pointer({ keys: "[TouchA]", target: element });
}

describe("CaroBoard", () => {
  it("is a grid named Bàn cờ with a named button in each of its 225 cells", () => {
    renderWithIntl(<CaroBoard {...boardProps(played(at(1, 2)))} />);

    expect(screen.getByRole("grid", { name: "Bàn cờ" })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(15);
    expect(screen.getAllByRole("button")).toHaveLength(225);
    expect(cellButton(1, 2)).toHaveAccessibleName("Hàng 1, cột 2, X");
    expect(cellButton(15, 15)).toHaveAccessibleName("Hàng 15, cột 15, trống");
  });

  it("reports the move for an empty cell", async () => {
    const onMove = vi.fn();
    renderWithIntl(<CaroBoard {...boardProps(EMPTY, { onMove })} />);

    await userEvent.click(cellButton(8, 8));

    expect(onMove).toHaveBeenCalledWith({ cell: at(8, 8) });
  });

  it("ignores a cell holding a stone, which is shown as not selectable", async () => {
    const onMove = vi.fn();
    renderWithIntl(<CaroBoard {...boardProps(played(at(8, 8)), { onMove })} />);

    await userEvent.click(cellButton(8, 8));

    expect(onMove).not.toHaveBeenCalled();
    expect(cellButton(8, 8)).toHaveAttribute("aria-disabled", "true");
    expect(cellButton(8, 9)).toHaveAttribute("aria-disabled", "false");
  });

  it("makes every cell unselectable when disabled", async () => {
    const onMove = vi.fn();
    renderWithIntl(<CaroBoard {...boardProps(EMPTY, { onMove, disabled: true })} />);

    expect(
      screen.getAllByRole("button").every((cell) => cell.getAttribute("aria-disabled") === "true"),
    ).toBe(true);
    await userEvent.click(cellButton(8, 8));
    expect(onMove).not.toHaveBeenCalled();
  });

  it("describes the cell of the last move as such, and only that one", () => {
    const state = played(at(8, 8), at(7, 9));
    renderWithIntl(
      <CaroBoard {...boardProps(state, { lastEntry: { move: { cell: at(7, 9) } } })} />,
    );

    expect(cellButton(7, 9)).toHaveAccessibleName("Hàng 7, cột 9, O");
    expect(cellButton(7, 9)).toHaveAccessibleDescription("Nước vừa đi");
    expect(cellButton(8, 8)).not.toHaveAccessibleDescription();
    expect(screen.queryByText("Nước vừa đi")).not.toBeVisible();
  });

  it("highlights the cells of the winning line and describes each of them", () => {
    // X fills row 8, columns 4–8; O answers on row 10.
    const state = played(
      at(8, 4),
      at(10, 1),
      at(8, 5),
      at(10, 3),
      at(8, 6),
      at(10, 5),
      at(8, 7),
      at(10, 7),
      at(8, 8),
    );
    renderWithIntl(
      <CaroBoard {...boardProps(state, { lastEntry: { move: { cell: at(8, 8) } } })} />,
    );

    for (const col of [4, 5, 6, 7]) {
      expect(cellButton(8, col)).toHaveAccessibleDescription("Thuộc hàng thắng");
    }
    expect(cellButton(8, 8)).toHaveAccessibleDescription("Nước vừa đi Thuộc hàng thắng");
    expect(cellButton(8, 9)).not.toHaveAccessibleDescription();
    expect(cellButton(10, 1)).not.toHaveAccessibleDescription();
  });
});

describe("CaroBoard with the keyboard", () => {
  it("is entered with Tab on the centre cell when no move has been played", async () => {
    renderWithIntl(<CaroBoard {...boardProps(EMPTY)} />);

    await keyboardUser().tab();

    expect(document.activeElement).toHaveAccessibleName("Hàng 8, cột 8, trống");
  });

  it("is entered with Tab on the cell of the last move", async () => {
    const state = played(at(8, 8), at(3, 4));
    renderWithIntl(
      <CaroBoard {...boardProps(state, { lastEntry: { move: { cell: at(3, 4) } } })} />,
    );

    await keyboardUser().tab();

    expectFocusOn(3, 4);
  });

  it("moves with the arrows and places a stone with Enter, keeping the focus there", async () => {
    const onMove = vi.fn();
    renderWithIntl(<PlayableBoard onMove={onMove} />);
    const user = keyboardUser();

    await user.tab();
    await user.keyboard("{ArrowRight}{Enter}");

    expect(onMove).toHaveBeenCalledWith({ cell: at(8, 9) });
    expect(document.activeElement).toHaveAccessibleName("Hàng 8, cột 9, X");
  });

  it("places a stone with Space too", async () => {
    const onMove = vi.fn();
    renderWithIntl(<PlayableBoard onMove={onMove} />);
    const user = keyboardUser();

    await user.tab();
    await user.keyboard("{ArrowDown}[Space]");

    expect(onMove).toHaveBeenCalledWith({ cell: at(9, 8) });
  });

  it("stops at the edges, and goes to the start and end of the row with Home and End", async () => {
    renderWithIntl(<CaroBoard {...boardProps(EMPTY)} />);
    const user = keyboardUser();

    await user.tab();
    await user.keyboard("{Home}");
    expectFocusOn(8, 1);
    await user.keyboard("{ArrowLeft}");
    expectFocusOn(8, 1);
    await user.keyboard("{ArrowUp>9/}");
    expectFocusOn(1, 1);
    await user.keyboard("{End}");
    expectFocusOn(1, 15);
    await user.keyboard("{ArrowRight}");
    expectFocusOn(1, 15);
    await user.keyboard("{ArrowDown>16/}");
    expectFocusOn(15, 15);
  });

  it("is a single Tab stop: Tab leaves the board, Shift+Tab comes back to the same cell", async () => {
    renderWithIntl(
      <>
        <CaroBoard {...boardProps(EMPTY)} />
        <button type="button">after</button>
      </>,
    );
    const user = keyboardUser();

    await user.tab();
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    await user.tab();
    expect(screen.getByRole("button", { name: "after" })).toHaveFocus();

    await user.tab({ shift: true });
    expectFocusOn(8, 6);
    const grid = screen.getByRole("grid", { name: "Bàn cờ" });
    expect(grid.querySelectorAll('button[tabindex="0"]')).toHaveLength(1);
  });
});

describe("CaroBoard on a touch screen", () => {
  it("selects a small cell on the first tap and places the stone on the second", async () => {
    cellsMeasure(17);
    const onMove = vi.fn();
    renderWithIntl(<CaroBoard {...boardProps(EMPTY, { onMove })} />);
    const user = userEvent.setup();

    await tap(user, cellButton(10, 10));

    expect(onMove).not.toHaveBeenCalled();
    expect(selectedCells()).toHaveLength(1);
    expect(selectedCells()[0]).toContainElement(cellButton(10, 10));
    expect(screen.getByText("Chạm lần nữa để đặt quân")).toBeInTheDocument();

    await tap(user, cellButton(10, 10));

    expect(onMove).toHaveBeenCalledWith({ cell: at(10, 10) });
  });

  it("moves the selection to another cell tapped before placing", async () => {
    cellsMeasure(17);
    const onMove = vi.fn();
    renderWithIntl(<CaroBoard {...boardProps(EMPTY, { onMove })} />);
    const user = userEvent.setup();

    await tap(user, cellButton(10, 10));
    await tap(user, cellButton(10, 11));

    expect(onMove).not.toHaveBeenCalled();
    expect(selectedCells()).toHaveLength(1);
    expect(selectedCells()[0]).toContainElement(cellButton(10, 11));
  });

  it("places at once with Enter on a cell selected by a tap", async () => {
    cellsMeasure(17);
    const onMove = vi.fn();
    renderWithIntl(<CaroBoard {...boardProps(EMPTY, { onMove })} />);
    const user = userEvent.setup();

    await tap(user, cellButton(10, 10));
    act(() => {
      cellButton(10, 10).focus();
    });
    await user.keyboard("{Enter}");

    expect(onMove).toHaveBeenCalledWith({ cell: at(10, 10) });
  });

  it.each([
    // Undoing the only move gives back an empty board.
    ["a move is undone", () => boardProps(played())],
    ["another move is played", () => boardProps(played(at(8, 8), at(1, 1)))],
    ["the board is locked", (state: CaroState) => boardProps(state, { disabled: true })],
  ])("drops the selection when %s", async (_what, next) => {
    cellsMeasure(17);
    const state = played(at(8, 8));
    const { rerender } = renderWithIntl(<CaroBoard {...boardProps(state)} />);
    const user = userEvent.setup();

    await tap(user, cellButton(10, 10));
    expect(selectedCells()).toHaveLength(1);

    rerender(<CaroBoard {...next(state)} />);

    expect(selectedCells()).toHaveLength(0);
    expect(screen.queryByText("Chạm lần nữa để đặt quân")).not.toBeInTheDocument();
  });

  it("keeps the selection when the same position comes again as a new object (online)", async () => {
    cellsMeasure(17);
    const state = played(at(8, 8));
    const lastEntry = { move: { cell: at(8, 8) } };
    const { rerender } = renderWithIntl(<CaroBoard {...boardProps(state, { lastEntry })} />);

    await tap(userEvent.setup(), cellButton(10, 10));
    // Online, every update of the room rebuilds the state from its record.
    const rebuilt = JSON.parse(JSON.stringify(state)) as CaroState;
    rerender(<CaroBoard {...boardProps(rebuilt, { lastEntry: { move: { cell: at(8, 8) } } })} />);

    expect(selectedCells()).toHaveLength(1);
    expect(selectedCells()[0]).toContainElement(cellButton(10, 10));
  });

  it("tells which cells a tap can select on small cells, and which one is selected", async () => {
    cellsMeasure(17);
    renderWithIntl(<CaroBoard {...boardProps(played(at(8, 8)))} />);

    const gridCellOf = (row: number, col: number) =>
      cellButton(row, col).closest('[role="gridcell"]');
    expect(gridCellOf(10, 10)).toHaveAttribute("aria-selected", "false");
    // A cell holding a stone cannot be selected.
    expect(gridCellOf(8, 8)).not.toHaveAttribute("aria-selected");

    await tap(userEvent.setup(), cellButton(10, 10));

    expect(gridCellOf(10, 10)).toHaveAttribute("aria-selected", "true");
  });

  it("leaves selection out of the grid when cells are large enough", () => {
    cellsMeasure(30);
    renderWithIntl(<CaroBoard {...boardProps(EMPTY)} />);

    expect(cellButton(10, 10).closest('[role="gridcell"]')).not.toHaveAttribute("aria-selected");
  });

  it("does not bring a dropped selection back once the board is unlocked", async () => {
    cellsMeasure(17);
    const state = played(at(8, 8));
    const { rerender } = renderWithIntl(<CaroBoard {...boardProps(state)} />);

    await tap(userEvent.setup(), cellButton(10, 10));
    rerender(<CaroBoard {...boardProps(state, { disabled: true })} />);
    rerender(<CaroBoard {...boardProps(state)} />);

    expect(selectedCells()).toHaveLength(0);
  });

  it("places at once with a mouse, even on small cells", async () => {
    cellsMeasure(17);
    const onMove = vi.fn();
    renderWithIntl(<CaroBoard {...boardProps(EMPTY, { onMove })} />);

    await userEvent.click(cellButton(10, 10));

    expect(onMove).toHaveBeenCalledWith({ cell: at(10, 10) });
  });

  it("places at once with a tap on cells of 24 px or more", async () => {
    cellsMeasure(30);
    const onMove = vi.fn();
    renderWithIntl(<CaroBoard {...boardProps(EMPTY, { onMove })} />);
    const user = userEvent.setup();

    await tap(user, cellButton(10, 10));

    expect(onMove).toHaveBeenCalledWith({ cell: at(10, 10) });
    expect(selectedCells()).toHaveLength(0);
  });
});
