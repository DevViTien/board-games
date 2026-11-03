"use client";

import type { GameDefinition } from "@board-games/engine";
import { isRegisteredGameId, type RegisteredGameId } from "@board-games/games";
import { Button, buttonVariants, Card } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Suspense,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  type Identity,
  parsePlayerName,
  readIdentity,
  saveName,
} from "@/features/identity/identity";
import { NameField } from "@/features/identity/NameField";
import { loadGameEntry } from "@/features/play/game-entry-loads";
import { PlayLoading } from "@/features/play/PlayLoading";
import { PlayScreen } from "@/features/play/PlayScreen";
import type { GameUI } from "@/games/types";
import { resolveRealtimeUrl } from "@/lib/realtime-url";
import { createOnlineTransport, type OnlineTransport } from "@/transport/online-transport";
import {
  type ConnectionEnvironment,
  createRoomConnection,
  type RoomConnection,
} from "@/transport/room-connection";
import type { OpenSocket } from "@/transport/socket";
import { CONNECTION_STATUS } from "@/transport/types";

import { ROOM_PROBLEM, RoomError, roomProblemOf } from "./RoomError";
import { RoomLobby } from "./RoomLobby";

interface RoomRouteProps {
  /** In canonical form. */
  readonly code: string;
  /** The realtime server's address, or `null` for the page's own origin. */
  readonly realtimeUrl: string | null;
  /** Opens the connection's sockets; a fake one in tests. */
  readonly openSocket?: OpenSocket | undefined;
  /** The page as the connection sees it; a fake one in tests. */
  readonly environment?: ConnectionEnvironment | undefined;
}

/**
 * The client side of `/room/<code>`: asks for a name the first time, then enters the room and
 * shows, in turn, "joining", the lobby while seats are free or the player has none, and the shared
 * play screen once everyone is seated. "Try again" opens the room from scratch (a new key, so a
 * new connection).
 */
export function RoomRoute({ code, realtimeUrl, openSocket, environment }: RoomRouteProps) {
  // `undefined` until read: the identity lives in browser storage, which the server cannot see.
  const [identity, setIdentity] = useState<Identity | null | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount; reading it during render would not match the server's HTML
    setIdentity(readIdentity());
  }, []);

  if (identity === undefined) return <RoomJoining slow={false} />;
  if (identity === null) return <NameStep onDone={setIdentity} />;
  return (
    <RoomSession
      key={attempt}
      code={code}
      realtimeUrl={realtimeUrl}
      identity={identity}
      openSocket={openSocket}
      environment={environment}
      onIdentityChange={setIdentity}
      onRetry={() => {
        setAttempt((current) => current + 1);
      }}
    />
  );
}

/** The first visit: a name before entering, checked like the server does. */
function NameStep({ onDone }: { readonly onDone: (identity: Identity) => void }) {
  const t = useTranslations("Room");
  const [draft, setDraft] = useState("");
  const [tried, setTried] = useState(false);
  const field = useRef<HTMLInputElement>(null);

  // The page is only this question: the field takes the focus, as the first thing to do.
  useEffect(() => {
    field.current?.focus();
  }, []);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t("nameTitle")}</h1>
      <Card className="p-6">
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setTried(true);
            const name = parsePlayerName(draft);
            // Back to the field, so its error is read with it.
            if (name === null) field.current?.focus();
            else onDone(saveName(name));
          }}
        >
          <NameField ref={field} value={draft} onChange={setDraft} showError={tried} />
          <p className="text-sm text-fg-muted">{t("nameHint")}</p>
          <Button type="submit" size="lg" className="self-start">
            {t("continue")}
          </Button>
        </form>
      </Card>
    </main>
  );
}

/** Until the first room arrives; after 10 s it says the server cannot be reached, still trying. */
function RoomJoining({ slow }: { readonly slow: boolean }) {
  const t = useTranslations("Room");
  const tPlay = useTranslations("Play");

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-16 text-center">
      <p role="status" className="text-fg-muted">
        {slow ? t("slow") : t("joining")}
      </p>
      {slow && (
        <Link href="/" className={buttonVariants({ variant: "secondary" })}>
          {tPlay("backToMenu")}
        </Link>
      )}
    </main>
  );
}

interface RoomSessionProps extends RoomRouteProps {
  readonly identity: Identity;
  /** The player chose another name in the lobby, now remembered. */
  readonly onIdentityChange: (identity: Identity) => void;
  readonly onRetry: () => void;
}

/**
 * Owns the room's connection. It is created in an effect, like the play screen's transport, so
 * React's development double mount ends with one live connection. A name changed meanwhile does
 * not recreate it: the connection reads the remembered identity at each greeting. When the room
 * cannot be shown (a game this app does not have, a record that cannot be replayed), the
 * connection is stopped for good, until "Try again".
 */
function RoomSession({
  code,
  realtimeUrl,
  identity,
  openSocket,
  environment,
  onIdentityChange,
  onRetry,
}: RoomSessionProps) {
  const [connection, setConnection] = useState<RoomConnection | null>(null);
  const [broken, setBroken] = useState(false);
  // For a greeting after the browser's storage was cleared meanwhile: the identity of this page.
  const latestIdentity = useRef(identity);

  useEffect(() => {
    latestIdentity.current = identity;
  }, [identity]);

  useEffect(() => {
    const created = createRoomConnection({
      url: resolveRealtimeUrl(realtimeUrl, window.location),
      code,
      // The name remembered now, so one changed in the lobby or in another tab is not reverted.
      getIdentity: () => readIdentity() ?? latestIdentity.current,
      openSocket,
      environment,
    });
    setConnection(created);
    return () => {
      created.dispose();
    };
  }, [code, realtimeUrl, openSocket, environment]);

  useEffect(() => {
    if (broken) connection?.dispose();
  }, [broken, connection]);

  const markBroken = useCallback(() => {
    setBroken(true);
  }, []);

  if (broken) return <RoomError problem={ROOM_PROBLEM.Broken} onRetry={onRetry} />;
  if (connection === null) return <RoomJoining slow={false} />;
  return (
    <RoomContent
      connection={connection}
      name={identity.name}
      onSit={(chosen) => {
        // Remembered as well: the name the player just chose is the one they want next time.
        onIdentityChange(saveName(chosen));
        return connection.send({ type: "sit", name: chosen });
      }}
      onBroken={markBroken}
      onRetry={onRetry}
    />
  );
}

