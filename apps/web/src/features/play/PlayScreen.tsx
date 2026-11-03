"use client";

import type { OptionChoiceList, PlayerIndex } from "@board-games/engine";
import type { RegisteredGameId } from "@board-games/games";
import { Badge, Button, buttonVariants, ConfirmDialog } from "@board-games/ui";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import type { GameUI } from "@/games/types";
import { useModeLabel } from "@/lib/use-mode-label";
import { useOptionLabels } from "@/lib/use-option-labels";
import type { ReadySnapshot, Transport } from "@/transport/types";

import { ConnectionNotice } from "./ConnectionNotice";
import { PlayLoading } from "./PlayLoading";
import { useTransportSnapshot } from "./use-transport";

export interface PlayScreenProps<State, Move, Outcome> {
  readonly gameId: RegisteredGameId;
  readonly transport: Transport<State, Move, Outcome>;
  readonly ui: GameUI<State, Move, Outcome>;
  /**
   * The rule options the game offers (`listOptionChoices` of its rules), to show the rules the game
   * is played with next to its name. None by default.
   */
  readonly optionChoices?: readonly OptionChoiceList[] | undefined;
  /** Reconnects an online game paused for inactivity. */
  readonly onResume?: (() => void) | undefined;
  /**
   * Moves focus to the game's title once it shows: the room page sets it when the game replaces
   * the lobby, whose focused "Join game" button is gone.
   */
  readonly focusTitle?: boolean | undefined;
}

function noop(): void {
  // A game on this device has no connection to resume.
}

const NO_OPTION_CHOICES: readonly OptionChoiceList[] = [];

interface Said {
  readonly moveCount: number;
  readonly text: string;
  readonly repeated: boolean;
}

/** A zero-width space: nothing on screen, but a change of the status line's text. */
const REPEAT_MARK = "\u200B";

/**
 * The screen shared by every game and mode: whose turn it is, the board, the result, undo/redo and
 * a new game. It only reads the transport's snapshot and sends requests, so it never decides who
 * may move or when the AI does. How turns and results are told follows the snapshot: "you", "the
 * computer" and the online opponent's name when exactly one seat is a person here (`viewer`), the
 * players' symbols otherwise. With several AI seats, each is told by its seat's name ("the computer
 * (Blue)"), and every move of the AI is told, also when the AI moves again right after. Online, every
 * move made elsewhere (a player's or an AI seat's) is told too, with whose turn follows, and the
 * state of the connection shows; a game in a room is online even when every other seat is the AI.
 */
