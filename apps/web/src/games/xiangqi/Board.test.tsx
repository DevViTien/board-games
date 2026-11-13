import {
  pointOf,
  xiangqi,
  type XiangqiMove,
  type XiangqiState,
  xiangqiStateFromRows,
} from "@board-games/games/xiangqi";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { defaultBoardLayout } from "../types";
import { XiangqiBoard } from "./Board";
import {
  useDescribeNotation,
  useXiangqiMoveLabel,
  useXiangqiResultDetail,
  useXiangqiSeatSummary,
} from "./words";

const move = (fx: number, fy: number, tx: number, ty: number): XiangqiMove => ({
  from: pointOf(fx, fy),
  to: pointOf(tx, ty),
});

function play(moves: readonly XiangqiMove[], state: XiangqiState = xiangqi.setup()) {
  return moves.reduce((current, next) => xiangqi.applyMove(current, next), state);
}

/** "P2-5 M8.7 M2.3 X9-8": Đỏ's central cannon, Đen's horse up, Đỏ's horse up, Đen's chariot across. */
const OPENING = [move(7, 7, 4, 7), move(7, 0, 6, 2), move(7, 9, 6, 7), move(8, 0, 7, 0)];

function renderBoard(
  state: XiangqiState,
  { viewer = null as 0 | 1 | null, disabled = false } = {},
) {
  const onMove = vi.fn<(move: XiangqiMove) => void>();
  const view = renderWithIntl(
    <XiangqiBoard
      state={state}
      legalMoves={disabled ? [] : xiangqi.legalMoves(state)}
      onMove={onMove}
      disabled={disabled}
      result={xiangqi.result(state)}
      lastEntry={state.last === null ? null : { move: state.last }}
      viewer={viewer}
      layout={defaultBoardLayout}
    />,
  );
  return { onMove, view };
}

const point = (name: string) =>
  within(screen.getByRole("grid", { name: "Bàn cờ" })).getByRole("button", { name });

describe("Bàn Cờ tướng", () => {
  it("names every point by its piece, Đỏ's column and the row from Đỏ's side", () => {
    renderBoard(xiangqi.setup());

    expect(point("Pháo đỏ ở cột 2, hàng 3")).toBeInTheDocument();
    expect(point("Tướng đen ở cột 5, hàng 10")).toBeInTheDocument();
    expect(point("Điểm trống ở cột 5, hàng 5")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(10);
  });

  it("Cầm Đen khi chơi online: Đen's pieces on the two bottom rows", () => {
    const { view } = renderBoard(xiangqi.setup(), { viewer: 1 });

    const rows = within(screen.getByRole("grid")).getAllByRole("row");
    const bottom = rows.at(-1);
    expect(within(bottom ?? document.body).getAllByRole("button")[4]).toHaveAccessibleName(
      "Tướng đen ở cột 5, hàng 10",
    );
    expect(view.container.querySelector('[data-piece="k"]')).not.toBeNull();
  });
});

describe("Chọn quân và đi quân Cờ tướng", () => {
  it("Chọn Pháo: four points with dots, the soldier with corners, and the words", async () => {
    const { view } = renderBoard(play(OPENING));
    const user = userEvent.setup();

    await user.click(point("Pháo đỏ ở cột 5, hàng 3"));

    expect(view.container.querySelectorAll('[data-mark="target"]')).toHaveLength(4);
    expect(view.container.querySelectorAll('[data-mark="capture"]')).toHaveLength(1);
    expect(point("Tốt đen ở cột 5, hàng 7")).toHaveAccessibleDescription("Ăn được");
    expect(
      screen.getByText("Đã chọn Pháo đỏ ở cột 5, hàng 3: đi được 4 điểm, ăn được Tốt."),
    ).toBeInTheDocument();
  });

  it("plays a move with a press on the piece, then on the point", async () => {
    const { onMove } = renderBoard(xiangqi.setup());
    const user = userEvent.setup();

    await user.click(point("Pháo đỏ ở cột 2, hàng 3"));
    await user.click(point("Điểm trống ở cột 5, hàng 3"));

    expect(onMove).toHaveBeenCalledWith(move(7, 7, 4, 7));
  });

  it("drops the choice with Esc, and says a piece without a move cannot move", async () => {
    // Đỏ's soldier is stopped by its own chariot right ahead of it.
    renderBoard(
      xiangqiStateFromRows([
        "....k....",
        ".........",
        ".........",
        ".........",
        ".........",
        "R........",
        "P........",
        ".C.......",
        ".........",
        "...K.....",
      ]),
    );
    const user = userEvent.setup();

    await user.click(point("Pháo đỏ ở cột 8, hàng 3"));
    await user.keyboard("{Escape}");
    expect(screen.queryByText(/^Đã chọn/u)).not.toBeInTheDocument();
    await user.click(point("Tốt đỏ ở cột 9, hàng 4"));
    expect(screen.getByText("Tốt đỏ ở cột 9, hàng 4 không đi được.")).toBeInTheDocument();
  });

  it("chooses nothing on a locked board", async () => {
    const { onMove } = renderBoard(xiangqi.setup(), { disabled: true });
    const user = userEvent.setup();

    await user.click(point("Pháo đỏ ở cột 2, hàng 3"));
    await user.click(point("Điểm trống ở cột 5, hàng 3"));
    expect(onMove).not.toHaveBeenCalled();
  });
});

describe("Đi quân Cờ tướng bằng bàn phím", () => {
  it("Đi Pháo bằng bàn phím: one Tab stop, arrows, Enter twice", async () => {
    const { onMove } = renderBoard(xiangqi.setup());
    const user = userEvent.setup();

    await user.tab();
    expect(point("Tướng đỏ ở cột 5, hàng 1")).toHaveFocus();
    // From the general (row 1, column 5) to the cannon (row 3, column 2): up twice, right thrice.
    await user.keyboard("{ArrowUp}{ArrowUp}{ArrowRight}{ArrowRight}{ArrowRight}");
    expect(point("Pháo đỏ ở cột 2, hàng 3")).toHaveFocus();
    await user.keyboard("{Enter}{ArrowLeft}{ArrowLeft}{ArrowLeft}{Enter}");

    expect(onMove).toHaveBeenCalledWith(move(7, 7, 4, 7));
  });
});

describe("Nước vừa đi và chiếu trên bàn Cờ tướng", () => {
  it("Tướng bị chiếu: marks the general, and says Chiếu!", () => {
    const checked = xiangqi.applyMove(
      xiangqiStateFromRows([
        "....k....",
        ".........",
        ".........",
        ".........",
        ".........",
        ".........",
        ".........",
        "R........",
        ".........",
        "...K.....",
      ]),
      move(0, 7, 0, 0),
    );
    const { view } = renderBoard(checked);

    expect(view.container.querySelector('[data-mark="check"]')).not.toBeNull();
    expect(screen.getByText("Chiếu!")).toBeInTheDocument();
    expect(screen.getByText("Đen đang bị chiếu")).toBeInTheDocument();
    expect(view.container.querySelectorAll('[data-mark="last"]')).toHaveLength(2);
  });

  it("Chiếu bí: the mated general stays marked, without the Chiếu! line", () => {
    const mated = xiangqiStateFromRows(
      [
        "R...k....",
        "........R",
        ".........",
        ".........",
        ".........",
        ".........",
        ".........",
        ".........",
        ".........",
        "...K.....",
      ],
      1,
    );
    const { view } = renderBoard(mated, { disabled: true });

    expect(view.container.querySelector('[data-mark="check"]')).not.toBeNull();
    expect(point("Tướng đen ở cột 5, hàng 10")).toHaveAccessibleDescription(/bị chiếu/u);
    expect(screen.queryByText("Chiếu!")).not.toBeInTheDocument();
  });
});

describe("Lật bàn và sổ ghi", () => {
  it("Lật bàn: Đen below after a press, and back", async () => {
    renderBoard(xiangqi.setup());
    const user = userEvent.setup();
    const bottomFirst = () =>
      within(within(screen.getByRole("grid")).getAllByRole("row").at(-1) ?? document.body)
        .getAllByRole("button")[0]
        ?.getAttribute("aria-label");

    expect(bottomFirst()).toBe("Xe đỏ ở cột 9, hàng 1");
    await user.click(screen.getByRole("button", { name: "Lật bàn" }));
    expect(bottomFirst()).toBe("Xe đen ở cột 1, hàng 10");
  });

  it("Sổ sau bốn nước: numbered pairs, the newest marked, read out in words", () => {
    renderBoard(play(OPENING));

    const sheet = screen.getByRole("region", { name: "Sổ ghi" });
    expect(
      within(sheet)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "1.P2-5Pháo cột 2 bình sang cột 5M8.7Mã cột 8 tiến lên cột 7",
      "2.M2.3Mã cột 2 tiến lên cột 3X9-8Xe cột 9 bình sang cột 8",
    ]);
    expect(sheet.querySelector('[aria-current="true"]')).toHaveTextContent("X9-8");
  });
});

