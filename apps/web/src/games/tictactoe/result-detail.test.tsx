import { tictactoe } from "@board-games/games/tictactoe";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { useTicTacToeResultDetail } from "./result-detail";

const played = (...cells: readonly number[]) =>
  cells.reduce((state, cell) => tictactoe.applyMove(state, { cell }), tictactoe.setup());

function Detail({ cells }: { cells: readonly number[] }) {
  const detail = useTicTacToeResultDetail();
  const state = played(...cells);
  const result = tictactoe.result(state);
  return <p>{result === null ? "none" : (detail(result, state) ?? "none")}</p>;
}

describe("useTicTacToeResultDetail", () => {
  it.each([
    [[0, 3, 1, 4, 2], "Ba X thẳng hàng ở hàng 1"],
    [[3, 0, 4, 1, 6, 2], "Ba O thẳng hàng ở hàng 1"],
    [[6, 0, 7, 1, 8], "Ba X thẳng hàng ở hàng 3"],
    [[1, 0, 4, 2, 7], "Ba X thẳng hàng ở cột 2"],
    [[0, 1, 4, 2, 8], "Ba X thẳng hàng ở đường chéo chính"],
    [[0, 2, 1, 4, 3, 6], "Ba O thẳng hàng ở đường chéo phụ"],
    [[0, 1, 2, 3, 6, 5, 8, 7, 4], "Ba X thẳng hàng ở đường chéo chính và ở đường chéo phụ"],
    // X O X / X O O / O X X: a draw has no line.
    [[0, 1, 2, 4, 3, 5, 7, 6, 8], "none"],
  ] as const)("tells where the line is (%j)", (cells, text) => {
    renderWithIntl(<Detail cells={cells} />);

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("speaks English", () => {
    renderWithIntl(<Detail cells={[0, 3, 1, 4, 2]} />, { locale: "en" });

    expect(screen.getByText("Three X marks in row 1")).toBeInTheDocument();
  });
});
