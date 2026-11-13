import { GAMES } from "@board-games/games";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PUZZLES } from "@/puzzles/registry";
import { renderWithIntl } from "@/test/render-with-intl";
import type { SavedGameStore } from "@/transport/types";

import { buildMenu } from "./menu-games";
import { MenuPage } from "./MenuPage";

vi.mock("@/i18n/actions", () => ({ setLocale: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

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
  delete document.documentElement.dataset.theme;
});

function gameCard(name: string) {
  const card = screen.getByRole("heading", { name }).closest("li");
  if (!card) throw new Error(`No card for ${name}`);
  return within(card);
}

/** The names on the game cards, in order: the list holding Tic-tac-toe's card. */
const cardNames = () =>
  within(screen.getByRole("heading", { name: "Tic-tac-toe" }).closest("ul") ?? document.body)
    .getAllByRole("heading", { level: 2 })
    .map((h) => h.textContent);

describe("MenuPage", () => {
  it("leads with the hero heading, the app's name in the bar above it", () => {
    renderWithIntl(<MenuPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Chơi cờ cùng bạn bè, ngay trên trình duyệt",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("banner")).toHaveTextContent("Board Games Hub");
  });

  it("offers the theme and the language in its bar", () => {
    // The page as the server sends it for a player who picked dark.
    document.documentElement.dataset.theme = "dark";
    renderWithIntl(<MenuPage />);

    const bar = within(screen.getByRole("banner"));
    expect(bar.getByRole("button", { name: "Giao diện: Tối" })).toHaveAttribute(
      "aria-haspopup",
      "menu",
    );
    expect(bar.getByRole("button", { name: "Ngôn ngữ: Tiếng Việt, VI" })).toHaveAttribute(
      "aria-haspopup",
      "menu",
    );
    // The menu has no way back to itself.
    expect(bar.queryByRole("link", { name: "Về menu" })).not.toBeInTheDocument();
  });

  it("lifts a game card pointed at or reached with Tab, without moving it when motion is reduced", () => {
    renderWithIntl(<MenuPage />);

    const card = screen.getByRole("heading", { name: "Cờ caro" }).closest("li")?.firstElementChild;
    expect(card).toHaveClass(
      "motion-safe:hover:-translate-y-0.5",
      "motion-safe:has-focus-visible:-translate-y-0.5",
      "hover:shadow-raised",
      "motion-reduce:transition-none",
    );
  });

  it("Mọi game đã có luật đều chơi được: all seven games are playable, none coming soon", () => {
    renderWithIntl(<MenuPage />);

    const names = [
      "Tic-tac-toe",
      "Cờ caro",
      "Cờ cá ngựa",
      "Cờ vua",
      "Cờ rào",
      "Đội gom thạch",
      "Tam giác cấm",
    ];
    // And the puzzle after them (its own card, below).
    expect(cardNames()).toEqual([...names, "Gom thạch"]);
    for (const name of names) {
      expect(gameCard(name).getByRole("link", { name: "Chơi" })).toBeInTheDocument();
      expect(gameCard(name).getByRole("link", { name: "Online" })).toBeInTheDocument();
    }
    expect(screen.queryByText("Sắp có")).not.toBeInTheDocument();
  });

  it("Thẻ Cờ rào: 2–4 players, about 15 minutes, Play and Online", () => {
    renderWithIntl(<MenuPage />);

    const card = gameCard("Cờ rào");
    expect(card.getByText("2–4 người")).toBeInTheDocument();
    expect(card.getByText("~15 phút")).toBeInTheDocument();
    expect(card.getByRole("link", { name: "Chơi" })).toHaveAttribute("href", "/play/fence-race");
    expect(card.getByRole("link", { name: "Online" })).toHaveAttribute(
      "href",
      "/play/fence-race?mode=online",
    );
    expect(card.queryByText("Sắp có")).not.toBeInTheDocument();
  });

  it("Thẻ Tam giác cấm: 2 players, about 3 minutes, Play and Online", () => {
    renderWithIntl(<MenuPage />);

    const card = gameCard("Tam giác cấm");
    expect(card.getByText("2 người")).toBeInTheDocument();
    expect(card.getByText("~3 phút")).toBeInTheDocument();
    expect(card.getByRole("link", { name: "Chơi" })).toHaveAttribute(
      "href",
      "/play/forbidden-triangle",
    );
    expect(card.getByRole("link", { name: "Online" })).toHaveAttribute(
      "href",
      "/play/forbidden-triangle?mode=online",
    );
    expect(card.queryByText("Sắp có")).not.toBeInTheDocument();
  });

  it("Thẻ Đội gom thạch: 2–4 players, about 15 minutes, Play and Online, no AI", () => {
    renderWithIntl(<MenuPage />);

    const card = gameCard("Đội gom thạch");
    expect(card.getByText("2–4 người")).toBeInTheDocument();
    expect(card.getByText("~15 phút")).toBeInTheDocument();
    expect(card.getByRole("link", { name: "Chơi" })).toHaveAttribute("href", "/play/jelly-crew");
    expect(card.getByRole("link", { name: "Online" })).toHaveAttribute(
      "href",
      "/play/jelly-crew?mode=online",
    );
    expect(card.queryByRole("link", { name: /máy/u })).not.toBeInTheDocument();
    expect(card.queryByText("Sắp có")).not.toBeInTheDocument();
  });

  it("Thẻ Cờ vua: 2 players, about 20 minutes, Play and Online", () => {
    renderWithIntl(<MenuPage />);

    const card = gameCard("Cờ vua");
    expect(card.getByText("2 người")).toBeInTheDocument();
    expect(card.getByText("~20 phút")).toBeInTheDocument();
    expect(card.getByRole("link", { name: "Chơi" })).toHaveAttribute("href", "/play/chess");
    expect(card.getByRole("link", { name: "Online" })).toHaveAttribute(
      "href",
      "/play/chess?mode=online",
    );
    expect(card.queryByText("Sắp có")).not.toBeInTheDocument();
  });

  it("Thẻ Cờ cá ngựa: 2–4 players, about 20 minutes, Play and Online", () => {
    renderWithIntl(<MenuPage />);

    const card = gameCard("Cờ cá ngựa");
    expect(card.getByText("2–4 người")).toBeInTheDocument();
    expect(card.getByText("~20 phút")).toBeInTheDocument();
    expect(card.getByRole("link", { name: "Chơi" })).toHaveAttribute("href", "/play/ludo");
    expect(card.getByRole("link", { name: "Online" })).toHaveAttribute(
      "href",
      "/play/ludo?mode=online",
    );
    expect(card.queryByText("Sắp có")).not.toBeInTheDocument();
  });

  it("Thẻ Cờ caro: 2 players, about 10 minutes, Play and Online", () => {
    renderWithIntl(<MenuPage />);

    const card = gameCard("Cờ caro");
    expect(card.getByText("2 người")).toBeInTheDocument();
    expect(card.getByText("~10 phút")).toBeInTheDocument();
    expect(card.getByRole("link", { name: "Chơi" })).toHaveAttribute("href", "/play/caro");
    expect(card.getByRole("link", { name: "Online" })).toHaveAttribute(
      "href",
      "/play/caro?mode=online",
    );
    expect(card.queryByText("Sắp có")).not.toBeInTheDocument();
  });

  it("Lối vào nêu tên game: Online on Cờ cá ngựa's card is described by its name", () => {
    renderWithIntl(<MenuPage />);

    expect(
      gameCard("Cờ cá ngựa").getByRole("link", { name: "Online" }),
    ).toHaveAccessibleDescription("Cờ cá ngựa");
  });

  it("shows each playable game's artwork in its own colours, with a short description", () => {
    const { container } = renderWithIntl(<MenuPage />);

    expect(
      [...container.querySelectorAll("[data-game]")].map((art) => art.getAttribute("data-game")),
    ).toEqual([
      "tictactoe",
      "caro",
      "ludo",
      "chess",
      "fence-race",
      "jelly-crew",
      "forbidden-triangle",
      "jelly-gather",
    ]);
    expect(
      gameCard("Cờ cá ngựa").getByText("Gieo xúc xắc, đua ngựa về chuồng"),
    ).toBeInTheDocument();
  });

  it("links a playable game to its setup screen", () => {
    renderWithIntl(<MenuPage />);

    const link = gameCard("Tic-tac-toe").getByRole("link", { name: "Chơi" });
    expect(link).toHaveAttribute("href", "/play/tictactoe");
    expect(link).toHaveAccessibleDescription("Tic-tac-toe");
  });

  it("Thẻ sắp có không mở được: a planned game's card has no link and opens nothing", async () => {
    // The real menu has no planned game since M7: a menu with Chess still planned.
    const cards = buildMenu({
      registered: GAMES.filter((game) => game.id !== "chess"),
      planned: [{ id: "chess", players: { min: 2, max: 2 }, durationMinutes: 20 }],
      puzzles: [],
    });
    renderWithIntl(<MenuPage cards={cards} />);

    expect(cardNames()).toEqual([
      "Tic-tac-toe",
      "Cờ caro",
      "Cờ cá ngựa",
      "Cờ rào",
      "Đội gom thạch",
      "Tam giác cấm",
      "Cờ vua",
    ]);
    expect(gameCard("Cờ vua").getByText("Sắp có")).toBeInTheDocument();
    expect(gameCard("Cờ vua").queryByRole("link")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("heading", { name: "Cờ vua" }));
    // Play, Online and the rules on the six playable games' cards, the toolbox, and nothing more.
    expect(within(screen.getByRole("main")).getAllByRole("link")).toHaveLength(19);
  });

  it("Mở từ menu: a link to the toolbox, above the games", () => {
    renderWithIntl(<MenuPage />);

    const toolbox = screen.getByRole("link", { name: "Hộp công cụ" });
    expect(toolbox).toHaveAttribute("href", "/tools");
    const firstGame = screen.getByRole("heading", { name: "Tic-tac-toe" });
    expect(toolbox.compareDocumentPosition(firstGame)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("links every game of the real menu: Play, Online and the rules on each of the seven cards", () => {
    renderWithIntl(<MenuPage />);

    // With the way to the toolbox and Gom thạch's "Chơi".
    expect(within(screen.getByRole("main")).getAllByRole("link")).toHaveLength(23);
  });

  it("Thẻ Gom thạch: one player, its levels, one way in named with it, no Online", () => {
    renderWithIntl(<MenuPage />);

    expect(cardNames().at(-1)).toBe("Gom thạch");
    const card = gameCard("Gom thạch");
    expect(card.getByText("1 người")).toBeInTheDocument();
    expect(card.getByText(`${PUZZLES[0]?.levelCount ?? 0} màn`)).toBeInTheDocument();
    const links = card.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName("Chơi");
    expect(links[0]).toHaveAccessibleDescription("Gom thạch");
    expect(links[0]).toHaveAttribute("href", "/puzzles/jelly-gather");
  });

  it("Trò giải đố mới: one more line in the list, one more card", () => {
    const puzzle = PUZZLES[0];
    if (puzzle === undefined) throw new Error("no puzzle");
    function TestArtwork() {
      return <svg aria-hidden data-testid="test-artwork" />;
    }
    const cards = buildMenu({
      registered: [],
      planned: [],
      puzzles: [puzzle, { ...puzzle, Artwork: TestArtwork }],
    });
    renderWithIntl(<MenuPage cards={cards} />);

    expect(screen.getAllByRole("heading", { level: 2, name: "Gom thạch" })).toHaveLength(2);
    expect(screen.getByTestId("test-artwork")).toBeInTheDocument();
    // Each card's way in is described by its own heading.
    const descriptions = screen
      .getAllByRole("link", { name: "Chơi" })
      .map((link) => link.getAttribute("aria-describedby"));
    expect(new Set(descriptions).size).toBe(2);
  });

  it("Tên liên kết không trùng: seven links to the rules, each named with its game", () => {
    renderWithIntl(<MenuPage />);

    const rules = within(screen.getByRole("main")).getAllByRole("link", { name: /^Luật chơi/ });
    expect(rules.map((link) => link.textContent)).toEqual([
      "Luật chơi Tic-tac-toe",
      "Luật chơi Cờ caro",
      "Luật chơi Cờ cá ngựa",
      "Luật chơi Cờ vua",
      "Luật chơi Cờ rào",
      "Luật chơi Đội gom thạch",
      "Luật chơi Tam giác cấm",
    ]);
    expect(new Set(rules.map((link) => link.getAttribute("href")))).toEqual(
      new Set([
        "/rules/tictactoe",
        "/rules/caro",
        "/rules/ludo",
        "/rules/chess",
        "/rules/fence-race",
        "/rules/jelly-crew",
        "/rules/forbidden-triangle",
      ]),
    );
    for (const [index, name] of [
      "Luật chơi Tic-tac-toe",
      "Luật chơi Cờ caro",
      "Luật chơi Cờ cá ngựa",
      "Luật chơi Cờ vua",
      "Luật chơi Cờ rào",
      "Luật chơi Đội gom thạch",
      "Luật chơi Tam giác cấm",
    ].entries()) {
      expect(rules[index]).toHaveAccessibleName(name);
    }
  });

  it("links the third-party licences from its footer, in every language", () => {
    const { unmount } = renderWithIntl(<MenuPage />);
    expect(
      within(screen.getByRole("contentinfo")).getByRole("link", { name: "Giấy phép bên thứ ba" }),
    ).toHaveAttribute("href", "/third-party-licenses.txt");
    unmount();

    renderWithIntl(<MenuPage />, { locale: "en" });
    expect(screen.getByRole("link", { name: "Third-party licenses" })).toBeInTheDocument();
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

  it("names the rules of a game in progress of a game that has rule options", async () => {
    const { createMemoryStore } = await import("@/transport/memory-store");
    saved.store = createMemoryStore({
      "caro:ai": {
        settings: {
          kind: "ai",
          first: "human",
          seats: [{ kind: "human" }, { kind: "ai", level: "hard" }],
        },
        record: { options: { size: 19, rule: "free" } },
      },
    });
    renderWithIntl(<MenuPage />);

    const list = await screen.findByRole("region", { name: "Tiếp tục ván dở" });
    expect(
      within(list).getByRole("link", { name: "Cờ caro · Với máy · Khó · 19×19 · Tự do" }),
    ).toHaveAttribute("href", "/play/caro/ai");
  });

  it("offers to join a room by its code, beside the hero and above the games in progress", async () => {
    const { createMemoryStore } = await import("@/transport/memory-store");
    saved.store = createMemoryStore({
      "tictactoe:local": { settings: { kind: "local" }, record: {} },
    });
    renderWithIntl(<MenuPage />);

    const section = screen.getByRole("region", { name: "Vào phòng bằng mã" });
    expect(within(section).getByRole("textbox", { name: "Mã phòng" })).toBeInTheDocument();
    const games = await screen.findByRole("region", { name: "Tiếp tục ván dở" });
    const following = (a: Element, b: Element) =>
      (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    expect(following(section, games)).toBe(true);
    expect(following(games, screen.getByRole("heading", { name: "Tic-tac-toe" }))).toBe(true);
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
    expect(screen.queryAllByText("Coming soon")).toHaveLength(0);
  });

  it("renders in Japanese", () => {
    renderWithIntl(<MenuPage />, { locale: "ja" });

    expect(gameCard("チェス").getByText("2人")).toBeInTheDocument();
    expect(gameCard("ルドー").getByText("約20分")).toBeInTheDocument();
    expect(gameCard("三目並べ").getByRole("link", { name: "遊ぶ" })).toBeInTheDocument();
    expect(gameCard("チェス").getByRole("link", { name: "遊ぶ" })).toBeInTheDocument();
  });
});
