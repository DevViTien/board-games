"use client";

import { AI_LEVEL, type AiLevel } from "@board-games/engine";
import type { RegisteredGameId } from "@board-games/games";
import { ROOM_ERROR } from "@board-games/protocol";
import { Button, buttonVariants, Card, ConfirmDialog, RadioGroup } from "@board-games/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

import { parsePlayerName, readIdentity, saveName } from "@/features/identity/identity";
import { NameField } from "@/features/identity/NameField";
import { createRoom as createRoomOnServer } from "@/features/room/create-room";
import { resolveRealtimeUrl } from "@/lib/realtime-url";
import { useGamesInProgress } from "@/lib/use-games-in-progress";
import { seatsOf, useModeLabel } from "@/lib/use-mode-label";
import { savedGameStore } from "@/transport/indexeddb-store";
import {
  FIRST_PLAYER,
  type FirstPlayer,
  type SavedGameStore,
  type SavedGameSummary,
} from "@/transport/types";

import {
  DEFAULT_PLAY_SETUP,
  SETUP_MODE,
  type SetupChoice,
  type SetupMode,
  toPlaySetup,
  toStartUrl,
} from "./play-setup";
import { readSetupChoice, writeSetupChoice } from "./setup-preferences";

// The order the choices are offered in; every game can be played on one device and online.
const MODES: readonly SetupMode[] = [SETUP_MODE.Ai, SETUP_MODE.Local, SETUP_MODE.Online];
const MODES_WITHOUT_AI: readonly SetupMode[] = [SETUP_MODE.Local, SETUP_MODE.Online];
const LEVELS: readonly AiLevel[] = [AI_LEVEL.Easy, AI_LEVEL.Medium, AI_LEVEL.Hard];
const FIRST_PLAYERS: readonly FirstPlayer[] = [
  FIRST_PLAYER.Human,
  FIRST_PLAYER.Ai,
  FIRST_PLAYER.Random,
];

/** Why the last "Create room" failed, as the player is told. */
type CreateProblem = "failed" | "outdated";

function reloadPage(): void {
  window.location.reload();
}

/** The games of `gameId` among `games`; typed by string, so it still reads well with one game. */
function gamesOf(games: readonly SavedGameSummary[], gameId: string): readonly SavedGameSummary[] {
  return games.filter((game) => game.gameId === gameId);
}

interface SetupScreenProps {
  readonly gameId: RegisteredGameId;
  /** Whether the game can be played against the AI; otherwise that mode is not offered. */
  readonly supportsAI: boolean;
  /** The realtime server's address, or `null` for the page's own origin. */
  readonly realtimeUrl: string | null;
  /** Where games in progress are kept; a memory store in tests. */
  readonly store?: SavedGameStore;
  /** Creates an online room on the server; a fake in tests. */
  readonly createRoom?: typeof createRoomOnServer;
}

/**
 * `/play/<gameId>`: how to play (against the AI, on this device or online, the level, who moves
 * first) and the games of this game still in progress. "Start" opens the play screen with the new
 * game in its address; this screen never writes or deletes a saved game itself, so a saved game
 * that cannot be read is still never overwritten (the transport decides, see
 * `createLocalTransport`). "Create room" drops no game, so it neither waits for nor asks about the
 * games in progress.
 */
