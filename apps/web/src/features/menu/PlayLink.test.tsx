import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";
import { createMemoryStore } from "@/transport/memory-store";
import type { SavedGameStore } from "@/transport/types";

import { PlayLink } from "./PlayLink";

function renderLink(store: SavedGameStore) {
  renderWithIntl(
    <>
      <h2 id="game-tictactoe">Tic-tac-toe</h2>
      <PlayLink gameId="tictactoe" describedBy="game-tictactoe" store={store} />
    </>,
  );
}

describe("PlayLink", () => {
  it("says Play when no game is in progress", async () => {
    renderLink(createMemoryStore({ chess: {} }));

    // Wait for the store to be read, then confirm the label did not change.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByRole("link", { name: "Chơi" })).toHaveAttribute("href", "/play/tictactoe");
  });

  it("says Continue when this browser keeps a game in progress", async () => {
    renderLink(createMemoryStore({ tictactoe: {} }));

    expect(await screen.findByRole("link", { name: "Tiếp tục" })).toHaveAttribute(
      "href",
      "/play/tictactoe",
    );
  });

  it("stays on Play when the store cannot be read", async () => {
    const blocked: SavedGameStore = {
      ...createMemoryStore(),
      listSavedGameIds: () => Promise.reject(new Error("blocked")),
    };
    renderLink(blocked);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByRole("link", { name: "Chơi" })).toBeInTheDocument();
  });
});
