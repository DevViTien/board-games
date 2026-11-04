import type { PlayerIndex } from "@board-games/engine";
import { chess, type ChessMove, type ChessState } from "@board-games/games/chess";
import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubReducedMotion } from "@/test/fake-transport";
import { renderWithIntl } from "@/test/render-with-intl";

import { type BoardLayout, type BoardProps, defaultBoardLayout } from "../types";
import { ChessBoard } from "./Board";
import { CLAIM, fromFen, played, uci } from "./test-helpers";

const START = played();

function boardProps(
  state: ChessState,
  overrides: Partial<BoardProps<ChessState, ChessMove>> = {},
): BoardProps<ChessState, ChessMove> {
  return {
    state,
    legalMoves: chess.legalMoves(state),
    onMove: vi.fn(),
    disabled: false,
    result: chess.result(state),
    lastEntry: null,
    viewer: null,
    layout: defaultBoardLayout,
    ...overrides,
  };
}

/** A board whose parent applies each move and re-renders, like the play screen does. */
function PlayableBoard({
  initial = START,
  onMove,
  viewer = null,
}: {
  initial?: ChessState;
  onMove?: (move: ChessMove) => void;
  viewer?: PlayerIndex | null;
}) {
  const [history, setHistory] = useState<{ state: ChessState; last: ChessMove | null }[]>([
    { state: initial, last: null },
  ]);
  const current = history.at(-1) ?? { state: initial, last: null };
  return (
    <>
      <ChessBoard
        {...boardProps(current.state, {
          viewer,
          lastEntry: current.last === null ? null : { move: current.last },
          onMove: (move) => {
            onMove?.(move);
            setHistory([...history, { state: chess.applyMove(current.state, move), last: move }]);
          },
        })}
      />
      <button
        type="button"
        onClick={() => {
          setHistory(history.slice(0, -1));
        }}
      >
        Hoàn tác
      </button>
    </>
  );
}

const square = (name: string | RegExp) => screen.getByRole("button", { name });
/** The button of a square by its coordinates, whatever stands on it. */
const at = (name: string) => {
  const found = document.querySelector<HTMLElement>(`[data-square="${name}"]`);
  if (found === null) throw new Error(`No square ${name}`);
  return found;
};
const cellOf = (name: string) => at(name).closest("[role='gridcell']");
const selectedCells = () => screen.queryAllByRole("gridcell", { selected: true });
/** The squares described as reachable, in the order they are shown. */
const described = (words: string) =>
  [...document.querySelectorAll<HTMLElement>("[data-square]")]
    .filter((button) => button.matches(`[aria-describedby]`) && hasDescription(button, words))
    .map((button) => button.dataset.square)
    .sort();
