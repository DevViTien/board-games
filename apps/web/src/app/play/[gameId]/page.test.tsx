import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PlayRoute } from "@/features/play/PlayRoute";
import { renderWithIntl } from "@/test/render-with-intl";
import { createMemoryStore } from "@/transport/memory-store";

import PlayError from "./error";
import GameNotFound from "./not-found";
import PlayPage from "./page";

const NOT_FOUND = new Error("NEXT_NOT_FOUND");

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw NOT_FOUND;
  },
}));

describe("/play/[gameId]", () => {
  it("renders the play route for a registered game, passing only its id", async () => {
    const page = await PlayPage({ params: Promise.resolve({ gameId: "tictactoe" }) });

    expect(page.type).toBe(PlayRoute);
    expect(page.props).toEqual({ gameId: "tictactoe" });
  });

  it("calls notFound for an unknown game", async () => {
    await expect(
      PlayPage({ params: Promise.resolve({ gameId: "khong-co-game-nay" }) }),
    ).rejects.toBe(NOT_FOUND);
  });

  it("loads and shows the board of the requested game", async () => {
    // The route suspends while the game's code loads; React only retries inside an awaited act.
    await act(async () => {
      renderWithIntl(<PlayRoute gameId="tictactoe" store={createMemoryStore()} />);
      await Promise.resolve();
    });

    expect(await screen.findByRole("group", { name: "Bàn cờ" })).toBeInTheDocument();
  });

  it("offers a way back to the menu when the game does not exist", () => {
    renderWithIntl(<GameNotFound />);

    expect(screen.getByRole("heading", { name: "Không tìm thấy game" })).toBeInTheDocument();
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
