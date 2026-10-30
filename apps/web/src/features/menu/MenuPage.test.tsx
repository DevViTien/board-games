import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";

import { MenuPage } from "./MenuPage";
import { UPCOMING_GAMES } from "./upcoming-games";

vi.mock("@/i18n/actions", () => ({ setLocale: vi.fn() }));

function gameCard(name: string) {
  const card = screen.getByRole("heading", { name }).closest("li");
  if (!card) throw new Error(`No card for ${name}`);
  return within(card);
}

describe("MenuPage", () => {
  it("shows the site heading", () => {
    renderWithIntl(<MenuPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Board Games Hub" })).toBeInTheDocument();
  });

  it("lists every upcoming game as coming soon", () => {
    renderWithIntl(<MenuPage />);

    expect(screen.getAllByRole("listitem")).toHaveLength(UPCOMING_GAMES.length);
    expect(screen.getAllByText("Sắp có")).toHaveLength(UPCOMING_GAMES.length);
  });

  it("renders game details in Vietnamese by default", () => {
    renderWithIntl(<MenuPage />);

    const ludo = gameCard("Cờ cá ngựa");
    expect(ludo.getByText("2–4 người")).toBeInTheDocument();
    expect(ludo.getByText("~20 phút")).toBeInTheDocument();
    expect(gameCard("Cờ caro").getByText("2 người")).toBeInTheDocument();
  });

  it("renders in English with plural rules", () => {
    renderWithIntl(<MenuPage />, { locale: "en" });

    expect(gameCard("Gomoku").getByText("2 players")).toBeInTheDocument();
    expect(gameCard("Ludo").getByText("2–4 players")).toBeInTheDocument();
    expect(screen.getAllByText("Coming soon")).toHaveLength(UPCOMING_GAMES.length);
  });

  it("renders in Japanese", () => {
    renderWithIntl(<MenuPage />, { locale: "ja" });

    expect(gameCard("チェス").getByText("2人")).toBeInTheDocument();
    expect(gameCard("ルドー").getByText("約20分")).toBeInTheDocument();
  });
});
