"use client";

import type { GameResult, PlayerIndex } from "@board-games/engine";
import type { RegisteredGameId } from "@board-games/games";
import { Button, buttonVariants, ConfirmDialog } from "@board-games/ui";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import type { GameUI } from "@/games/types";
import type { Transport } from "@/transport/types";

import { PlayLoading } from "./PlayLoading";
import { useTransportSnapshot } from "./use-transport";

export interface PlayScreenProps<State, Move, Outcome> {
  readonly gameId: RegisteredGameId;
  readonly transport: Transport<State, Move, Outcome>;
  readonly ui: GameUI<State, Move, Outcome>;
}

/**
 * The screen shared by every game: whose turn it is, the board, the result, undo/redo and a new
 * game. It only reads the transport's snapshot and sends requests, so it never knows whether the
 * opponent sits at this device, is an AI or plays online.
 */
export function PlayScreen<State, Move, Outcome>({
  gameId,
  transport,
  ui,
}: PlayScreenProps<State, Move, Outcome>) {
  const t = useTranslations("Play");
  const tGames = useTranslations("Games");
  const format = useFormatter();
  const snapshot = useTransportSnapshot(transport);
  const playerLabel = ui.usePlayerLabel();
  const [confirmingNewGame, setConfirmingNewGame] = useState(false);
  const { Board } = ui;

  if (snapshot.status === "loading") return <PlayLoading />;

  const inProgress = snapshot.moveCount > 0 && snapshot.result === null;

  function describeStatus(result: GameResult | null, currentPlayer: PlayerIndex): string {
    if (result === null) return t("turn", { player: playerLabel(currentPlayer) });
    if (result.kind === "draw") return t("draw");
    // Several winners are joined the way the language joins a list ("X và O", "X、O"), and the
    // count picks the verb form where the language has one ("X wins", "X and O win").
    return t("winner", {
      player: format.list(result.winners.map(playerLabel), { type: "conjunction" }),
      count: result.winners.length,
    });
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-8">
      <header className="flex w-full flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{tGames(`${gameId}.name`)}</h1>
        <Link href="/" className={buttonVariants({ variant: "ghost" })}>
          {t("backToMenu")}
        </Link>
      </header>

      <p role="status" aria-live="polite" className="text-lg font-medium">
        {describeStatus(snapshot.result, snapshot.currentPlayer)}
      </p>

      <Board
        state={snapshot.state}
        legalMoves={snapshot.legalMoves}
        onMove={transport.submit}
        disabled={!snapshot.canMove}
        result={snapshot.result}
        lastEntry={snapshot.lastEntry}
        viewer={snapshot.viewer}
      />

      {/* `aria-disabled`, not `disabled`: undoing the last move with the keyboard would otherwise
          disable the focused button and drop focus to the page body. */}
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          variant="secondary"
          aria-disabled={!snapshot.canUndo}
          onClick={transport.requestUndo}
        >
          {t("undo")}
        </Button>
        <Button
          variant="secondary"
          aria-disabled={!snapshot.canRedo}
          onClick={transport.requestRedo}
        >
          {t("redo")}
        </Button>
        <Button
          onClick={() => {
            if (inProgress) setConfirmingNewGame(true);
            else transport.requestNewGame();
          }}
        >
          {t("newGame")}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmingNewGame}
        title={t("confirmNewGame.title")}
        description={t("confirmNewGame.description")}
        confirmLabel={t("confirmNewGame.confirm")}
        cancelLabel={t("confirmNewGame.cancel")}
        onConfirm={() => {
          setConfirmingNewGame(false);
          transport.requestNewGame();
        }}
        onCancel={() => {
          setConfirmingNewGame(false);
        }}
      />
    </main>
  );
}
