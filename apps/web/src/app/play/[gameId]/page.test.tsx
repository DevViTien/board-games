import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { SetupScreen } from "@/features/setup/SetupScreen";
import { TicTacToeArtwork } from "@/games/tictactoe/Artwork";
import { renderWithIntl } from "@/test/render-with-intl";
import { createMemoryStore } from "@/transport/memory-store";

import SetupError from "./error";
import GameNotFound from "./not-found";
import SetupPage from "./page";

const NOT_FOUND = new Error("NEXT_NOT_FOUND");

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw NOT_FOUND;
  },
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));

type SetupProps = ComponentProps<typeof SetupScreen>;

/** The props the page gives the setup screen. */
async function setupProps(...args: Parameters<typeof SetupPage>): Promise<SetupProps> {
  return ((await SetupPage(...args)) as { props: SetupProps }).props;
}

/** Everything but the artwork, an element drawn on the server: plain data. */
function plainProps(props: SetupProps): Partial<SetupProps> {
  return Object.fromEntries(Object.entries(props).filter(([name]) => name !== "artwork"));
}

describe("/play/[gameId]", () => {
  it("renders the setup screen of a registered game, passing only plain values", async () => {
    vi.stubEnv("REALTIME_URL", "ws://localhost:3101/api/realtime");
    const page = await SetupPage({ params: Promise.resolve({ gameId: "tictactoe" }) });
    vi.unstubAllEnvs();

    expect(page.type).toBe(SetupScreen);
    const props = page.props as SetupProps;
    expect(plainProps(props)).toEqual({
      gameId: "tictactoe",
      supportsAI: true,
      players: { min: 2, max: 2 },
      optionChoices: [],
      defaultOptions: {},
      realtimeUrl: "ws://localhost:3101/api/realtime",
      initialMode: undefined,
    });
    expect(props.artwork).toMatchObject({ type: TicTacToeArtwork });
  });

  it("Chọn sẵn Online: passes the mode asked for by the address", async () => {
    const props = await setupProps({
      params: Promise.resolve({ gameId: "ludo" }),
      searchParams: Promise.resolve({ mode: "online" }),
    });

    expect(props.initialMode).toBe("online");
  });

  it.each([["khong-co"], [["online", "local"]], [""]])(
    "Chế độ không hợp lệ: ignores the mode %j, without an error",
    async (mode) => {
      const props = await setupProps({
        params: Promise.resolve({ gameId: "tictactoe" }),
        searchParams: Promise.resolve({ mode }),
      });

      expect(props.initialMode).toBeUndefined();
    },
  );

  it("passes the rule options a game offers, and its defaults, as plain data", async () => {
    const page = await SetupPage({ params: Promise.resolve({ gameId: "caro" }) });

    expect(page.props).toMatchObject({
      optionChoices: [
        { name: "size", values: [15, 19] },
        { name: "rule", values: ["blocked-ends", "free"] },
      ],
      defaultOptions: { size: 15, rule: "blocked-ends" },
    });
    const props = plainProps(page.props as SetupProps);
    expect(JSON.parse(JSON.stringify(props))).toEqual({ ...props, initialMode: undefined });
  });

  it("Không có nhóm tuỳ chọn luật: Cờ cá ngựa offers its number of players and no rule", async () => {
    const page = await SetupPage({ params: Promise.resolve({ gameId: "ludo" }) });

    expect(page.props).toMatchObject({
      gameId: "ludo",
      supportsAI: true,
      players: { min: 2, max: 4 },
      optionChoices: [],
      defaultOptions: {},
    });
    renderWithIntl(<SetupScreen {...page.props} store={createMemoryStore()} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Bắt đầu" })).toHaveAttribute(
        "aria-disabled",
        "false",
      );
    });
    const names = ["Chế độ", "Số người chơi", "Mức độ", "Ai đi trước"];
    expect(screen.getAllByRole("group")).toEqual(
      names.map((name) => screen.getByRole("group", { name })),
    );
  });

  it("calls notFound for an unknown game", async () => {
    await expect(
      SetupPage({ params: Promise.resolve({ gameId: "khong-co-game-nay" }) }),
    ).rejects.toBe(NOT_FOUND);
  });

  it("offers a way back to the menu when the game does not exist", () => {
    renderWithIntl(<GameNotFound />);

    expect(screen.getByRole("heading", { name: "Không tìm thấy game" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Về menu" })).toHaveAttribute("href", "/");
  });

  it("offers to retry, or to go back to the menu, when the screen fails", async () => {
    const retry = vi.fn();
    renderWithIntl(<SetupError error={new Error("ChunkLoadError")} retry={retry} />);

    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Về menu" })).toHaveAttribute("href", "/");
  });
});
