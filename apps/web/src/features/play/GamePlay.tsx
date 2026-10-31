"use client";

import type { GameDefinition } from "@board-games/engine";
import type { RegisteredGameId } from "@board-games/games";
import { useEffect, useState } from "react";

import { createWorkerAiPlayer } from "@/ai-worker/ai-player";
import { DEFAULT_PLAY_SETUP } from "@/features/setup/play-setup";
import { readSetupChoice } from "@/features/setup/setup-preferences";
import type { GameUI } from "@/games/types";
import { cryptoRng } from "@/lib/crypto-rng";
import { createLocalTransport } from "@/transport/local-transport";
import type { AiPlayer, PlaySetup, SavedGameStore, SlotMode, Transport } from "@/transport/types";

import { PlayLoading } from "./PlayLoading";
import { PlayScreen } from "./PlayScreen";

interface GamePlayProps<State, Move, Outcome, Options extends object> {
  readonly gameId: RegisteredGameId;
  readonly mode: SlotMode;
  readonly definition: GameDefinition<State, Move, Outcome, Options>;
  readonly ui: GameUI<State, Move, Outcome>;
  /** Where the game in progress is kept: IndexedDB in the app, a memory store in tests. */
  readonly store: SavedGameStore;
  /** A new game to start in place of the saved one; a setup of another mode is ignored. */
  readonly start?: PlaySetup | undefined;
  /** Creates the AI of a game against it: in a Web Worker in the app, inline in tests. */
  readonly createAiPlayer?: (() => AiPlayer) | undefined;
  /** Called once the transport has been created with `start`; keep it stable. */
  readonly onStarted?: (() => void) | undefined;
}

const startWorkerAiPlayer = (): AiPlayer => createWorkerAiPlayer();

/**
 * Owns the transport of the game on screen, set up for the mode: every seat a person here, or the
 * player against the AI. It is created in an effect, not during render, so React's development
 * double mount (mount, dispose, mount) ends with a live transport, and the last choices made on
 * the setup screen (browser storage, unknown to the server) are read only after mount.
 */
export function GamePlay<State, Move, Outcome, Options extends object>({
  gameId,
  mode,
  definition,
  ui,
  store,
  start,
  createAiPlayer = startWorkerAiPlayer,
  onStarted,
}: GamePlayProps<State, Move, Outcome, Options>) {
  const [transport, setTransport] = useState<Transport<State, Move, Outcome> | null>(null);

  useEffect(() => {
    let ai: AiPlayer | undefined;
    let created: Transport<State, Move, Outcome>;
    if (mode === "ai") {
      ai = createAiPlayer();
      // Without a saved game, a game is set up like the last one started from the setup screen.
      const remembered = readSetupChoice(gameId, definition.meta.supportsAI);
      created = createLocalTransport({
        definition,
        store,
        rng: cryptoRng,
        mode,
        start: start?.mode === "ai" ? start : undefined,
        fallback: {
          mode,
          level: remembered?.level ?? DEFAULT_PLAY_SETUP.level,
          first: remembered?.first ?? DEFAULT_PLAY_SETUP.first,
        },
        ai,
      });
    } else {
      created = createLocalTransport({
        definition,
        store,
        rng: cryptoRng,
        start: start?.mode === "local" ? start : undefined,
      });
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the transport is an external resource with a lifecycle; it must be created and disposed by the effect
    setTransport(created);
    onStarted?.();
    return () => {
      created.dispose();
      ai?.dispose();
    };
  }, [gameId, mode, definition, store, start, createAiPlayer, onStarted]);

  if (transport === null) return <PlayLoading />;
  return <PlayScreen gameId={gameId} transport={transport} ui={ui} />;
}
