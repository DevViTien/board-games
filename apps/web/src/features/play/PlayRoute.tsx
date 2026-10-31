"use client";

import type { RegisteredGameId } from "@board-games/games";
import { useSearchParams } from "next/navigation";
import { Suspense, use, useState } from "react";

import { readStartRequest } from "@/features/setup/play-setup";
import { savedGameStore } from "@/transport/indexeddb-store";
import type { AiPlayer, PlaySetup, SavedGameStore, SlotMode } from "@/transport/types";

import { loadGameEntry } from "./game-entry-loads";
import { GamePlay } from "./GamePlay";
import { PlayLoading } from "./PlayLoading";

interface PlayRouteProps {
  readonly gameId: RegisteredGameId;
  readonly mode: SlotMode;
  /** Where the game in progress is kept; a memory store in tests. */
  readonly store?: SavedGameStore;
  /** Creates the AI of a game against it; the Worker-backed one by default. */
  readonly createAiPlayer?: (() => AiPlayer) | undefined;
}

interface LoadedPlayProps extends Omit<PlayRouteProps, "store"> {
  readonly store: SavedGameStore;
  readonly start: PlaySetup | undefined;
  readonly onStarted: () => void;
}

function LoadedPlay({ gameId, mode, store, start, createAiPlayer, onStarted }: LoadedPlayProps) {
  const entry = use(loadGameEntry(gameId));
  return entry.open((definition, ui) => (
    <GamePlay
      gameId={entry.id}
      mode={mode}
      definition={definition}
      ui={ui}
      store={store}
      start={start}
      createAiPlayer={createAiPlayer}
      onStarted={onStarted}
    />
  ));
}

/**
 * Removes the query from the address, keeping the path and the hash, with the browser's own
 * `replaceState`, which Next.js syncs its router to without asking the server again.
 */
function forgetStartRequest(): void {
  if (window.location.search !== "") {
    window.history.replaceState(null, "", window.location.pathname + window.location.hash);
  }
}

/**
 * The client side of `/play/<gameId>/<mode>`. Only the id and mode cross the server/client boundary
 * (a game's rules are functions, which cannot), and only the opened game's board and rules are
 * loaded. Errors, such as a failed load, go to `app/play/[gameId]/[mode]/error.tsx`.
 *
 * A new game asked for by the setup screen arrives in the query (`?new=1&level=…`). It is read once,
 * on the first render, and removed from the address once the transport has been created with it:
 * Next.js syncs its router to `replaceState` without asking the server again, so the page's props
 * stay the same and the transport is not created again; a reload or Back then resumes the saved
 * game instead of starting yet another one. Not before: if loading the game's code fails, retrying
 * renders this route again from scratch, and must still find the request.
 */
export function PlayRoute({
  gameId,
  mode,
  store = savedGameStore,
  createAiPlayer,
}: PlayRouteProps) {
  const searchParams = useSearchParams();
  // Kept in state, so the re-render that follows the query's removal still passes the same setup.
  const [start] = useState(() => readStartRequest(searchParams, mode));

  return (
    <Suspense fallback={<PlayLoading />}>
      <LoadedPlay
        gameId={gameId}
        mode={mode}
        store={store}
        start={start}
        createAiPlayer={createAiPlayer}
        // A module function, so the same every render: `GamePlay` never creates its transport again.
        onStarted={forgetStartRequest}
      />
    </Suspense>
  );
}
