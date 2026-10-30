"use client";

import type { GameDefinition } from "@board-games/engine";
import type { RegisteredGameId } from "@board-games/games";
import { useEffect, useState } from "react";

import type { GameUI } from "@/games/types";
import { cryptoRng } from "@/lib/crypto-rng";
import { createLocalTransport } from "@/transport/local-transport";
import type { SavedGameStore, Transport } from "@/transport/types";

import { PlayLoading } from "./PlayLoading";
import { PlayScreen } from "./PlayScreen";

interface GamePlayProps<State, Move, Outcome, Options extends object> {
  readonly gameId: RegisteredGameId;
  readonly definition: GameDefinition<State, Move, Outcome, Options>;
  readonly ui: GameUI<State, Move, Outcome>;
  /** Where the game in progress is kept: IndexedDB in the app, a memory store in tests. */
  readonly store: SavedGameStore;
}

/**
 * Owns the transport of the game on screen; the place where M2 picks a transport by play mode. It
 * is created in an effect, not during render, so React's development double mount (mount,
 * dispose, mount) ends with a live transport.
 */
export function GamePlay<State, Move, Outcome, Options extends object>({
  gameId,
  definition,
  ui,
  store,
}: GamePlayProps<State, Move, Outcome, Options>) {
  const [transport, setTransport] = useState<Transport<State, Move, Outcome> | null>(null);

  useEffect(() => {
    const created = createLocalTransport({ definition, store, rng: cryptoRng });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the transport is an external resource with a lifecycle; it must be created and disposed by the effect
    setTransport(created);
    return () => {
      created.dispose();
    };
  }, [definition, store]);

  if (transport === null) return <PlayLoading />;
  return <PlayScreen gameId={gameId} transport={transport} ui={ui} />;
}
