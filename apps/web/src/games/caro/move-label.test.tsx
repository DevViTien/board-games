import { caro, type CaroState } from "@board-games/games";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { useCaroMoveLabel } from "./move-label";
import { useCaroPlayerLabel } from "./player-label";

const board = (size: 15 | 19): CaroState =>
  caro.setup({ playerCount: 2, options: { size, rule: "blocked-ends" } });

function MoveLabel({ cell, state }: { cell: number; state: CaroState }) {
  const label = useCaroMoveLabel();
  return <p>{label({ cell }, state)}</p>;
}

function PlayerLabels() {
  const label = useCaroPlayerLabel();
  return <p>{`${label(0)} ${label(1)}`}</p>;
}

describe("Cờ caro labels", () => {
  it.each([
    [19, 360, "hàng 19, cột 19"],
    [15, 224, "hàng 15, cột 15"],
    [19, 19, "hàng 2, cột 1"],
    [15, 15, "hàng 2, cột 1"],
  ] as const)("read a move on a %i×… board by row and column (cell %i)", (size, cell, text) => {
    renderWithIntl(<MoveLabel cell={cell} state={board(size)} />);

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("read a move in English", () => {
    renderWithIntl(<MoveLabel cell={360} state={board(19)} />, { locale: "en" });

    expect(screen.getByText("row 19, column 19")).toBeInTheDocument();
  });

  it("name the players X and O", () => {
    renderWithIntl(<PlayerLabels />);

    expect(screen.getByText("X O")).toBeInTheDocument();
  });
});
