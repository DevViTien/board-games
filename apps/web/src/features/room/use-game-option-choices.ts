import { listOptionChoices, type OptionChoiceList } from "@board-games/engine";
import type { RegisteredGameId } from "@board-games/games/ids";
import { useEffect, useState } from "react";

import { loadGameEntry } from "@/features/play/game-entry-loads";

const NO_OPTION_CHOICES: readonly OptionChoiceList[] = [];

/** What the lobby reads from a game's code. */
interface GameLobbyInfo {
  /** The rule options the game offers, to name the room's rules. */
  readonly choices: readonly OptionChoiceList[];
  /** Whether the game has an AI, so the host may give it empty seats. */
  readonly supportsAI: boolean;
}

const NOT_LOADED: GameLobbyInfo = { choices: NO_OPTION_CHOICES, supportsAI: false };

interface Loaded extends GameLobbyInfo {
  readonly gameId: RegisteredGameId;
}

/**
 * The rule options of `gameId` and whether it has an AI, read from its code once loaded (the same
 * load as its play screen's, which it starts early); no options and no AI until then, and when the
 * load fails: the room page then shows its error once the game itself needs the code. This keeps
 * every game's rules and AI out of the room page's own bundle, at the cost of the lobby naming the
 * rules and offering AI seats a moment after it shows.
 */
export function useGameOptionChoices(gameId: RegisteredGameId | null): GameLobbyInfo {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (gameId === null) return undefined;
    let active = true;
    loadGameEntry(gameId).then(
      (entry) => {
        if (active) {
          setLoaded(
            entry.open((definition) => ({
              gameId,
              choices: listOptionChoices(definition),
              supportsAI: definition.meta.supportsAI,
            })),
          );
        }
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [gameId]);

  return loaded !== null && loaded.gameId === gameId ? loaded : NOT_LOADED;
}
