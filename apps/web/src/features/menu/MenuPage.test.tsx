import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { MenuPage } from "./MenuPage";

vi.mock("@/i18n/actions", () => ({ setLocale: vi.fn() }));

function gameCard(name: string) {
  const card = screen.getByRole("heading", { name }).closest("li");
  if (!card) throw new Error(`No card for ${name}`);
  return within(card);
}

const cardNames = () => screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);

describe("MenuPage", () => {
  it("shows the site heading", () => {
    renderWithIntl(<MenuPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Board Games Hub" })).toBeInTheDocument();
  });

  it("lists Tic-tac-toe as playable first, then the planned games as coming soon", () => {
    renderWithIntl(<MenuPage />);

    expect(cardNames()).toEqual(["Tic-tac-toe", "Cờ caro", "Cờ cá ngựa", "Cờ vua"]);
    expect(gameCard("Tic-tac-toe").queryByText("Sắp có")).not.toBeInTheDocument();
    for (const name of ["Cờ caro", "Cờ cá ngựa", "Cờ vua"]) {
      expect(gameCard(name).getByText("Sắp có")).toBeInTheDocument();
    }
  });

  it("links a playable game to its play screen", () => {
    renderWithIntl(<MenuPage />);

    const link = gameCard("Tic-tac-toe").getByRole("link", { name: "Chơi" });
    expect(link).toHaveAttribute("href", "/play/tictactoe");
    expect(link).toHaveAccessibleDescription("Tic-tac-toe");
  });

  it("gives a coming-soon game no link to open", () => {
    renderWithIntl(<MenuPage />);

    expect(gameCard("Cờ vua").queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("shows players and duration on each card", () => {
    renderWithIntl(<MenuPage />);

    const ludo = gameCard("Cờ cá ngựa");
    expect(ludo.getByText("2–4 người")).toBeInTheDocument();
    expect(ludo.getByText("~20 phút")).toBeInTheDocument();
    expect(gameCard("Tic-tac-toe").getByText("2 người")).toBeInTheDocument();
    expect(gameCard("Tic-tac-toe").getByText("~2 phút")).toBeInTheDocument();
  });

  it("renders in English with plural rules", () => {
    renderWithIntl(<MenuPage />, { locale: "en" });

    expect(gameCard("Gomoku").getByText("2 players")).toBeInTheDocument();
    expect(gameCard("Ludo").getByText("2–4 players")).toBeInTheDocument();
    expect(gameCard("Tic-tac-toe").getByRole("link", { name: "Play" })).toBeInTheDocument();
    expect(screen.getAllByText("Coming soon")).toHaveLength(3);
  });

  it("renders in Japanese", () => {
    renderWithIntl(<MenuPage />, { locale: "ja" });

    expect(gameCard("チェス").getByText("2人")).toBeInTheDocument();
    expect(gameCard("ルドー").getByText("約20分")).toBeInTheDocument();
    expect(gameCard("三目並べ").getByRole("link", { name: "遊ぶ" })).toBeInTheDocument();
  });
});
