import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { PlayLinks } from "./PlayLinks";

function renderLinks() {
  renderWithIntl(
    <>
      <h2 id="game-ludo">Cờ cá ngựa</h2>
      <PlayLinks gameId="ludo" describedBy="game-ludo" />
    </>,
  );
}

describe("PlayLinks", () => {
  it("Mở game chơi được: says Play and opens the game's setup screen", () => {
    renderLinks();

    expect(screen.getByRole("link", { name: "Chơi" })).toHaveAttribute("href", "/play/ludo");
  });

  it("Mở game để chơi online: Online opens the setup screen with online play chosen", () => {
    renderLinks();

    expect(screen.getByRole("link", { name: "Online" })).toHaveAttribute(
      "href",
      "/play/ludo?mode=online",
    );
  });

  it("Lối vào nêu tên game: each way in is described by the game's name", () => {
    renderLinks();

    expect(screen.getByRole("link", { name: "Online" })).toHaveAccessibleDescription("Cờ cá ngựa");
    expect(screen.getByRole("link", { name: "Chơi" })).toHaveAccessibleDescription("Cờ cá ngựa");
  });
});
