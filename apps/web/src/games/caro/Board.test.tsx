import { caro, type CaroMove, type CaroState } from "@board-games/games/caro";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { observeWidthAs } from "@/test/fake-resize-observer";
import { renderWithIntl } from "@/test/render-with-intl";

import { type BoardProps, defaultBoardLayout } from "../types";
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
    layout: defaultBoardLayout,
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

describe("CaroBoard's notebook look", () => {
  it("marks the last move by a dashed circle in its cell, apart from the focus ring outside", () => {
    const state = played(at(8, 8));
    renderWithIntl(
      <CaroBoard {...boardProps(state, { lastEntry: { move: { cell: at(8, 8) } } })} />,
    );

    const last = cellButton(8, 8);
    expect(last.querySelector("circle")).toHaveClass("stroke-game-last-move");
    expect(last.querySelector("circle")).toHaveAttribute("stroke-dasharray");
    expect(last).toHaveClass("focus-ring");
    expect(last.className).not.toMatch(/border/);
  });

  it("draws X and O in the two pens' colours", () => {
    renderWithIntl(<CaroBoard {...boardProps(played(at(8, 8), at(8, 9)))} />);

    expect(cellButton(8, 8).querySelector("path")).toHaveClass("stroke-game-mark-1");
    expect(cellButton(8, 9).querySelector("path")).toHaveClass("stroke-game-mark-2");
  });

  it("strikes the winning line in the winner's pen and circles it", () => {
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
    const { container } = renderWithIntl(<CaroBoard {...boardProps(state)} />);

    const line = container.querySelector("[data-winning-line]");
    expect(line?.querySelector("line")).toHaveClass("stroke-game-mark-1");
    expect(line?.querySelector("ellipse")).toHaveClass("stroke-game-win");
    expect(container.querySelectorAll("[data-winning]")).toHaveLength(5);
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
    // The stone it would get: in the full colour of X's pen, dashed (not a faded one).
    const preview = cellButton(10, 10).querySelector("path");
    expect(preview).toHaveClass("stroke-game-mark-1");
    expect(preview).toHaveAttribute("stroke-dasharray");
    expect(preview?.closest("svg")).not.toHaveClass("opacity-40");
    // On the hint colour, inset so the grid lines around the cell stay on the paper.
    expect(cellButton(10, 10).querySelector("span.bg-game-highlight")).toHaveClass("inset-[3px]");

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

// --- The board that grows (change `add-caro-infinite-board`) ---------------------------------------

const CAP = 61;
const GROWING: CaroState = caro.setup({
  playerCount: 2,
  options: { size: "infinite", rule: "blocked-ends" },
});
/** A cell of the board that grows, by its row and column on the 61×61 cap, counted from 1. */
const on61 = (row: number, col: number) => (row - 1) * CAP + (col - 1);

function playedOn61(...cells: readonly number[]): CaroState {
  return cells.reduce((state, cell) => caro.applyMove(state, { cell }), GROWING);
}

/** A growing board whose parent applies each move and re-renders, like the play screen does. */
function PlayableGrowingBoard({ onMove }: { onMove?: (move: CaroMove) => void }) {
  const [state, setState] = useState(GROWING);
  const [last, setLast] = useState<CaroMove | null>(null);
  return (
    <CaroBoard
      {...boardProps(state, {
        onMove: (move) => {
          onMove?.(move);
          setState(caro.applyMove(state, move));
          setLast(move);
        },
        lastEntry: last === null ? null : { move: last },
      })}
    />
  );
}

describe("CaroBoard on the board that grows", () => {
  it("shows the 15×15 area it starts with, its cells named by the 61×61 cap", () => {
    renderWithIntl(<CaroBoard {...boardProps(GROWING)} />);

    expect(screen.getAllByRole("row")).toHaveLength(15);
    expect(screen.getAllByRole("gridcell")).toHaveLength(225);
    expect(cellButton(24, 24)).toHaveAccessibleName("Hàng 24, cột 24, trống");
    expect(cellButton(38, 38)).toHaveAccessibleName("Hàng 38, cột 38, trống");
    expect(screen.queryByRole("button", { name: /^Hàng 23, cột 24,/ })).not.toBeInTheDocument();
  });

  it("grows with a stone near its edge, keeping every cell's name", async () => {
    const onMove = vi.fn();
    renderWithIntl(<PlayableGrowingBoard onMove={onMove} />);

    await userEvent.click(cellButton(24, 31));

    expect(onMove).toHaveBeenCalledWith({ cell: on61(24, 31) });
    // Rows 19 to 38, columns 24 to 38.
    expect(screen.getAllByRole("row")).toHaveLength(20);
    expect(screen.getAllByRole("gridcell")).toHaveLength(20 * 15);
    expect(cellButton(24, 31)).toHaveAccessibleName("Hàng 24, cột 31, X");
    expect(cellButton(19, 24)).toHaveAccessibleName("Hàng 19, cột 24, trống");
  });

  it("enters on the middle cell with Tab, and stops arrows at the edge of the area", async () => {
    const user = keyboardUser();
    renderWithIntl(<CaroBoard {...boardProps(GROWING)} />);

    await user.tab();
    expectFocusOn(31, 31);
    expect(document.activeElement).toHaveAccessibleName("Hàng 31, cột 31, trống");

    for (let step = 0; step < 9; step += 1) await user.keyboard("{ArrowUp}");
    expectFocusOn(24, 31);
    await user.keyboard("{Home}");
    expectFocusOn(24, 24);
    await user.keyboard("{End}");
    expectFocusOn(24, 38);
  });

  it("zooms in and out within its levels, saying why a button cannot be pressed", async () => {
    renderWithIntl(<CaroBoard {...boardProps(GROWING)} />);
    const view = screen.getByRole("group", { name: "Xem bàn" });
    const zoomOut = screen.getByRole("button", { name: "Thu nhỏ bàn" });
    const zoomIn = screen.getByRole("button", { name: "Phóng to bàn" });

    expect(view).toContainElement(zoomOut);
    expect(zoomOut).toHaveAttribute("aria-disabled", "false");
    await userEvent.click(zoomOut);
    await userEvent.click(zoomOut);
    expect(zoomOut).toHaveAttribute("aria-disabled", "true");
    expect(zoomOut).toHaveAccessibleDescription("Đã nhỏ nhất");
    // One more press does nothing: three presses in reach the most zoomed in.
    await userEvent.click(zoomOut);
    await userEvent.click(zoomIn);
    await userEvent.click(zoomIn);
    expect(zoomIn).toHaveAttribute("aria-disabled", "false");
    await userEvent.click(zoomIn);
    expect(zoomIn).toHaveAttribute("aria-disabled", "true");
    expect(zoomIn).toHaveAccessibleDescription("Đã lớn nhất");
    expect(zoomOut).toHaveAttribute("aria-disabled", "false");
  });

  it("offers to go to the last move once there is one", () => {
    const { rerender } = renderWithIntl(<CaroBoard {...boardProps(GROWING)} />);
    const toLast = () => screen.getByRole("button", { name: "Về nước vừa đi" });

    expect(toLast()).toHaveAttribute("aria-disabled", "true");
    expect(toLast()).toHaveAccessibleDescription("Chưa có nước nào");

    const state = playedOn61(on61(31, 31));
    rerender(<CaroBoard {...boardProps(state, { lastEntry: { move: { cell: on61(31, 31) } } })} />);
    expect(toLast()).toHaveAttribute("aria-disabled", "false");
    expect(toLast()).not.toHaveAccessibleDescription();
  });

  it("places nothing when the mouse drags the board, and places on a plain click", async () => {
    const onMove = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<CaroBoard {...boardProps(GROWING, { onMove })} />);
    const cell = cellButton(31, 31);

    await user.pointer([
      { keys: "[MouseLeft>]", target: cell, coords: { clientX: 100, clientY: 100 } },
      { target: cell, coords: { clientX: 130, clientY: 110 } },
      { keys: "[/MouseLeft]", target: cell, coords: { clientX: 130, clientY: 110 } },
    ]);
    expect(onMove).not.toHaveBeenCalled();

    await user.click(cell);
    expect(onMove).toHaveBeenCalledWith({ cell: on61(31, 31) });
  });

  it("asks for a second tap when its cells are smaller than a finger", async () => {
    // 20 px cells at the 15 columns the frame starts with.
    observeWidthAs(20 * 15);
    const onMove = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<CaroBoard {...boardProps(GROWING, { onMove })} />);

    await tap(user, cellButton(31, 31));
    expect(onMove).not.toHaveBeenCalled();
    expect(selectedCells()).toHaveLength(1);
    await tap(user, cellButton(31, 31));
    expect(onMove).toHaveBeenCalledWith({ cell: on61(31, 31) });
  });

  it("draws no zoom buttons on a board of fixed size", () => {
    renderWithIntl(<CaroBoard {...boardProps(EMPTY)} />);

    expect(screen.queryByRole("group", { name: "Xem bàn" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Về nước vừa đi" })).not.toBeInTheDocument();
  });
});
