import { createRng } from "@board-games/engine";
import { isRegisteredGameId } from "@board-games/games";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GAME_ENTRY_LOADERS } from "@/games/registry";
import { renderWithIntl } from "@/test/render-with-intl";
import { createLocalTransport } from "@/transport/local-transport";
import { createMemoryStore } from "@/transport/memory-store";

import { PlayScreen } from "./PlayScreen";

// Every board must call the play screen's `layout` (games/types.ts `BoardLayout`): the turn line,
// the connection line and the game's buttons are in it. A board that forgot it would hide them.

const GAME_IDS = Object.keys(GAME_ENTRY_LOADERS).filter(isRegisteredGameId);

describe.each(GAME_IDS)("the play screen of %s", (gameId) => {
  it("shows the board's parts with the turn line and the game's buttons around them", async () => {
    const entry = await GAME_ENTRY_LOADERS[gameId]();
    entry.open((definition, ui) => {
      const transport = createLocalTransport({
        definition,
        store: createMemoryStore(),
        rng: createRng(1),
      });
      renderWithIntl(<PlayScreen gameId={gameId} transport={transport} ui={ui} />);
    });

    // Once the saved game (none) is read: the play screen, not its loading state.
    expect(await screen.findByRole("button", { name: "Ván mới" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("data-game", gameId);
    expect(screen.getByRole("status")).toHaveTextContent(/^Đến lượt /);
    expect(screen.getByRole("button", { name: "Hoàn tác" })).toBeInTheDocument();
  });
});
