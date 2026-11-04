"use client";

import { type GameDefinition, listOptionChoices, type OptionChoiceList } from "@board-games/engine";
import { isRegisteredGameId, type RegisteredGameId } from "@board-games/games/ids";
import { buttonVariants } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Suspense,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  guestPlayerId,
  pinRoomIdentity,
  readIdentity,
  readRoomIdentity,
  saveName,
} from "@/features/identity/identity";
import { loadGameEntry } from "@/features/play/game-entry-loads";
import { PlayLoading } from "@/features/play/PlayLoading";
import { PlayScreen } from "@/features/play/PlayScreen";
import { AppStateScreen } from "@/features/shell/AppStateScreen";
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

import { ROOM_PROBLEM, roomProblemOf } from "./room-problem";
import { RoomError } from "./RoomError";
import { RoomLobby } from "./RoomLobby";
import { useGameOptionChoices } from "./use-game-option-choices";

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
 * Who this room page is, pinned when it opens: the identity this tab sat under in this room before
 * a reload, else the remembered identity, else a guest id remembered nowhere with no name yet.
 * Every greeting, sit and reconnection of the page uses this id, even once another tab remembered
 * another one (design §4 of `ask-name-in-lobby`).
 */
interface RoomPageIdentity {
  readonly playerId: string;
  /** Remembered when the page opened, or chosen in the lobby since; `null` until then. */
  readonly name: string | null;
}

/**
 * The client side of `/room/<code>`: enters the room at once, with the remembered identity or,
 * the first time, without a name, so a room that does not exist or has no seat left is said before
 * anything is asked. Then shows, in turn, "joining", the lobby (which asks for the name when there
 * is none) while seats are free or the player has none, and the shared play screen once everyone
 * is seated. "Try again" opens the room from scratch (a new key, so a new connection) under the
 * same id.
 */
export function RoomRoute({ code, realtimeUrl, openSocket, environment }: RoomRouteProps) {
  // `undefined` until read: the identity lives in browser storage, which the server cannot see.
  const [identity, setIdentity] = useState<RoomPageIdentity | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount; reading it during render would not match the server's HTML
    setIdentity(openingIdentity(code));
  }, [code]);

  if (identity === undefined) return <RoomJoining slow={false} />;
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

/** Who the room page of `code` is when it opens (`RoomPageIdentity`). */
function openingIdentity(code: string): RoomPageIdentity {
  const remembered = readIdentity();
  const pinned = readRoomIdentity(code);
  if (pinned === null) return remembered ?? { playerId: guestPlayerId(), name: null };
  // The same id remembered: its name may have changed since, on the setup screen.
  return remembered?.playerId === pinned.playerId ? remembered : pinned;
}

/** Until the first room arrives; after 10 s it says the server cannot be reached, still trying. */
function RoomJoining({ slow }: { readonly slow: boolean }) {
  const t = useTranslations("Room");
  const tPlay = useTranslations("Play");

  return (
    <AppStateScreen title={slow ? t("slow") : t("joining")} busy>
      {slow ? (
        <Link href="/" className={buttonVariants({ variant: "secondary" })}>
          {tPlay("backToMenu")}
        </Link>
      ) : undefined}
    </AppStateScreen>
  );
}

interface RoomSessionProps extends RoomRouteProps {
  readonly identity: RoomPageIdentity;
  /** The player chose a name in the lobby, remembered when no other tab holds another id. */
  readonly onIdentityChange: (identity: RoomPageIdentity) => void;
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
  // The page's id and the name it last chose, read at each greeting.
  const latestIdentity = useRef(identity);

  useEffect(() => {
    latestIdentity.current = identity;
  }, [identity]);