function hasDescription(button: HTMLElement, words: string): boolean {
  return (button.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .some((id) => document.getElementById(id)?.textContent === words);
}
const hint = () => document.querySelector("[aria-live='polite']");
/** Keys are typed at once: the board's handlers are what is tested, not typing speed. */
const keyboardUser = () => userEvent.setup({ delay: null });
/** The squares of the rows on screen, top row first: names of their pieces' squares. */
const shownSquares = () =>
  screen.getAllByRole("row").map((row) =>
    within(row)
      .getAllByRole("button")
      .map((button) => button.dataset.square),
  );

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ChessBoard: what it shows", () => {
  it("Thế mở đầu trên thiết bị dùng chung: a1 at the bottom left, every square named", () => {
    renderWithIntl(<ChessBoard {...boardProps(START)} />);

    expect(screen.getByRole("grid", { name: "Bàn cờ" })).toBeInTheDocument();
    const rows = shownSquares();
    expect(rows).toHaveLength(8);
    expect(rows[7]?.[0]).toBe("a1");
    expect(rows[0]?.[7]).toBe("h8");
    expect(at("a1")).toHaveAccessibleName("Xe trắng ở a1");
    expect(at("e4")).toHaveAccessibleName("Ô e4 trống");
    expect(at("g8")).toHaveAccessibleName("Mã đen ở g8");
  });

  it("Cầm Đen khi chơi online: h8 at the bottom left, Black's pieces on the two bottom rows", () => {
    renderWithIntl(<ChessBoard {...boardProps(START, { viewer: 1, disabled: true })} />);

    const rows = shownSquares();
    expect(rows[7]?.[0]).toBe("h8");
    const names = (row: number) =>
      within(screen.getAllByRole("row")[row] ?? document.body)
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label"));
    for (const row of [6, 7]) for (const name of names(row)) expect(name).toMatch(/ đen ở /);
  });

  it("Toạ độ theo hướng bàn: files h to a along the bottom, ranks 1 to 8 down the left", () => {
    renderWithIntl(<ChessBoard {...boardProps(START, { viewer: 1, disabled: true })} />);

    const rows = screen.getAllByRole("row");
    const bottom = within(rows[7] ?? document.body).getAllByRole("button");
    expect(
      bottom.map(
        (button) => button.parentElement?.querySelector("[data-coordinate='file']")?.textContent,
      ),
    ).toEqual(["h", "g", "f", "e", "d", "c", "b", "a"]);
    const leftRanks = rows.map(
      (row) =>
        within(row).getAllByRole("gridcell")[0]?.querySelector("[data-coordinate='rank']")
          ?.textContent,
    );
    expect(leftRanks).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    expect(document.querySelectorAll("[data-coordinate]")).toHaveLength(16);
  });

  it("draws each piece with the staunty file of its side and type, hidden as an image", () => {
    renderWithIntl(<ChessBoard {...boardProps(START)} />);

    const image = (name: string) => at(name).querySelector("img");
    expect(image("g1")).toHaveAttribute("src", "/pieces/staunty/wN.svg");
    expect(image("e8")).toHaveAttribute("src", "/pieces/staunty/bK.svg");
    expect(image("e8")).toHaveAttribute("alt", "");
    expect(image("e4")).toBeNull();
  });

  it("names the seats above and below the board, swapped when flipped", async () => {
    const orders: (readonly PlayerIndex[] | undefined)[] = [];
    const layout: BoardLayout = ({ board, controls, seatOrder }) => {
      orders.push(seatOrder);
      return (
        <>
          {board}
          {controls}
        </>
      ) as ReactNode;
    };
    renderWithIntl(<ChessBoard {...boardProps(START, { layout })} />);

    expect(orders.at(-1)).toEqual([1, 0]);
    await userEvent.click(screen.getByRole("button", { name: "Lật bàn" }));
    expect(orders.at(-1)).toEqual([0, 1]);
  });
});

