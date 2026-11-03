import { caro, type CaroState } from "@board-games/games/caro";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { useCaroResultDetail } from "./result-detail";

const START = caro.setup({ playerCount: 2, options: { size: 15, rule: "free" } });

/** A 15×15 board won by `player` along `cells` (only the line matters here). */
function won(player: 0 | 1, cells: readonly number[]): CaroState {
  return { ...START, win: { player, cells } };
}

function Detail({ state }: { state: CaroState }) {
  const detail = useCaroResultDetail();
  const result = caro.result(state);
  return <p>{result === null ? "none" : (detail(result, state) ?? "none")}</p>;
}

describe("useCaroResultDetail", () => {
  it.each([
    [won(0, [0, 1, 2, 3, 4]), "5 quân X liền nhau theo hàng ngang"],
    [won(1, [0, 15, 30, 45, 60]), "5 quân O liền nhau theo hàng dọc"],
    [won(0, [0, 16, 32, 48, 64]), "5 quân X liền nhau theo đường chéo xuống"],
    [won(0, [4, 18, 32, 46, 60, 74]), "6 quân X liền nhau theo đường chéo lên"],
  ] as const)("tells how many stones and which way (%#)", (state, text) => {
    renderWithIntl(<Detail state={state} />);

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("says nothing more of a draw", () => {
    const full: CaroState = { ...START, filled: START.board.length };
    renderWithIntl(<Detail state={full} />);

    expect(screen.getByText("none")).toBeInTheDocument();
  });
});
