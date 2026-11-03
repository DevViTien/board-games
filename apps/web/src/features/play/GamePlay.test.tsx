import { caro, tictactoe } from "@board-games/games";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createInlineAiPlayer } from "@/ai-worker/ai-player";
import { writeSetupChoice } from "@/features/setup/setup-preferences";
import { CaroBoard } from "@/games/caro/Board";
import { useCaroMoveLabel } from "@/games/caro/move-label";
import { useCaroPlayerLabel } from "@/games/caro/player-label";
import { TicTacToeBoard } from "@/games/tictactoe/Board";
import { useTicTacToeMoveLabel } from "@/games/tictactoe/move-label";
import { useTicTacToePlayerLabel } from "@/games/tictactoe/player-label";
import { renderWithIntl } from "@/test/render-with-intl";
import { createMemoryStore } from "@/transport/memory-store";
import type { AiPlayer } from "@/transport/types";

import { GamePlay } from "./GamePlay";

const ui = {
  Board: TicTacToeBoard,
  usePlayerLabel: useTicTacToePlayerLabel,
  useMoveLabel: useTicTacToeMoveLabel,
};

const caroUi = {
  Board: CaroBoard,
  usePlayerLabel: useCaroPlayerLabel,
  useMoveLabel: useCaroMoveLabel,
};

/** An AI that never answers: these tests only look at the game before its first move. */
const silentAi = (): AiPlayer => ({
  chooseMove: () => new Promise<unknown>(() => undefined),
  dispose: () => undefined,
});

/** Lets the fire-and-forget store writes settle. */
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

afterEach(() => {
  window.localStorage.clear();
});

describe("GamePlay", () => {
  it("plays a game through a local transport and saves it to the given store", async () => {
    const store = createMemoryStore();
    renderWithIntl(
      <GamePlay gameId="tictactoe" mode="local" definition={tictactoe} ui={ui} store={store} />,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Hàng 2, cột 2, trống" }));

    expect(screen.getByRole("button", { name: "Hàng 2, cột 2, X" })).toBeInTheDocument();
    await flush();
    expect(store.entries.get("tictactoe:local")?.record).toMatchObject({
      entries: [{ move: { cell: 4 } }],
    });
  });

  it("opened straight with no saved game, starts at Medium with the player to move", async () => {
    const store = createMemoryStore();
    renderWithIntl(
      <GamePlay
        gameId="tictactoe"
        mode="ai"
        definition={tictactoe}
        ui={ui}
        store={store}
        createAiPlayer={createInlineAiPlayer}
      />,
    );

    expect(await screen.findByText("Đến lượt bạn (X)")).toBeInTheDocument();
    expect(screen.getByText("Với máy · Vừa")).toBeInTheDocument();
    await flush();
    expect(store.entries.get("tictactoe:ai")?.settings).toEqual({
      kind: "ai",
      first: "human",
      seats: [{ kind: "human" }, { kind: "ai", level: "medium" }],
    });
  });

  it("opened straight with no saved game, sets it up like the last game started", async () => {
    writeSetupChoice("tictactoe", { mode: "ai", level: "hard", first: "human", options: {} });
    renderWithIntl(
      <GamePlay
        gameId="tictactoe"
        mode="ai"
        definition={tictactoe}
        ui={ui}
        store={createMemoryStore()}
        createAiPlayer={createInlineAiPlayer}
      />,
    );

    expect(await screen.findByText("Với máy · Khó")).toBeInTheDocument();
    expect(screen.getByText("Đến lượt bạn (X)")).toBeInTheDocument();
  });

  it("starts the game asked for instead of resuming the saved one", async () => {
    const store = createMemoryStore();
    const first = renderWithIntl(
      <GamePlay gameId="tictactoe" mode="local" definition={tictactoe} ui={ui} store={store} />,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Hàng 1, cột 1, trống" }));
    await flush();
    first.unmount();

    renderWithIntl(
      <GamePlay
        gameId="tictactoe"
        mode="local"
        definition={tictactoe}
        ui={ui}
        store={store}
        start={{ mode: "local" }}
      />,
    );

    expect(await screen.findByRole("button", { name: "Hàng 1, cột 1, trống" })).toBeInTheDocument();
  });

  it("creates the AI only against it, and disposes of it with the transport", async () => {
    const dispose = vi.fn();
    const createAiPlayer = vi.fn((): AiPlayer => ({ ...createInlineAiPlayer(), dispose }));
    const local = renderWithIntl(
      <GamePlay
        gameId="tictactoe"
        mode="local"
        definition={tictactoe}
        ui={ui}
        store={createMemoryStore()}
        createAiPlayer={createAiPlayer}
      />,
    );
    await screen.findByRole("group", { name: "Bàn cờ" });
    local.unmount();
    expect(createAiPlayer).not.toHaveBeenCalled();

    const ai = renderWithIntl(
      <GamePlay
        gameId="tictactoe"
        mode="ai"
        definition={tictactoe}
        ui={ui}
        store={createMemoryStore()}
        createAiPlayer={createAiPlayer}
      />,
    );
    await screen.findByRole("group", { name: "Bàn cờ" });
    expect(createAiPlayer).toHaveBeenCalledOnce();
    ai.unmount();
    expect(dispose).toHaveBeenCalledOnce();
  });
});

describe("GamePlay rule options", () => {
  it("opened straight on this device with no game, uses the rule options chosen last", async () => {
    writeSetupChoice("caro", {
      mode: "ai",
      level: "medium",
      first: "human",
      options: { size: 19, rule: "blocked-ends" },
    });
    renderWithIntl(
      <GamePlay
        gameId="caro"
        mode="local"
        definition={caro}
        ui={caroUi}
        store={createMemoryStore()}
      />,
    );

    expect(await screen.findByText("19×19 · Chặn hai đầu")).toBeInTheDocument();
    expect(screen.getAllByRole("gridcell")).toHaveLength(19 * 19);
  });

  it("opened straight against the AI with no game, uses the level and rule options chosen last", async () => {
    writeSetupChoice("caro", {
      mode: "ai",
      level: "hard",
      first: "human",
      options: { size: 15, rule: "free" },
    });
    const store = createMemoryStore();
    renderWithIntl(
      <GamePlay
        gameId="caro"
        mode="ai"
        definition={caro}
        ui={caroUi}
        store={store}
        createAiPlayer={silentAi}
      />,
    );

    expect(await screen.findByText("15×15 · Tự do")).toBeInTheDocument();
    expect(screen.getByText("Với máy · Khó")).toBeInTheDocument();
    await flush();
    expect(store.entries.get("caro:ai")?.record).toMatchObject({
      options: { size: 15, rule: "free" },
    });
  });

  it("opened straight with nothing remembered, uses the game's default rule options", async () => {
    renderWithIntl(
      <GamePlay
        gameId="caro"
        mode="local"
        definition={caro}
        ui={caroUi}
        store={createMemoryStore()}
      />,
    );

    expect(await screen.findByText("15×15 · Chặn hai đầu")).toBeInTheDocument();
  });
});
