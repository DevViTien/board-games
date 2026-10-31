import type { GameRecord } from "@board-games/engine";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/test/render-with-intl";
import { createMemoryStore } from "@/transport/memory-store";
import type { ModeSettings, SavedGameStore } from "@/transport/types";

import { ContinueList } from "./ContinueList";

const LOCAL: ModeSettings = { kind: "local" };
const AI_HARD: ModeSettings = {
  kind: "ai",
  first: "human",
  seats: [{ kind: "human" }, { kind: "ai", level: "hard" }],
};

const RECORD: GameRecord = {
  version: 1,
  gameId: "tictactoe",
  playerCount: 2,
  options: {},
  entries: [],
};

// Before any test runs, so a game saved during a test is always the most recent one.
const EARLIER = "2020-01-01T10:00:00.000Z";
const LATER = "2020-01-02T10:00:00.000Z";

/** Lets the store be read before checking that nothing appeared. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const items = () =>
  within(screen.getByRole("region", { name: "Tiếp tục ván dở" }))
    .getAllByRole("link")
    .map((link) => [link.textContent, link.getAttribute("href")]);

describe("ContinueList", () => {
  it("lists a game in progress in each mode, each opening that game", async () => {
    renderWithIntl(
      <ContinueList
        store={createMemoryStore({
          "tictactoe:local": { settings: LOCAL, record: {} },
          "tictactoe:ai": { settings: AI_HARD, record: {} },
        })}
      />,
    );

    expect(await screen.findByRole("heading", { name: "Tiếp tục ván dở" })).toBeInTheDocument();
    expect(items()).toContainEqual(["Tic-tac-toe · Cùng máy", "/play/tictactoe/local"]);
    expect(items()).toContainEqual(["Tic-tac-toe · Với máy · Khó", "/play/tictactoe/ai"]);
  });

  it("puts the most recently saved game first", async () => {
    renderWithIntl(
      <ContinueList
        store={createMemoryStore({
          "tictactoe:local": { settings: LOCAL, record: {}, savedAt: LATER },
          "tictactoe:ai": { settings: AI_HARD, record: {}, savedAt: EARLIER },
        })}
      />,
    );

    await screen.findByRole("region", { name: "Tiếp tục ván dở" });
    expect(items()).toEqual([
      ["Tic-tac-toe · Cùng máy", "/play/tictactoe/local"],
      ["Tic-tac-toe · Với máy · Khó", "/play/tictactoe/ai"],
    ]);
  });

  it("puts a game just saved first", async () => {
    const store = createMemoryStore({
      "tictactoe:local": { settings: LOCAL, record: RECORD, savedAt: LATER },
      "tictactoe:ai": { settings: AI_HARD, record: RECORD, savedAt: EARLIER },
    });
    // A move in the game against the AI, after the same-device game was saved.
    await store.save(
      { gameId: "tictactoe", mode: "ai" },
      {
        settings: AI_HARD,
        record: RECORD,
        inProgress: true,
      },
    );
    renderWithIntl(<ContinueList store={store} />);

    await screen.findByRole("region", { name: "Tiếp tục ván dở" });
    expect(items()).toEqual([
      ["Tic-tac-toe · Với máy · Khó", "/play/tictactoe/ai"],
      ["Tic-tac-toe · Cùng máy", "/play/tictactoe/local"],
    ]);
  });

  it("shows nothing when no game is in progress", async () => {
    renderWithIntl(<ContinueList store={createMemoryStore()} />);

    await settle();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("does not list a game against the AI where only the AI has moved", async () => {
    renderWithIntl(
      <ContinueList
        store={createMemoryStore({
          "tictactoe:ai": { settings: AI_HARD, record: {}, inProgress: false },
        })}
      />,
    );

    await settle();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("shows nothing when the saved games cannot be read", async () => {
    const blocked: SavedGameStore = {
      ...createMemoryStore(),
      listInProgress: () => Promise.reject(new Error("blocked")),
    };
    renderWithIntl(<ContinueList store={blocked} />);

    await settle();
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("is translated", async () => {
    renderWithIntl(
      <ContinueList
        store={createMemoryStore({ "tictactoe:ai": { settings: AI_HARD, record: {} } })}
      />,
      { locale: "ja" },
    );

    expect(
      await screen.findByRole("link", { name: "三目並べ・コンピューター対戦・むずかしい" }),
    ).toBeInTheDocument();
  });
});