  useEffect(() => {
    const created = createRoomConnection({
      url: resolveRealtimeUrl(realtimeUrl, window.location),
      code,
      getIdentity: () => {
        const { playerId, name } = latestIdentity.current;
        // The name remembered now, so one changed in another tab (the setup screen) is not
        // reverted; but only that of this page's id. Without one, the name chosen in this lobby,
        // or none yet.
        const remembered = readIdentity();
        return { playerId, name: remembered?.playerId === playerId ? remembered.name : name };
      },
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

  if (broken) return <RoomError problem={ROOM_PROBLEM.Broken} onRetry={onRetry} focusTitle />;
  if (connection === null) return <RoomJoining slow={false} />;
  return (
    <RoomContent
      connection={connection}
      name={identity.name ?? ""}
      onSit={(chosen) => {
        // Remembered as well: the name the player just chose is the one they want next time.
        const chosenIdentity = saveName(chosen, identity.playerId);
        // This tab sits under this id: a reload greets with it, whatever is remembered by then.
        pinRoomIdentity(code, chosenIdentity);
        // Read by the next greeting at once, before React renders again.
        latestIdentity.current = chosenIdentity;
        onIdentityChange(chosenIdentity);
        return connection.send({ type: "sit", name: chosen });
      }}
      onBroken={markBroken}
      onRetry={onRetry}
    />
  );
}

interface RoomContentProps {
  readonly connection: RoomConnection;
  /** The name offered in the lobby before "Join game"; empty when the player has none yet. */
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
  // The lobby names the room's rules, and offers AI seats, from the game's code, loaded meanwhile
  // for the game itself.
  const { choices: optionChoices, supportsAI } = useGameOptionChoices(
    room !== null && isRegisteredGameId(room.gameId) ? room.gameId : null,
  );
  // Once the lobby was shown, the game that replaces it takes the focus its button had.
  const [wasInLobby, setWasInLobby] = useState(false);
  // The lobby's buttons stop waiting once the server refuses an AI seat: the room shows why.
  const [aiSeatRefusals, setAiSeatRefusals] = useState(0);

  useEffect(
    () =>
      connection.onRejected(({ request }) => {
        if (request === "ai-seat") setAiSeatRefusals((count) => count + 1);
      }),
    [connection],
  );

  useEffect(() => {
    if (unknownGame) onBroken();
  }, [unknownGame, onBroken]);

  // Gave up: the room is gone, every seat is taken by others, or this app is older than the server.
  if (status === CONNECTION_STATUS.Failed) {
    return <RoomError problem={roomProblemOf(snapshot.failure)} onRetry={onRetry} focusTitle />;
  }
  if (room === null) return <RoomJoining slow={snapshot.slow} />;
  if (!isRegisteredGameId(room.gameId)) {
    return <RoomError problem={ROOM_PROBLEM.Broken} onRetry={onRetry} focusTitle />;
  }
  if (you === null || room.seats.some((seat) => seat === null)) {
    if (!wasInLobby) setWasInLobby(true);
    return (
      <RoomLobby
        gameId={room.gameId}
        room={room}
        optionChoices={optionChoices}
        supportsAI={supportsAI}
        you={you}
        status={status}
        name={name}
        onSit={onSit}
        onAiSeat={(seat, on) => connection.send({ type: "ai-seat", seat, on })}
        aiSeatRefusals={aiSeatRefusals}
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
  // The same list on every render, so the play screen does not see new choices each time.
  const optionChoices = useMemo(() => listOptionChoices(definition), [definition]);

  useEffect(() => {
    const created = createOnlineTransport({ definition, connection });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the transport is an external resource with a lifecycle; it must be created and disposed by the effect
    setTransport(created);
    return () => {
      created.dispose();
    };
  }, [definition, connection]);

  if (transport === null) return <PlayLoading />;
  return (
    <OnlineGameScreen
      transport={transport}
      optionChoices={optionChoices}
      onResume={connection.resume}
      {...rest}
    />
  );
}

interface OnlineGameScreenProps<State, Move, Outcome> {
  readonly gameId: RegisteredGameId;
  readonly transport: OnlineTransport<State, Move, Outcome>;
  readonly ui: GameUI<State, Move, Outcome>;
  readonly optionChoices: readonly OptionChoiceList[];
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
  optionChoices,
  focusTitle,
  onResume,
  onBroken,
  onRetry,
}: OnlineGameScreenProps<State, Move, Outcome>) {
  const broken = useSyncExternalStore(transport.subscribe, transport.isBroken, transport.isBroken);

  useEffect(() => {
    if (broken) onBroken();
  }, [broken, onBroken]);

  if (broken) return <RoomError problem={ROOM_PROBLEM.Broken} onRetry={onRetry} focusTitle />;
  return (
    <PlayScreen
      gameId={gameId}
      transport={transport}
      ui={ui}
      optionChoices={optionChoices}
      onResume={onResume}
      focusTitle={focusTitle}
    />
  );
}