/** Renders what the game's words say of a state. */
function Words({ state }: { readonly state: XiangqiState }) {
  const label = useXiangqiMoveLabel();
  const detail = useXiangqiResultDetail();
  const summary = useXiangqiSeatSummary();
  const result = xiangqi.result(state);
  return (
    <ul>
      <li>{state.last === null ? "" : label(state.last, state)}</li>
      <li>{result === null ? "" : (detail(result, state) ?? "")}</li>
      <li>{summary(0, state)?.full ?? "level"}</li>
      <li>{summary(1, state)?.full ?? "level"}</li>
    </ul>
  );
}

function wordsOf(state: XiangqiState) {
  const view = renderWithIntl(<Words state={state} />);
  const lines = screen.getAllByRole("listitem").map((item) => item.textContent);
  view.unmount();
  return lines;
}

describe("words", () => {
  it("Hơn một Xe: Đỏ up 9 points after taking a chariot, Đen level", () => {
    // Đỏ's cannon takes the horse over its screen, then Đen's chariot is taken by a cannon too.
    const state = play([move(7, 7, 7, 0)]);
    expect(wordsOf(state).slice(2)).toEqual(["Hơn 4 điểm", "level"]);
  });

  it("reads the last move in words, with check", () => {
    expect(wordsOf(play([move(7, 7, 4, 7)]))[0]).toBe("đi Pháo cột 2 bình sang cột 5");
  });

  it("reads a mark with its column, and a place from the front", () => {
    function Notes() {
      const describe = useDescribeNotation();
      return (
        <ul>
          {["Bt7.1", "B27-6", "Ps-6", "X1/1"].map((note) => (
            <li key={note}>{describe(note)}</li>
          ))}
        </ul>
      );
    }
    renderWithIntl(<Notes />);
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Tốt trước cột 7 tiến 1",
      "Tốt thứ 2 cột 7 bình sang cột 6",
      "Pháo sau bình sang cột 6",
      "Xe cột 1 thoái 1",
    ]);
  });

  it("Kết quả chiếu bí: says Chiếu bí.", () => {
    const mated = xiangqiStateFromRows(
      [
        "R...k....",
        "........R",
        ".........",
        ".........",
        ".........",
        ".........",
        ".........",
        ".........",
        ".........",
        "...K.....",
      ],
      1,
    );
    expect(wordsOf(mated)[1]).toBe("Chiếu bí.");
  });
});