interface RoomContentProps {
  readonly connection: RoomConnection;
  /** The name offered in the lobby before "Join game". */
  readonly name: string;
  /** Asks for a seat under `name`; `false` when it could not be sent. */
  readonly onSit: (name: string) => boolean;
  /** The room cannot be shown: the page stops the connection. */
  readonly onBroken: () => void;
  readonly onRetry: () => void;
}

function RoomContent({ connection, name, onSit, onBroken, onRetry }: RoomContentProps) {
  const snapshot = useSyncExternalStore(
    connection.subscribe,
    connection.getSnapshot,
    connection.getSnapshot,
  );
  const { status, room, you } = snapshot;
  const unknownGame = room !== null && !isRegisteredGameId(room.gameId);
  // Once the lobby was shown, the game that replaces it takes the focus its button had.
  const [wasInLobby, setWasInLobby] = useState(false);

  useEffect(() => {
    if (unknownGame) onBroken();
  }, [unknownGame, onBroken]);

  // Gave up: the room is gone, every seat is taken by others, or this app is older than the server.
  if (status === CONNECTION_STATUS.Failed) {
    return <RoomError problem={roomProblemOf(snapshot.failure)} onRetry={onRetry} />;
  }
  if (room === null) return <RoomJoining slow={snapshot.slow} />;
  if (!isRegisteredGameId(room.gameId)) {
    return <RoomError problem={ROOM_PROBLEM.Broken} onRetry={onRetry} />;
  }
  if (you === null || room.seats.some((seat) => seat === null)) {
    if (!wasInLobby) setWasInLobby(true);
    return (
      <RoomLobby
        gameId={room.gameId}
        room={room}
        you={you}
        status={status}
        name={name}
        onSit={onSit}
        onResume={connection.resume}
      />
    );
  }
  return (
    <Suspense fallback={<PlayLoading />}>
      <RoomGame
        gameId={room.gameId}
        connection={connection}
        focusTitle={wasInLobby}
        onBroken={onBroken}
        onRetry={onRetry}
      />
    </Suspense>
  );
}

interface RoomGameProps {
  readonly gameId: RegisteredGameId;
  readonly connection: RoomConnection;
  /** The game replaces the lobby: its title takes the focus. */
  readonly focusTitle: boolean;
  readonly onBroken: () => void;
  readonly onRetry: () => void;
}

/** Loads the game's code (a failed load goes to the route's error page), then plays it online. */
function RoomGame({ gameId, ...rest }: RoomGameProps) {
  const entry = use(loadGameEntry(gameId));
  return entry.open((definition, ui) => (
    <OnlineGame gameId={entry.id} definition={definition} ui={ui} {...rest} />
  ));
}

interface OnlineGameProps<State, Move, Outcome, Options extends object> extends RoomGameProps {
  readonly definition: GameDefinition<State, Move, Outcome, Options>;
  readonly ui: GameUI<State, Move, Outcome>;
}

/** Owns the online transport, created in an effect like the room's connection. */
function OnlineGame<State, Move, Outcome, Options extends object>({
  definition,
  connection,
  ...rest
}: OnlineGameProps<State, Move, Outcome, Options>) {
  const [transport, setTransport] = useState<OnlineTransport<State, Move, Outcome> | null>(null);

  useEffect(() => {
    const created = createOnlineTransport({ definition, connection });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the transport is an external resource with a lifecycle; it must be created and disposed by the effect
    setTransport(created);
    return () => {
      created.dispose();
    };
  }, [definition, connection]);

  if (transport === null) return <PlayLoading />;
  return <OnlineGameScreen transport={transport} onResume={connection.resume} {...rest} />;
}

interface OnlineGameScreenProps<State, Move, Outcome> {
  readonly gameId: RegisteredGameId;
  readonly transport: OnlineTransport<State, Move, Outcome>;
  readonly ui: GameUI<State, Move, Outcome>;
  readonly focusTitle: boolean;
  readonly onResume: () => void;
  readonly onBroken: () => void;
  readonly onRetry: () => void;
}

/** The play screen, or the error page once the room cannot be rebuilt into a game. */
function OnlineGameScreen<State, Move, Outcome>({
  gameId,
  transport,
  ui,
  focusTitle,
  onResume,
  onBroken,
  onRetry,
}: OnlineGameScreenProps<State, Move, Outcome>) {
  const broken = useSyncExternalStore(transport.subscribe, transport.isBroken, transport.isBroken);

  useEffect(() => {
    if (broken) onBroken();
  }, [broken, onBroken]);

  if (broken) return <RoomError problem={ROOM_PROBLEM.Broken} onRetry={onRetry} />;
  return (
    <PlayScreen
      gameId={gameId}
      transport={transport}
      ui={ui}
      onResume={onResume}
      focusTitle={focusTitle}
    />
  );
}
