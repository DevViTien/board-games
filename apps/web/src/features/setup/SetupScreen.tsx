"use client";

import { AI_LEVEL, type AiLevel } from "@board-games/engine";
import type { RegisteredGameId } from "@board-games/games";
import { Button, buttonVariants, Card, ConfirmDialog, RadioGroup } from "@board-games/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";

import { useGamesInProgress } from "@/lib/use-games-in-progress";
import { seatsOf, useModeLabel } from "@/lib/use-mode-label";
import { savedGameStore } from "@/transport/indexeddb-store";
import {
  FIRST_PLAYER,
  type FirstPlayer,
  type SavedGameStore,
  type SavedGameSummary,
  SLOT_MODE,
  type SlotMode,
} from "@/transport/types";

import { DEFAULT_PLAY_SETUP, type SetupChoice, toPlaySetup, toStartUrl } from "./play-setup";
import { readSetupChoice, writeSetupChoice } from "./setup-preferences";

// The order the choices are offered in.
const MODES: readonly SlotMode[] = [SLOT_MODE.Ai, SLOT_MODE.Local];
const LEVELS: readonly AiLevel[] = [AI_LEVEL.Easy, AI_LEVEL.Medium, AI_LEVEL.Hard];
const FIRST_PLAYERS: readonly FirstPlayer[] = [
  FIRST_PLAYER.Human,
  FIRST_PLAYER.Ai,
  FIRST_PLAYER.Random,
];

/** The games of `gameId` among `games`; typed by string, so it still reads well with one game. */
function gamesOf(games: readonly SavedGameSummary[], gameId: string): readonly SavedGameSummary[] {
  return games.filter((game) => game.gameId === gameId);
}

interface SetupScreenProps {
  readonly gameId: RegisteredGameId;
  /** Whether the game can be played against the AI; otherwise only the same-device mode is offered. */
  readonly supportsAI: boolean;
  /** Where games in progress are kept; a memory store in tests. */
  readonly store?: SavedGameStore;
}

/**
 * `/play/<gameId>`: how to play (against the AI or on this device, the level, who moves first) and
 * the games of this game still in progress. "Start" opens the play screen with the new game in its
 * address; this screen never writes or deletes a saved game itself, so a saved game that cannot be
 * read is still never overwritten (the transport decides, see `createLocalTransport`).
 */
export function SetupScreen({ gameId, supportsAI, store = savedGameStore }: SetupScreenProps) {
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

  // The remembered choice lives in browser storage, which the server cannot read: the server
  // renders the defaults, and the remembered choice is applied after mount, without a hydration
  // mismatch.
  useEffect(() => {
    const remembered = readSetupChoice(gameId, supportsAI);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount; reading it during render would not match the server's HTML
    if (remembered !== undefined) setChoice(remembered);
  }, [gameId, supportsAI]);

  function begin(): void {
    writeSetupChoice(gameId, choice);
    router.push(toStartUrl(gameId, toPlaySetup(choice)));
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
        {supportsAI && (
          <RadioGroup
            legend={t("mode")}
            options={MODES.map((mode) => ({ value: mode, label: t(`modes.${mode}`) }))}
            value={choice.mode}
            onChange={(mode) => {
              update({ mode });
            }}
          />
        )}
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
        {/* Not pressable until the games in progress are known, so none is dropped unasked. */}
        <Button
          size="lg"
          className="self-start"
          aria-disabled={saved.status === "loading"}
          onClick={requestStart}
        >
          {t("start")}
        </Button>
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
