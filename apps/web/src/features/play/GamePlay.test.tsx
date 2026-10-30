import { tictactoe } from "@board-games/games";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TicTacToeBoard } from "@/games/tictactoe/Board";
import { useTicTacToePlayerLabel } from "@/games/tictactoe/player-label";
import { renderWithIntl } from "@/test/render-with-intl";
import { createMemoryStore } from "@/transport/memory-store";

import { GamePlay } from "./GamePlay";

const ui = { Board: TicTacToeBoard, usePlayerLabel: useTicTacToePlayerLabel };

describe("GamePlay", () => {
  it("plays a game through a local transport and saves it to the given store", async () => {
    const store = createMemoryStore();
    renderWithIntl(<GamePlay gameId="tictactoe" definition={tictactoe} ui={ui} store={store} />);

    await userEvent.click(await screen.findByRole("button", { name: "Hàng 2, cột 2, trống" }));

    expect(screen.getByRole("button", { name: "Hàng 2, cột 2, X" })).toBeInTheDocument();
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(store.entries.get("tictactoe")).toMatchObject({ entries: [{ move: { cell: 4 } }] });
  });
});