describe("ChessBoard: choosing and playing a piece", () => {
  it("Chọn quân hiện nước đi: the knight's square is selected, its targets marked and told", async () => {
    renderWithIntl(<ChessBoard {...boardProps(START)} />);

    await userEvent.click(square("Mã trắng ở g1"));

    expect(selectedCells()).toEqual([cellOf("g1")]);
    expect(cellOf("f3")).toHaveAttribute("aria-selected", "false");
    expect(described("Đi tới được")).toEqual(["f3", "h3"]);
    expect(hint()).toHaveTextContent("Đã chọn Mã g1: đi được f3, h3");
  });

  it("Quân không có nước đi: nothing is selected and the rook is told to have no move", async () => {
    renderWithIntl(<ChessBoard {...boardProps(START)} />);

    await userEvent.click(square("Xe trắng ở a1"));

    expect(selectedCells()).toEqual([]);
    expect(hint()).toHaveTextContent("Xe a1 không có nước đi");
  });

  it("Đi quân: the knight goes to f3 and nothing stays selected", async () => {
    const onMove = vi.fn();
    renderWithIntl(<PlayableBoard onMove={onMove} />);

    await userEvent.click(square("Mã trắng ở g1"));
    await userEvent.click(square("Ô f3 trống"));

    expect(onMove).toHaveBeenCalledExactlyOnceWith({ from: "g1", to: "f3" });
    expect(at("f3")).toHaveAccessibleName("Mã trắng ở f3");
    expect(at("g1")).toHaveAccessibleName("Ô g1 trống");
    expect(selectedCells()).toEqual([]);
    expect(described("Đi tới được")).toEqual([]);
    expect(hint()).toHaveTextContent(/^$/);
  });

  it("Ô ăn được quân: d5 is a capture, marked unlike e5", async () => {
    renderWithIntl(<ChessBoard {...boardProps(played("e2e4", "d7d5"))} />);

    await userEvent.click(square("Tốt trắng ở e4"));

    expect(described("Ăn được quân")).toEqual(["d5"]);
    expect(described("Đi tới được")).toEqual(["e5"]);
    expect(at("d5").querySelector("[data-mark='capture']")).not.toBeNull();
    expect(at("e5").querySelector("[data-mark='target']")).not.toBeNull();
    expect(hint()).toHaveTextContent("Đã chọn Tốt e4: đi được e5, ăn d5");
  });

  it("Bắt tốt qua đường là ăn quân: the empty d6 is a capture, e6 a quiet move", async () => {
    renderWithIntl(<ChessBoard {...boardProps(played("e2e4", "a7a6", "e4e5", "d7d5"))} />);

    await userEvent.click(square("Tốt trắng ở e5"));

    expect(described("Ăn được quân")).toEqual(["d6"]);
    expect(described("Đi tới được")).toEqual(["e6"]);
    expect(at("d6").querySelector("[data-mark='capture']")).not.toBeNull();
    expect(at("e6").querySelector("[data-mark='target']")).not.toBeNull();
  });

  it("Đổi quân rồi bỏ chọn: another knight takes the selection, Escape drops it", async () => {
    const user = keyboardUser();
    renderWithIntl(<ChessBoard {...boardProps(START)} />);

    await user.click(square("Mã trắng ở g1"));
    await user.click(square("Mã trắng ở b1"));
    expect(selectedCells()).toEqual([cellOf("b1")]);
    expect(described("Đi tới được")).toEqual(["a3", "c3"]);

    await user.keyboard("{Escape}");
    expect(selectedCells()).toEqual([]);
    expect(described("Đi tới được")).toEqual([]);
    expect(document.activeElement).toBe(at("b1"));
  });

  it("Quân đối phương không chọn được: a Black pawn on White's turn selects nothing", async () => {
    const onMove = vi.fn();
    renderWithIntl(<ChessBoard {...boardProps(START, { onMove })} />);

    await userEvent.click(square("Tốt đen ở e7"));

    expect(selectedCells()).toEqual([]);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("selects nothing on a locked board", async () => {
    renderWithIntl(<ChessBoard {...boardProps(START, { disabled: true })} />);

    await userEvent.click(square("Mã trắng ở g1"));

    expect(selectedCells()).toEqual([]);
    expect(at("g1")).toHaveAttribute("aria-disabled", "true");
  });

  it("keeps the selection's words in one live region, the score sheet out of it", () => {
    renderWithIntl(<ChessBoard {...boardProps(START)} />);

    expect(document.querySelectorAll("[aria-live='polite']")).toHaveLength(2);
    expect(screen.getByRole("region", { name: "Sổ ghi" }).closest("[aria-live]")).toBeNull();
  });
});

describe("ChessBoard: keeping the selection", () => {
  it("keeps the selection when the same position comes again as a new object (a room update)", async () => {
    const { rerender } = renderWithIntl(<ChessBoard {...boardProps(START)} />);
    await userEvent.click(square("Mã trắng ở g1"));

    const again = played();
    rerender(<ChessBoard {...boardProps(again, { legalMoves: chess.legalMoves(again) })} />);

    expect(selectedCells()).toEqual([cellOf("g1")]);
    expect(described("Đi tới được")).toEqual(["f3", "h3"]);
  });

  it("drops the selection when the board locks, and when the position changes", async () => {
    const { rerender } = renderWithIntl(<ChessBoard {...boardProps(START)} />);
    await userEvent.click(square("Mã trắng ở g1"));

    rerender(<ChessBoard {...boardProps(START, { disabled: true })} />);
    expect(selectedCells()).toEqual([]);

    rerender(<ChessBoard {...boardProps(START)} />);
    await userEvent.click(square("Mã trắng ở g1"));
    rerender(<ChessBoard {...boardProps(played("g1f3", "g8f6", "f3g1", "f6g8"))} />);
    expect(selectedCells()).toEqual([]);
  });
});

describe("ChessBoard: the keyboard", () => {
  it("Vào bàn bằng Tab: on the White king when no move has been played", async () => {
    const user = keyboardUser();
    renderWithIntl(<ChessBoard {...boardProps(START)} />);

    await user.tab();

    expect(document.activeElement).toHaveAccessibleName("Vua trắng ở e1");
  });

  it("enters on the square the last move went to", async () => {
    const user = keyboardUser();
    const state = played("e2e4");
    renderWithIntl(<ChessBoard {...boardProps(state, { lastEntry: { move: uci("e2e4") } })} />);

    await user.tab();

    expect(document.activeElement).toBe(at("e4"));
  });

  it("Đi Mã bằng phím: Enter, up twice, left once, Enter plays Nf3 and keeps the focus on f3", async () => {
    const user = keyboardUser();
    const onMove = vi.fn();
    renderWithIntl(<PlayableBoard onMove={onMove} />);
    await user.tab();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(document.activeElement).toBe(at("g1"));

    await user.keyboard("{Enter}{ArrowUp}{ArrowUp}{ArrowLeft}{Enter}");

    expect(onMove).toHaveBeenCalledExactlyOnceWith({ from: "g1", to: "f3" });
    expect(document.activeElement).toBe(at("f3"));
    expect(at("f3")).toHaveAccessibleName("Mã trắng ở f3");
  });

  it("Mũi tên theo hướng bàn đang lật: up from e8 goes to e7 with Black at the bottom", async () => {
    const user = keyboardUser();
    renderWithIntl(<ChessBoard {...boardProps(START, { viewer: 1, disabled: true })} />);
    await user.tab();
    expect(document.activeElement).toBe(at("e8"));

    await user.keyboard("{ArrowUp}");

    expect(document.activeElement).toBe(at("e7"));
  });

  it("stops at the edges, and goes to either end of the row with Home and End", async () => {
    const user = keyboardUser();
    renderWithIntl(<ChessBoard {...boardProps(START)} />);
    await user.tab();

    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(at("e1"));
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(at("a1"));
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(at("a1"));
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(at("h1"));
  });

  it("ignores a key held down", () => {
    renderWithIntl(<ChessBoard {...boardProps(START)} />);
    at("e1").focus();

    fireEvent.keyDown(at("e1"), { key: "ArrowRight", repeat: true });

    expect(document.activeElement).toBe(at("e1"));
  });

  it("Tab rời bàn: the next Tab leaves the board for the next control", async () => {
    const user = keyboardUser();
    renderWithIntl(<ChessBoard {...boardProps(START)} />);
    await user.tab();
    await user.keyboard("{ArrowUp}");

    await user.tab();

    expect(document.activeElement?.closest("[role='grid']")).toBeNull();
  });

  it("tells the focused square from the selected one", async () => {
    const user = keyboardUser();
    renderWithIntl(<ChessBoard {...boardProps(START)} />);
    await user.tab();
    await user.keyboard("{ArrowRight}{ArrowRight}{Enter}{ArrowLeft}");

    // The selection is a frame inside the square; the focus is the shared ring outside it.
    expect(at("g1").querySelector("[data-mark='selected']")).not.toBeNull();
    expect(at("f1").querySelector("[data-mark='selected']")).toBeNull();
    expect(at("f1")).toHaveClass("focus-ring");
    expect(document.activeElement).toBe(at("f1"));
  });
});

describe("ChessBoard: promotion", () => {
  // White pawn on e7, nothing on e8.
  const PROMOTE = fromFen("8/4P3/8/8/8/8/k7/4K3 w - - 0 1");

  it("Hậu có tiêu điểm trước: the picker names the move and focuses the queen", async () => {
    const onMove = vi.fn();
    renderWithIntl(<PlayableBoard initial={PROMOTE} onMove={onMove} />);

    await userEvent.click(square("Tốt trắng ở e7"));
    await userEvent.click(square("Ô e8 trống"));

    const dialog = screen.getByRole("dialog", { name: "Tốt e7 → e8" });
    expect(
      within(dialog)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Hậu", "Xe", "Tượng", "Mã", "Huỷ"]);
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Hậu" }));
    expect(onMove).not.toHaveBeenCalled();
  });

  it("Phong thành Mã: choosing the knight plays that promotion", async () => {
    const onMove = vi.fn();
    renderWithIntl(<PlayableBoard initial={PROMOTE} onMove={onMove} />);

    await userEvent.click(square("Tốt trắng ở e7"));
    await userEvent.click(square("Ô e8 trống"));
    await userEvent.click(screen.getByRole("button", { name: "Mã" }));

    expect(onMove).toHaveBeenCalledExactlyOnceWith({ from: "e7", to: "e8", promotion: "n" });
    expect(at("e8")).toHaveAccessibleName("Mã trắng ở e8");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each([
    [
      "Escape",
      (dialog: HTMLElement) => fireEvent(dialog, new Event("cancel", { cancelable: true })),
    ],
    ["a close without cancel", (dialog: HTMLElement) => fireEvent(dialog, new Event("close"))],
  ])("Huỷ phong cấp (%s): no move, the pawn stays selected, focus on e8", async (_how, close) => {
    const onMove = vi.fn();
    renderWithIntl(<PlayableBoard initial={PROMOTE} onMove={onMove} />);
    await userEvent.click(square("Tốt trắng ở e7"));
    await userEvent.click(square("Ô e8 trống"));

    close(screen.getByRole("dialog"));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onMove).not.toHaveBeenCalled();
    expect(selectedCells()).toEqual([cellOf("e7")]);
    expect(document.activeElement).toBe(at("e8"));
  });

  it("moves between the four pieces with the arrows", async () => {
    const user = keyboardUser();
    renderWithIntl(<PlayableBoard initial={PROMOTE} />);
    await user.click(square("Tốt trắng ở e7"));
    await user.click(square("Ô e8 trống"));
    const choice = (name: string) => screen.getByRole("button", { name });

    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(choice("Xe"));
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(document.activeElement).toBe(choice("Mã"));
  });

  it("cancels with its own Cancel button too", async () => {
    renderWithIntl(<PlayableBoard initial={PROMOTE} />);
    await userEvent.click(square("Tốt trắng ở e7"));
    await userEvent.click(square("Ô e8 trống"));

    await userEvent.click(screen.getByRole("button", { name: "Huỷ" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(selectedCells()).toEqual([cellOf("e7")]);
    expect(document.activeElement).toBe(at("e8"));
  });

  it("shows Black's promotion pieces in Black's look", async () => {
    renderWithIntl(<ChessBoard {...boardProps(fromFen("4k3/8/8/8/8/8/6p1/K7 b - - 0 1"))} />);

    await userEvent.click(square("Tốt đen ở g2"));
    await userEvent.click(square("Ô g1 trống"));

    const dialog = screen.getByRole("dialog", { name: "Tốt g2 → g1" });
    const queen = within(dialog).getByRole("button", { name: "Hậu" }).querySelector("img");
    expect(queen).toHaveAttribute("src", "/pieces/staunty/bQ.svg");
  });

  it("closes as a cancel when the board locks, without sending a move", async () => {
    const onMove = vi.fn();
    const { rerender } = renderWithIntl(<ChessBoard {...boardProps(PROMOTE, { onMove })} />);
    await userEvent.click(square("Tốt trắng ở e7"));
    await userEvent.click(square("Ô e8 trống"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    rerender(<ChessBoard {...boardProps(PROMOTE, { onMove, disabled: true })} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(selectedCells()).toEqual([]);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("keeps the picker open when the same position comes again (a room update)", async () => {
    const { rerender } = renderWithIntl(<ChessBoard {...boardProps(PROMOTE)} />);
    await userEvent.click(square("Tốt trắng ở e7"));
    await userEvent.click(square("Ô e8 trống"));

    rerender(<ChessBoard {...boardProps(fromFen(PROMOTE.fen))} />);

    expect(screen.getByRole("dialog", { name: "Tốt e7 → e8" })).toBeInTheDocument();
  });

  it("closes when its move is no longer legal", async () => {
    const { rerender } = renderWithIntl(<ChessBoard {...boardProps(PROMOTE)} />);
    await userEvent.click(square("Tốt trắng ở e7"));
    await userEvent.click(square("Ô e8 trống"));

    rerender(<ChessBoard {...boardProps(PROMOTE, { legalMoves: [uci("e1d1")] })} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("ChessBoard: flipping", () => {
  it("Lật bàn trên thiết bị dùng chung: Black at the bottom, the button pressed, the game unchanged", async () => {
    const onMove = vi.fn();
    renderWithIntl(<ChessBoard {...boardProps(START, { onMove })} />);
    const flip = screen.getByRole("button", { name: "Lật bàn" });
    expect(flip).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(flip);

    expect(shownSquares()[7]?.[0]).toBe("h8");
    expect(flip).toHaveAttribute("aria-pressed", "true");
    expect(onMove).not.toHaveBeenCalled();
  });

  it("is its icon alone beside the score sheet on a phone, still named Lật bàn, 44 px", () => {
    renderWithIntl(<ChessBoard {...boardProps(START)} />);

    const flip = screen.getByRole("button", { name: "Lật bàn" });
    expect(flip).toHaveClass("max-lg:size-11");
    expect(flip.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Lật bàn")).toHaveClass("max-lg:sr-only");
    // In the same row as the sheet.
    expect(flip.parentElement).toContainElement(screen.getByRole("region", { name: "Sổ ghi" }));
  });

  it("Không tự lật sau nước đi: White stays at the bottom after White's move", async () => {
    renderWithIntl(<PlayableBoard />);

    await userEvent.click(square("Tốt trắng ở e2"));
    await userEvent.click(square("Ô e4 trống"));

    expect(shownSquares()[7]?.[0]).toBe("a1");
  });

  it("Chơi lại đưa bàn về hướng mặc định: a new side for the viewer unflips the board", async () => {
    const { rerender } = renderWithIntl(<ChessBoard {...boardProps(START, { viewer: 0 })} />);
    await userEvent.click(screen.getByRole("button", { name: "Lật bàn" }));
    expect(shownSquares()[7]?.[0]).toBe("h8");

    rerender(<ChessBoard {...boardProps(START, { viewer: 1, disabled: true })} />);

    expect(shownSquares()[7]?.[0]).toBe("h8");
    expect(screen.getByRole("button", { name: "Lật bàn" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

describe("ChessBoard: last move and check", () => {
  it("Đánh dấu nước vừa đi: e2 and e4 are marked and described as the last move", () => {
    renderWithIntl(
      <ChessBoard {...boardProps(played("e2e4"), { lastEntry: { move: uci("e2e4") } })} />,
    );

    expect(described("Nước vừa đi")).toEqual(["e2", "e4"]);
    expect(at("e2").querySelector("[data-mark='last']")).not.toBeNull();
    expect(at("e4").querySelector("[data-mark='last']")).not.toBeNull();
  });

  // 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+
  const CHECK = played(
    "e2e4",
    "e7e5",
    "g1f3",
    "b8c6",
    "f1c4",
    "f8c5",
    "c2c3",
    "g8f6",
    "d2d4",
    "e5d4",
    "c3d4",
    "c5b4",
  );

  it("Vua bị chiếu: e1 is described as in check, with words beside the board", () => {
    renderWithIntl(<ChessBoard {...boardProps(CHECK)} />);

    expect(described("Đang bị chiếu")).toEqual(["e1"]);
    expect(screen.getByText("Chiếu!").parentElement).toHaveTextContent(
      "Chiếu! Trắng đang bị chiếu",
    );
  });

  it("reads the check out on a shared device only", () => {
    const { rerender } = renderWithIntl(<ChessBoard {...boardProps(CHECK)} />);
    expect(screen.getByText("Chiếu!").parentElement).toHaveAttribute("aria-live", "polite");

    rerender(<ChessBoard {...boardProps(CHECK, { viewer: 0 })} />);
    expect(screen.getByText("Chiếu!").parentElement).toHaveAttribute("aria-live", "off");
  });

  it("says nothing of check without one", () => {
    renderWithIntl(<ChessBoard {...boardProps(START)} />);

    expect(screen.queryByText("Chiếu!")).not.toBeInTheDocument();
    expect(described("Đang bị chiếu")).toEqual([]);
  });
});

describe("ChessBoard: claiming a draw", () => {
  // The start position for the third time.
  const THREEFOLD = played("g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6", "f3g1", "f6g8");

  it("Đòi hoà khi lặp lại ba lần: the button says why and sends the claim", async () => {
    const onMove = vi.fn();
    renderWithIntl(<ChessBoard {...boardProps(THREEFOLD, { onMove })} />);

    const button = screen.getByRole("button", { name: "Đòi hoà" });
    expect(button).toHaveAccessibleDescription("Thế cờ này đã lặp lại ba lần");
    await userEvent.click(button);

    expect(onMove).toHaveBeenCalledExactlyOnceWith(CLAIM);
  });

  it("says the fifty-move rule when that is the reason", () => {
    renderWithIntl(<ChessBoard {...boardProps(fromFen("4k3/8/8/8/8/8/8/R3K3 w - - 100 80"))} />);

    expect(screen.getByRole("button", { name: "Đòi hoà" })).toHaveAccessibleDescription(
      "50 nước liền không đi Tốt, không ăn quân",
    );
  });

  it("Không có quyền đòi hoà: no button in a new game", () => {
    renderWithIntl(<ChessBoard {...boardProps(START)} />);

    expect(screen.queryByRole("button", { name: "Đòi hoà" })).not.toBeInTheDocument();
  });

  it("has no button while the board is locked (the opponent's turn online)", () => {
    renderWithIntl(<ChessBoard {...boardProps(THREEFOLD, { disabled: true, viewer: 1 })} />);

    expect(screen.queryByRole("button", { name: "Đòi hoà" })).not.toBeInTheDocument();
  });
});

describe("ChessBoard: sliding pieces", () => {
  function stubAnimate() {
    const animate = vi.fn();
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      writable: true,
      value: animate,
    });
    return animate;
  }

  afterEach(() => {
    Reflect.deleteProperty(Element.prototype, "animate");
  });

  it("slides the piece of a new move once", async () => {
    const animate = stubAnimate();
    renderWithIntl(<PlayableBoard />);

    await userEvent.click(square("Mã trắng ở g1"));
    await userEvent.click(square("Ô f3 trống"));

    expect(animate).toHaveBeenCalledOnce();
    expect(animate.mock.contexts[0]).toBe(at("f3").querySelector("[data-piece]"));
  });

  it("slides the king and the rook when castling", async () => {
    const animate = stubAnimate();
    renderWithIntl(
      <PlayableBoard initial={played("e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5")} />,
    );

    await userEvent.click(square("Vua trắng ở e1"));
    await userEvent.click(square("Ô g1 trống"));

    expect(animate).toHaveBeenCalledTimes(2);
    expect(animate.mock.contexts[1]).toBe(at("f1").querySelector("[data-piece]"));
  });

  it("slides nothing on undo nor on a board opened on a game in progress", async () => {
    const animate = stubAnimate();
    renderWithIntl(<PlayableBoard initial={played("e2e4", "e7e5")} />);
    expect(animate).not.toHaveBeenCalled();

    await userEvent.click(square("Mã trắng ở g1"));
    await userEvent.click(square("Ô f3 trống"));
    animate.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Hoàn tác" }));

    expect(at("g1")).toHaveAccessibleName("Mã trắng ở g1");
    expect(animate).not.toHaveBeenCalled();
  });

  it("Giảm chuyển động: the knight shows on f3 at once, without moving", async () => {
    stubReducedMotion(true);
    const animate = stubAnimate();
    renderWithIntl(<PlayableBoard />);

    await userEvent.click(square("Mã trắng ở g1"));
    await userEvent.click(square("Ô f3 trống"));

    expect(at("f3")).toHaveAccessibleName("Mã trắng ở f3");
    expect(animate).not.toHaveBeenCalled();
  });
});
