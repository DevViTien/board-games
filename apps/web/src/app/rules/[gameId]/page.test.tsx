import { screen, within } from "@testing-library/react";
import { createTranslator } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { TIME_ZONE } from "@/i18n/config";
import { renderWithIntl } from "@/test/render-with-intl";

import messages from "../../../../messages/vi.json";
import RulesNotFound from "./not-found";
import RulesRoute, { generateMetadata } from "./page";

const NOT_FOUND = new Error("NEXT_NOT_FOUND");

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw NOT_FOUND;
  },
}));

// The server's translations, in Vietnamese, as `getTranslations` gives them to the page.
vi.mock("next-intl/server", () => ({
  getTranslations: (namespace: "Rules" | "Games" | "Menu") =>
    Promise.resolve(createTranslator({ locale: "vi", messages, namespace, timeZone: TIME_ZONE })),
}));

const open = (gameId: string) => RulesRoute({ params: Promise.resolve({ gameId }) });

describe("/rules/[gameId]", () => {
  it("Mở trang luật Cờ caro: a level-one title, level-two sections, and the way to play", async () => {
    renderWithIntl(await open("caro"));

    expect(screen.getByRole("heading", { level: 1, name: "Luật chơi Cờ caro" })).toBeVisible();
    expect(screen.getAllByRole("heading", { level: 2 }).length).toBeGreaterThanOrEqual(5);
    for (const link of screen.getAllByRole("link", { name: "Chơi Cờ caro" })) {
      expect(link).toHaveAttribute("href", "/play/caro");
    }
    expect(screen.getByRole("link", { name: "Về menu" })).toHaveAttribute("href", "/");
    expect(screen.getByText(/^2 người/)).toHaveTextContent("2 người · ~10 phút");
  });

  it("names the page by the game's rules", async () => {
    expect(await generateMetadata({ params: Promise.resolve({ gameId: "ludo" }) })).toEqual({
      title: "Luật chơi Cờ cá ngựa",
    });
  });

  it("Game không tồn tại: an unknown game has no rules page", async () => {
    await expect(open("khong-co-game-nay")).rejects.toBe(NOT_FOUND);
    expect(await generateMetadata({ params: Promise.resolve({ gameId: "khong-co" }) })).toEqual({});
  });

  it("says there are no such rules, with the way back to the menu", () => {
    renderWithIntl(<RulesNotFound />);

    expect(screen.getByRole("heading", { name: "Không có luật chơi này" })).toBeVisible();
    expect(within(screen.getByRole("main")).getByRole("link", { name: "Về menu" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
