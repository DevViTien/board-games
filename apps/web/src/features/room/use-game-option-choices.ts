import { listOptionChoices, type OptionChoiceList } from "@board-games/engine";
import type { RegisteredGameId } from "@board-games/games/ids";
import { useEffect, useState } from "react";

import { loadGameEntry } from "@/features/play/game-entry-loads";

const NO_OPTION_CHOICES: readonly OptionChoiceList[] = [];

interface Loaded {
  readonly gameId: RegisteredGameId;
  readonly choices: readonly OptionChoiceList[];
}

/**
 * The rule options of `gameId`, read from its code once loaded (the same load as its play screen's,
 * which it starts early), or none until then, for a game without any, and when the load fails: the
 * room page then shows its error once the game itself needs the code. This keeps every game's
 * rules and AI out of the room page's own bundle, at the cost of the lobby naming the rules a
 * moment after it shows.
 */
export function useGameOptionChoices(gameId: RegisteredGameId | null): readonly OptionChoiceList[] {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (gameId === null) return undefined;
    let active = true;
    loadGameEntry(gameId).then(
      (entry) => {
        if (active) {
          setLoaded({ gameId, choices: entry.open((definition) => listOptionChoices(definition)) });
        }
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [gameId]);

  return loaded !== null && loaded.gameId === gameId ? loaded.choices : NO_OPTION_CHOICES;
}
