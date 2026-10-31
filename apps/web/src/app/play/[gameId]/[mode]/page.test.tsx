import type * as Games from "@board-games/games";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PlayRoute } from "@/features/play/PlayRoute";
import { renderWithIntl } from "@/test/render-with-intl";
import { createMemoryStore } from "@/transport/memory-store";

import PlayError from "./error";
import PlayModeNotFound from "./not-found";
import PlayModePage from "./page";

const NOT_FOUND = new Error("NEXT_NOT_FOUND");

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw NOT_FOUND;
  },
  useSearchParams: () => new URLSearchParams(),
}));

// A registry with one more game, "no-ai", that cannot be played against the AI.
vi.mock("@board-games/games", async (importOriginal) => {
  const actual = await importOriginal<typeof Games>();
  const noAi = {
    ...actual.tictactoe,
    id: "no-ai",
    meta: { ...actual.tictactoe.meta, supportsAI: false },
  };
  return {
    ...actual,
    isRegisteredGameId: (id: string) => id === "no-ai" || actual.isRegisteredGameId(id),
    findGame: (id: string) => (id === "no-ai" ? noAi : actual.findGame(id)),
  };
});

const open = (gameId: string, mode: string) =>
  PlayModePage({ params: Promise.resolve({ gameId, mode }) });

describe("/play/[gameId]/[mode]", () => {
  it.each(["local", "ai"])(
    "renders the %s play route, passing only the id and mode",
    async (mode) => {
      const page = await open("tictactoe", mode);

      expect(page.type).toBe(PlayRoute);
      expect(page.props).toEqual({ gameId: "tictactoe", mode });
    },
  );

  it("renders the same-device play route of a game without an AI", async () => {
    expect((await open("no-ai", "local")).props).toEqual({ gameId: "no-ai", mode: "local" });
  });

  it.each([
    ["tictactoe", "khong-co-che-do-nay"],
    ["khong-co-game-nay", "local"],
    ["khong-co-game-nay", "ai"],
    ["no-ai", "ai"],
  ])("calls notFound for /play/%s/%s", async (gameId, mode) => {
    await expect(open(gameId, mode)).rejects.toBe(NOT_FOUND);
  });

  it("loads and shows the board of the requested game", async () => {
    // The route suspends while the game's code loads; React only retries inside an awaited act.
    await act(async () => {
      renderWithIntl(<PlayRoute gameId="tictactoe" mode="local" store={createMemoryStore()} />);
      await Promise.resolve();
    });

    expect(await screen.findByRole("group", { name: "Bàn cờ" })).toBeInTheDocument();
  });

  it("says the play page was not found, without claiming the game does not exist", () => {
    renderWithIntl(<PlayModeNotFound />);

    expect(
      screen.getByRole("heading", { name: "Không tìm thấy trang chơi này" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về menu" })).toHaveAttribute("href", "/");
  });

  it("offers to retry, or to go back to the menu, when the game fails to load", async () => {
    const retry = vi.fn();
    renderWithIntl(<PlayError error={new Error("ChunkLoadError")} retry={retry} />, {
      locale: "en",
    });

    expect(screen.getByRole("heading", { name: "Couldn't load the game" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Back to menu" })).toHaveAttribute("href", "/");
  });
});
