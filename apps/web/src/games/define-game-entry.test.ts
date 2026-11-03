import { GAMES, tictactoe } from "@board-games/games";
import type { ComponentType } from "react";
import { describe, expect, expectTypeOf, it } from "vitest";

import { defineGameEntry } from "./define-game-entry";
import { GAME_ENTRY_LOADERS, type GameEntryLoaders } from "./registry";
import { TicTacToeBoard } from "./tictactoe/Board";
import { useTicTacToeMoveLabel } from "./tictactoe/move-label";
import { useTicTacToePlayerLabel } from "./tictactoe/player-label";
import type { BoardProps, GameEntry } from "./types";

const ticTacToeUI = {
  Board: TicTacToeBoard,
  usePlayerLabel: useTicTacToePlayerLabel,
  useMoveLabel: useTicTacToeMoveLabel,
};

describe("defineGameEntry", () => {
  it("hands the game's own rules and UI to whoever opens the entry", () => {
    const entry = defineGameEntry(tictactoe, ticTacToeUI);

    const opened = entry.open((definition, ui): readonly unknown[] => [definition, ui]);

    expect(opened).toEqual([tictactoe, ticTacToeUI]);
  });

  it("keeps the literal id of the game", async () => {
    const entry = await GAME_ENTRY_LOADERS.tictactoe();

    expect(entry.id).toBe("tictactoe");
    expectTypeOf(entry.id).toEqualTypeOf<"tictactoe">();
  });

  it("refuses a board made for another game's state and moves", () => {
    const ChessLikeBoard: ComponentType<
      BoardProps<{ squares: string[] }, { from: string; to: string }>
    > = () => null;

    // @ts-expect-error -- the board does not fit Tic-tac-toe's State and Move
    defineGameEntry(tictactoe, {
      Board: ChessLikeBoard,
      usePlayerLabel: useTicTacToePlayerLabel,
      useMoveLabel: useTicTacToeMoveLabel,
    });
  });

  it("refuses a game that is not registered", () => {
    // @ts-expect-error -- "chess" is not a RegisteredGameId until its rules are in GAMES
    defineGameEntry({ ...tictactoe, id: "chess" as const }, ticTacToeUI);
  });
});

describe("GAME_ENTRY_LOADERS", () => {
  it("loads, for every registered game, the entry of that very game", async () => {
    for (const [id, load] of Object.entries(GAME_ENTRY_LOADERS)) {
      const entry = await load();
      expect(entry.id).toBe(id);
      expect(entry.open((definition) => definition.id)).toBe(id);
    }
    expect(Object.keys(GAME_ENTRY_LOADERS).sort()).toEqual(GAMES.map((game) => game.id).sort());
  });

  it("refuses a key that loads another game's entry", () => {
    const caroEntry: GameEntry<"caro"> = {
      id: "caro",
      open: (visitor) => visitor(tictactoe, ticTacToeUI),
    };

    const loaders: GameEntryLoaders = {
      // @ts-expect-error -- the tictactoe key must load the tictactoe entry
      tictactoe: () => Promise.resolve(caroEntry),
      caro: GAME_ENTRY_LOADERS.caro,
    };
    expect(loaders).toBeDefined();
  });
});
