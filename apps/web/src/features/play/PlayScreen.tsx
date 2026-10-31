"use client";

import type { RegisteredGameId } from "@board-games/games";
import { Badge, Button, buttonVariants, ConfirmDialog } from "@board-games/ui";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import type { GameUI } from "@/games/types";
import { useModeLabel } from "@/lib/use-mode-label";
import type { ReadySnapshot, Transport } from "@/transport/types";

import { PlayLoading } from "./PlayLoading";
import { useTransportSnapshot } from "./use-transport";

export interface PlayScreenProps<State, Move, Outcome> {
  readonly gameId: RegisteredGameId;
  readonly transport: Transport<State, Move, Outcome>;
  readonly ui: GameUI<State, Move, Outcome>;
}

/**
 * The screen shared by every game: whose turn it is, the board, the result, undo/redo and a new
 * game. It only reads the transport's snapshot and sends requests, so it never decides who may
 * move or when the AI does. How turns and results are told follows the snapshot: "you" and "the
 * computer" when exactly one seat is a person here (`viewer`), the players' symbols otherwise.
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
  const moveLabel = ui.useMoveLabel();
  const modeLabel = useModeLabel();
  const [confirmingNewGame, setConfirmingNewGame] = useState(false);
  const { Board } = ui;

  if (snapshot.status === "loading") return <PlayLoading />;

  // The question is about dropping a game in progress: once there is none (the AI ended it), it no
  // longer applies. Adjusted during render, so the dialog never shows it for a finished game.
  if (confirmingNewGame && !snapshot.inProgress) setConfirmingNewGame(false);

  const hasAiSeat = snapshot.seats.some((seat) => seat.kind === "ai");

  function describeStatus({
    result,
    currentPlayer,
    viewer,
    seats,
    lastEntry,
    lastMover,
  }: ReadySnapshot<State, Move, Outcome>): string {
    // One person here: told as "you" and "the computer". M4 adds the online opponent's seat.
    if (viewer !== null) {
      if (result === null && currentPlayer === viewer) {
        // Where the AI just played, so a player who cannot see the board knows it too.
        if (lastEntry !== null && lastMover !== null && seats[lastMover]?.kind === "ai") {
          return t("aiMovedYourTurn", {
            move: moveLabel(lastEntry.move),
            player: playerLabel(viewer),
          });
        }
        return t("yourTurn", { player: playerLabel(viewer) });
      }
      if (result === null && seats[currentPlayer]?.kind === "ai") return t("aiThinking");
      if (result?.kind === "win" && result.winners.includes(viewer)) return t("youWin");
      if (
        result?.kind === "win" &&
        result.winners.every((winner) => seats[winner]?.kind === "ai")
      ) {
        return t("aiWins");
      }
    }
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
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{tGames(`${gameId}.name`)}</h1>
          {/* Against the AI, its level stays visible, also after a reload. */}
          {hasAiSeat && <Badge className="text-sm">{modeLabel(snapshot.seats)}</Badge>}
        </div>
        <Link href="/" className={buttonVariants({ variant: "ghost" })}>
          {t("backToMenu")}
        </Link>
      </header>

      <p role="status" aria-live="polite" className="text-lg font-medium">
        {describeStatus(snapshot)}
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
            // Only a game where a person here has a move in effect is worth asking about: not one
            // where only the AI has moved.
            if (snapshot.inProgress) setConfirmingNewGame(true);
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
