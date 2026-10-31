import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { PlayLink } from "./PlayLink";

describe("PlayLink", () => {
  it("says Play and opens the game's setup screen, described by the card heading", () => {
    renderWithIntl(
      <>
        <h2 id="game-tictactoe">Tic-tac-toe</h2>
        <PlayLink gameId="tictactoe" describedBy="game-tictactoe" />
      </>,
    );

    const link = screen.getByRole("link", { name: "Chơi" });
    expect(link).toHaveAttribute("href", "/play/tictactoe");
    expect(link).toHaveAccessibleDescription("Tic-tac-toe");
  });
});