export function SetupScreen({
  gameId,
  supportsAI,
  realtimeUrl,
  store = savedGameStore,
  createRoom = createRoomOnServer,
}: SetupScreenProps) {
  const t = useTranslations("Setup");
  const tPlay = useTranslations("Play");
  const tGames = useTranslations("Games");
  const tLevels = useTranslations("Levels");
  const modeLabel = useModeLabel();
  const router = useRouter();
  const savedHeadingId = useId();
  const [choice, setChoice] = useState<SetupChoice>(
    supportsAI ? DEFAULT_PLAY_SETUP : { ...DEFAULT_PLAY_SETUP, mode: "local" },
  );
  const saved = useGamesInProgress(store);
  const ownGames = saved.status === "ready" ? gamesOf(saved.games, gameId) : [];
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState("");
  const [nameTried, setNameTried] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createProblem, setCreateProblem] = useState<CreateProblem | null>(null);
  // Checked by the click itself: two clicks before React re-renders still create one room.
  const creatingRef = useRef(false);
  // A room created after the player left this screen must not take them back to it.
  const mounted = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // The remembered choice and name live in browser storage, which the server cannot read: the
  // server renders the defaults, and the remembered ones are applied after mount, without a
  // hydration mismatch.
  useEffect(() => {
    const remembered = readSetupChoice(gameId, supportsAI);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount; reading it during render would not match the server's HTML
    if (remembered !== undefined) setChoice(remembered);
    setName(readIdentity()?.name ?? "");
  }, [gameId, supportsAI]);

  function begin(): void {
    const { mode } = choice;
    if (mode === SETUP_MODE.Online) return;
    writeSetupChoice(gameId, choice);
    router.push(toStartUrl(gameId, toPlaySetup({ ...choice, mode })));
  }

  async function createOnlineRoom(): Promise<void> {
    if (creatingRef.current) return;
    setNameTried(true);
    const parsed = parsePlayerName(name);
    if (parsed === null) {
      // Back to the field, so its error is read with it.
      nameInput.current?.focus();
      return;
    }
    creatingRef.current = true;
    setCreating(true);
    setCreateProblem(null);
    const created = await createRoom({
      url: resolveRealtimeUrl(realtimeUrl, window.location),
      gameId,
      identity: saveName(parsed),
    });
    if (!mounted.current) return;
    if (!created.ok) {
      creatingRef.current = false;
      setCreating(false);
      // Only a reload helps an app older than the server.
      setCreateProblem(created.error === ROOM_ERROR.OutdatedClient ? "outdated" : "failed");
      return;
    }
    // Kept locked while the room page opens.
    writeSetupChoice(gameId, choice);
    router.push(`/room/${created.code}`);
  }

  function requestStart(): void {
    if (saved.status === "loading") return;
    // A game of the chosen mode in progress would be dropped; if the list could not be read there
    // may be one, so ask then too.
    const mayDropGame =
      saved.status === "failed" || ownGames.some((game) => game.mode === choice.mode);
    if (mayDropGame) setConfirming(true);
    else begin();
  }

  const online = choice.mode === SETUP_MODE.Online;

  const update = (change: Partial<SetupChoice>) => {
    setChoice((current) => ({ ...current, ...change }));
  };

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{tGames(`${gameId}.name`)}</h1>
        <Link href="/" className={buttonVariants({ variant: "ghost" })}>
          {tPlay("backToMenu")}
        </Link>
      </header>

      <Card className="flex flex-col gap-6 p-6">
        <RadioGroup
          legend={t("mode")}
          options={(supportsAI ? MODES : MODES_WITHOUT_AI).map((mode) => ({
            value: mode,
            label: t(`modes.${mode}`),
          }))}
          value={choice.mode}
          onChange={(mode) => {
            update({ mode });
          }}
        />
        {choice.mode === "ai" && (
          <>
            <RadioGroup
              legend={t("level")}
              options={LEVELS.map((level) => ({ value: level, label: tLevels(level) }))}
              value={choice.level}
              onChange={(level) => {
                update({ level });
              }}
            />
            <RadioGroup
              legend={t("first")}
              options={FIRST_PLAYERS.map((first) => ({
                value: first,
                label: t(`firsts.${first}`),
              }))}
              value={choice.first}
              onChange={(first) => {
                update({ first });
              }}
            />
          </>
        )}
        {online && (
          <NameField
            ref={nameInput}
            value={name}
            onChange={setName}
            // Remembered as soon as it is valid, so a room the player is in shows the new name
            // the next time they open it.
            onCommit={saveName}
            showError={nameTried}
          />
        )}
        {online ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" aria-disabled={creating} onClick={() => void createOnlineRoom()}>
              {t("createRoom")}
            </Button>
            {/* Always there while online, so the progress is announced when it appears. */}
            <p role="status" className="text-sm text-fg-muted">
              {creating ? t("creating") : null}
            </p>
          </div>
        ) : (
          // Not pressable until the games in progress are known, so none is dropped unasked.
          <Button
            size="lg"
            className="self-start"
            aria-disabled={saved.status === "loading"}
            onClick={requestStart}
          >
            {t("start")}
          </Button>
        )}
        {online && createProblem === "failed" && (
          <p role="alert" className="text-sm text-danger">
            {t("createFailed")}
          </p>
        )}
        {online && createProblem === "outdated" && (
          <div role="alert" className="flex flex-col items-start gap-3">
            <p className="text-sm text-danger">{t("createOutdated")}</p>
            <Button variant="secondary" onClick={reloadPage}>
              {t("reload")}
            </Button>
          </div>
        )}
      </Card>

      {/* Below the choices: it appears once the saved games are read, and must not push the
          choices or "Start" away from under the player's finger. */}
      {ownGames.length > 0 && (
        <section aria-labelledby={savedHeadingId} className="flex flex-col gap-3">
          <h2 id={savedHeadingId} className="text-lg font-medium">
            {t("inProgress.title")}
          </h2>
          <ul className="flex flex-col gap-2">
            {ownGames.map((game) => {
              const label = modeLabel(seatsOf(game.settings));
              return (
                <li key={game.mode}>
                  <Card className="flex items-center justify-between gap-4 py-3">
                    <span>{label}</span>
                    {/* Named with the mode, so two "Continue" links never sound the same. */}
                    <Link
                      href={`/play/${gameId}/${game.mode}`}
                      aria-label={t("inProgress.continueLabel", { mode: label })}
                      className={buttonVariants({ variant: "secondary", size: "sm" })}
                    >
                      {t("inProgress.continue")}
                    </Link>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={confirming}
        title={t("confirm.title")}
        description={
          saved.status === "failed" ? t("confirm.descriptionUnknown") : t("confirm.description")
        }
        confirmLabel={t("confirm.confirm")}
        cancelLabel={t("confirm.cancel")}
        onConfirm={() => {
          setConfirming(false);
          begin();
        }}
        onCancel={() => {
          setConfirming(false);
        }}
      />
    </main>
  );
}