export function PlayScreen<State, Move, Outcome>({
  gameId,
  transport,
  ui,
  optionChoices = NO_OPTION_CHOICES,
  onResume = noop,
  focusTitle = false,
}: PlayScreenProps<State, Move, Outcome>) {
  const t = useTranslations("Play");
  const tGames = useTranslations("Games");
  const format = useFormatter();
  const snapshot = useTransportSnapshot(transport);
  const playerLabel = ui.usePlayerLabel();
  const moveLabel = ui.useMoveLabel();
  const modeLabel = useModeLabel();
  const optionLabels = useOptionLabels();
  const [confirmingNewGame, setConfirmingNewGame] = useState(false);
  // The number of moves when a move was refused: the refusal is told until the game changes,
  // not when the connection does.
  const [refusedAt, setRefusedAt] = useState<number | null>(null);
  // The words last said, for which move, and whether they carry the invisible mark that makes a
  // screen reader say the same words again for a new move.
  const [said, setSaid] = useState<Said | null>(null);
  const { Board } = ui;
  const titleRef = useCallback(
    (title: HTMLHeadingElement | null) => {
      if (focusTitle) title?.focus();
    },
    [focusTitle],
  );

  // The transport tells only refusals worth a word (online: the rules refused the move).
  useEffect(
    () =>
      transport.subscribe((event) => {
        if (event.type !== "rejected") return;
        const current = transport.getSnapshot();
        setRefusedAt(current.status === "ready" ? current.moveCount : null);
      }),
    [transport],
  );

  if (snapshot.status === "loading") return <PlayLoading />;

  // Adjusted during render: once a move is played (or a new game begins), the refusal is old news.
  if (refusedAt !== null && refusedAt !== snapshot.moveCount) setRefusedAt(null);
  const refused = refusedAt !== null;

  // The question is about dropping a game in progress: once there is none (the AI ended it), it no
  // longer applies. Adjusted during render, so the dialog never shows it for a finished game.
  if (confirmingNewGame && !snapshot.inProgress) setConfirmingNewGame(false);

  const aiSeatCount = snapshot.seats.filter((seat) => seat.kind === "ai").length;
  const hasAiSeat = aiSeatCount > 0;
  // Several AIs are told apart by their seats' names; a single one is simply "the computer".
  const severalAis = aiSeatCount > 1;
  // Online whoever else plays: a room of one person and three AIs has no remote seat.
  const online = snapshot.connection !== null;
  const rules = optionLabels.summary(gameId, optionChoices, snapshot.options);

  function describeStatus({
    state,
    result,
    currentPlayer,
    viewer,
    seats,
    lastEntry,
    lastMover,
    moveCount,
  }: ReadySnapshot<State, Move, Outcome>): string {
    const label = (player: PlayerIndex) => playerLabel(player, state);
    const labels = (players: readonly PlayerIndex[]) =>
      format.list(players.map(label), { type: "conjunction" });
    // An online player by the name they chose. Names are user input: they only ever enter a
    // message as ICU arguments, which React escapes like any text.
    const nameOf = (player: PlayerIndex) => {
      const seat = seats[player];
      return seat?.kind === "remote" && seat.name !== null ? seat.name : t("opponent");
    };
    // One person here: told as "you", "the computer" and the online opponent's name.
    if (viewer !== null) {
      // A new online game swaps sides for the one who did not ask for it: say which side is theirs.
      if (result === null && moveCount === 0 && online) {
        if (currentPlayer === viewer) return t("newGameYouFirst", { player: label(viewer) });
        if (seats[currentPlayer]?.kind === "ai") {
          return severalAis
            ? t("newGameAiSeatFirst", { player: label(viewer), first: label(currentPlayer) })
            : t("newGameAiFirst", { player: label(viewer) });
        }
        return t("newGameOpponentFirst", { player: label(viewer), name: nameOf(currentPlayer) });
      }
      // What the other side just did, so a player who cannot see the board knows it too: every
      // move of the AI is told, also when the AI (another one, or the same after a roll) is to move
      // again.
      const moved =
        lastEntry === null || lastMover === null
          ? null
          : { by: lastMover, seat: seats[lastMover], move: moveLabel(lastEntry.move, state) };
      if (result === null && currentPlayer === viewer) {
        if (moved?.seat?.kind === "ai") {
          return severalAis
            ? t("aiSeatMovedYourTurn", {
                mover: label(moved.by),
                move: moved.move,
                player: label(viewer),
              })
            : t("aiMovedYourTurn", { move: moved.move, player: label(viewer) });
        }
        if (moved?.seat?.kind === "remote") {
          return t("opponentMovedYourTurn", {
            name: nameOf(moved.by),
            move: moved.move,
            player: label(viewer),
          });
        }
        return t("yourTurn", { player: label(viewer) });
      }
      if (result === null && seats[currentPlayer]?.kind === "ai") {
        if (moved?.seat?.kind === "ai") {
          return severalAis
            ? t("aiSeatMovedAiThinking", {
                mover: label(moved.by),
                move: moved.move,
                player: label(currentPlayer),
              })
            : t("aiMovedAiThinking", { move: moved.move });
        }
        if (moved?.seat?.kind === "remote") {
          return severalAis
            ? t("opponentMovedAiSeatThinking", {
                name: nameOf(moved.by),
                move: moved.move,
                player: label(currentPlayer),
              })
            : t("opponentMovedAiThinking", { name: nameOf(moved.by), move: moved.move });
        }
        return severalAis ? t("aiSeatThinking", { player: label(currentPlayer) }) : t("aiThinking");
      }
      if (result === null && seats[currentPlayer]?.kind === "remote") {
        // Online with three or four seats, and every move of a turn with dice: what was just done
        // elsewhere, so nobody misses a horse of theirs sent home while waiting.
        if (moved?.seat?.kind === "ai") {
          return severalAis
            ? t("aiSeatMovedWaitingFor", {
                mover: label(moved.by),
                move: moved.move,
                name: nameOf(currentPlayer),
              })
            : t("aiMovedWaitingFor", { move: moved.move, name: nameOf(currentPlayer) });
        }
        if (moved?.seat?.kind === "remote") {
          return t("opponentMovedWaitingFor", {
            name: nameOf(moved.by),
            move: moved.move,
            next: nameOf(currentPlayer),
          });
        }
        return t("waitingFor", { name: nameOf(currentPlayer) });
      }
      if (result?.kind === "win" && result.winners.includes(viewer)) return t("youWin");
      if (
        result?.kind === "win" &&
        result.winners.every((winner) => seats[winner]?.kind === "ai")
      ) {
        return severalAis ? t("aiSeatWins", { player: labels(result.winners) }) : t("aiWins");
      }
      if (
        result?.kind === "win" &&
        result.winners.every((winner) => seats[winner]?.kind === "remote")
      ) {
        return t("opponentWins", {
          name: format.list(result.winners.map(nameOf), { type: "conjunction" }),
        });
      }
    }
    if (result === null) return t("turn", { player: label(currentPlayer) });
    if (result.kind === "draw") return t("draw");
    // Several winners are joined the way the language joins a list ("X và O", "X、O"), and the
    // count picks the verb form where the language has one ("X wins", "X and O win").
    return t("winner", { player: labels(result.winners), count: result.winners.length });
  }

  // Two moves in a row may be told in the same words (the AI rolls a 6 that cannot move, twice):
  // the second gets an invisible mark, so the live region changes and is read again.
  const announcement = describeStatus(snapshot);
  if (said?.moveCount !== snapshot.moveCount || said.text !== announcement) {
    setSaid({
      moveCount: snapshot.moveCount,
      text: announcement,
      repeated:
        said?.text === announcement && said.moveCount !== snapshot.moveCount && !said.repeated,
    });
  }
  const repeated = said?.repeated === true && said.text === announcement;
  return (
    <main className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-8">
      <header className="flex w-full flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1
            ref={titleRef}
            tabIndex={focusTitle ? -1 : undefined}
            className="text-2xl font-semibold tracking-tight focus:outline-none"
          >
            {tGames(`${gameId}.name`)}
          </h1>
          {/* Against the AI, its level stays visible, also after a reload; online, the AI seats are
              the server's, at a level nobody chose. */}
          {hasAiSeat && !online && <Badge className="text-sm">{modeLabel(snapshot.seats)}</Badge>}
          {online && <Badge className="text-sm">{t("online")}</Badge>}
          {/* Every rule option, defaults included, so both players online read the same words. */}
          {rules !== null && <Badge className="text-sm">{rules}</Badge>}
        </div>
        <Link href="/" className={buttonVariants({ variant: "ghost" })}>
          {t("backToMenu")}
        </Link>
      </header>

      {/* Online only. Its space is kept even when empty, so a lost connection never moves the
          board. */}
      {snapshot.connection !== null && (
        <ConnectionNotice status={snapshot.connection} onResume={onResume}>
          {refused && (
            <p role="alert" className="text-sm text-danger">
              {t("invalidMove")}
            </p>
          )}
        </ConnectionNotice>
      )}

      <p role="status" aria-live="polite" className="text-lg font-medium">
        {announcement}
        {repeated && REPEAT_MARK}
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
        {snapshot.supportsUndo && (
          <>
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
          </>
        )}
        {/* Online, a new game is for everyone in the room: offered only once this one is over. */}
        {snapshot.canStartNewGame && (
          <Button
            onClick={() => {
              // Only a game where a person here has a move in effect is worth asking about: not
              // one where only the AI has moved.
              if (snapshot.inProgress) setConfirmingNewGame(true);
              else transport.requestNewGame();
            }}
          >
            {online ? t("rematch") : t("newGame")}
          </Button>
        )}
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
