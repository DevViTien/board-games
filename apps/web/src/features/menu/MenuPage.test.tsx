import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";
import type { SavedGameStore } from "@/transport/types";

import { MenuPage } from "./MenuPage";

vi.mock("@/i18n/actions", () => ({ setLocale: vi.fn() }));

// The menu's own store, swapped per test for a memory store (jsdom has no IndexedDB).
const saved = vi.hoisted(() => ({ store: undefined as SavedGameStore | undefined }));

vi.mock("@/transport/indexeddb-store", async () => {
  const { createMemoryStore } = await import("@/transport/memory-store");
  const fallback = createMemoryStore();
  const current = () => saved.store ?? fallback;
  return {
    savedGameStore: {
      load: (slot) => current().load(slot),
      save: (slot, game) => current().save(slot, game),
      clear: (slot) => current().clear(slot),
      listInProgress: () => current().listInProgress(),
    } satisfies SavedGameStore,
  };
});

afterEach(() => {
  saved.store = undefined;
});

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

  it("links a playable game to its setup screen", () => {
    renderWithIntl(<MenuPage />);

    const link = gameCard("Tic-tac-toe").getByRole("link", { name: "Chơi" });
    expect(link).toHaveAttribute("href", "/play/tictactoe");
    expect(link).toHaveAccessibleDescription("Tic-tac-toe");
  });

  it("gives a coming-soon game no link to open", async () => {
    renderWithIntl(<MenuPage />);

    expect(gameCard("Cờ vua").queryByRole("link")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("heading", { name: "Cờ vua" }));
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("has no list of games in progress, and says Play, when none is in progress", async () => {
    renderWithIntl(<MenuPage />);

    // Let the store be read before checking that nothing appeared.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole("region", { name: "Tiếp tục ván dở" })).not.toBeInTheDocument();
    expect(gameCard("Tic-tac-toe").getByRole("link", { name: "Chơi" })).toBeInTheDocument();
  });

  it("lists the games in progress below the cards, which still say Play", async () => {
    const { createMemoryStore } = await import("@/transport/memory-store");
    saved.store = createMemoryStore({
      "tictactoe:local": { settings: { kind: "local" }, record: {} },
    });
    renderWithIntl(<MenuPage />);

    const list = await screen.findByRole("region", { name: "Tiếp tục ván dở" });
    expect(within(list).getByRole("link", { name: "Tic-tac-toe · Cùng máy" })).toHaveAttribute(
      "href",
      "/play/tictactoe/local",
    );
    expect(gameCard("Tic-tac-toe").getByRole("link", { name: "Chơi" })).toBeInTheDocument();
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
