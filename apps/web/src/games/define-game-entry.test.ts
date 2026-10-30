import { tictactoe } from "@board-games/games";
import type { ComponentType } from "react";
import { describe, expect, expectTypeOf, it } from "vitest";

import { defineGameEntry } from "./define-game-entry";
import { GAME_ENTRY_LOADERS, type GameEntryLoaders } from "./registry";
import { TicTacToeBoard } from "./tictactoe/Board";
import { useTicTacToePlayerLabel } from "./tictactoe/player-label";
import type { BoardProps, GameEntry } from "./types";

const ticTacToeUI = { Board: TicTacToeBoard, usePlayerLabel: useTicTacToePlayerLabel };

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
    defineGameEntry(tictactoe, { Board: ChessLikeBoard, usePlayerLabel: useTicTacToePlayerLabel });
  });

  it("refuses a game that is not registered", () => {
    // @ts-expect-error -- "caro" is not a RegisteredGameId until its rules are in GAMES
    defineGameEntry({ ...tictactoe, id: "caro" as const }, ticTacToeUI);
  });
});

describe("GAME_ENTRY_LOADERS", () => {
  it("refuses a key that loads another game's entry", () => {
    const caroEntry: GameEntry<"caro"> = {
      id: "caro",
      open: (visitor) => visitor(tictactoe, ticTacToeUI),
    };

    // @ts-expect-error -- the tictactoe key must load the tictactoe entry
    const loaders: GameEntryLoaders = { tictactoe: () => Promise.resolve(caroEntry) };
    expect(loaders).toBeDefined();
  });
});
