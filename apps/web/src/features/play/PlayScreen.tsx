"use client";

import type { GameResult, OptionChoiceList, PlayerIndex } from "@board-games/engine";
import type { RegisteredGameId } from "@board-games/games";
import { ArrowLeftIcon, Badge, Button, buttonVariants, cn, ConfirmDialog } from "@board-games/ui";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import type { BoardLayout, GameUI } from "@/games/types";
import { useModeLabel } from "@/lib/use-mode-label";
import { useOptionLabels } from "@/lib/use-option-labels";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import {
  CONNECTION_STATUS,
  type ReadySnapshot,
  type SeatView,
  type Transport,
} from "@/transport/types";

import { Confetti } from "./Confetti";
import { ConnectionNotice } from "./ConnectionNotice";
import { PlayerPanel, SeatBar } from "./PlayerPanel";
import { PlayLoading } from "./PlayLoading";
import { ResultCard } from "./ResultCard";
import { isAiThinking, unavailableReasons } from "./unavailable-reason";
import { useLostForAWhile } from "./use-lost-for-a-while";
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

function noResultDetail(): () => null {
  return () => null;
}

/** Whether a person at this device is among the winners: every person here on a shared device. */
function wonHere(
  result: GameResult | null,
  viewer: PlayerIndex | null,
  seats: readonly SeatView[],
): boolean {
  if (result?.kind !== "win") return false;
  return result.winners.some((winner) =>
    viewer === null ? seats[winner]?.kind === "human" : winner === viewer,
  );
}

/**
 * Which of the undo and redo buttons shows why it cannot be pressed (focused, or just pressed), and
 * at which move count: a tap may focus nothing (iOS), so the note goes with the next move instead
 * of waiting for a blur.
 */
type ReasonShown = { readonly button: "undo" | "redo"; readonly at: number } | null;

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
  // Whether the game on screen was over at the last render (`null` before the first one): the
  // celebration is for a game that ends while it is watched, never for one opened already over.
  const [seenFinished, setSeenFinished] = useState<boolean | null>(null);
  // The confetti on screen, keyed by the move that won, or `null`.
  const [celebration, setCelebration] = useState<number | null>(null);
  const [reasonShown, setReasonShown] = useState<ReasonShown>(null);
  const reducedMotion = usePrefersReducedMotion();
  const connectionLost = useLostForAWhile(snapshot.status === "ready" ? snapshot.connection : null);
  const useResultDetail = ui.useResultDetail ?? noResultDetail;
  const resultDetail = useResultDetail();
  const undoReasonId = useId();
  const redoReasonId = useId();
  // Set by the result card's "New game": its button goes with the card, so the focus moves to the
  // "New game" of the game's buttons once it is back, instead of falling to the page. Online, where
  // no such button exists while the game is on, it moves to the game's title.
  const focusNewGame = useRef(false);
  const focusTitleOnNewGame = useRef(false);
  const newGameRef = useCallback((button: HTMLButtonElement | null) => {
    if (button === null || !focusNewGame.current) return;
    focusNewGame.current = false;
    button.focus();
  }, []);
  const { Board } = ui;
  const title = useRef<HTMLHeadingElement | null>(null);
  const titleRef = useCallback(
    (heading: HTMLHeadingElement | null) => {
      title.current = heading;
      if (focusTitle) heading?.focus();
    },
    [focusTitle],
  );
  const over = snapshot.status === "ready" && snapshot.result !== null;
  useEffect(() => {
    if (over || !focusTitleOnNewGame.current) return;
    focusTitleOnNewGame.current = false;
    title.current?.focus();
  }, [over]);
  const endCelebration = useCallback(() => {
    setCelebration(null);
  }, []);

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
  // A move of a person here (a roll, which the board's hint reads out) never makes the same words
  // be said again: the invisible mark stays as it was, so the live region does not change.
  const movedHere =
    snapshot.lastMover !== null && snapshot.seats[snapshot.lastMover]?.kind === "human";
  if (said?.moveCount !== snapshot.moveCount || said.text !== announcement) {
    const same = said?.text === announcement;
    setSaid({
      moveCount: snapshot.moveCount,
      text: announcement,
      repeated: same && (movedHere ? said.repeated : !said.repeated),
    });
  }
  const repeated = said?.repeated === true && said.text === announcement;

  const finished = snapshot.result !== null;
  // Adjusted during render: a game that ends while on screen, won by a person here, celebrates once
  // (again after undoing the winning move and playing it again); a game opened already over does
  // not, and the confetti goes as soon as the game is on again.
  if (seenFinished !== finished) {
    setSeenFinished(finished);
    if (seenFinished === false && wonHere(snapshot.result, snapshot.viewer, snapshot.seats)) {
      setCelebration(snapshot.moveCount);
    }
  }
  if (!finished && celebration !== null) setCelebration(null);

  const thinking = isAiThinking(snapshot);
  const reasons = unavailableReasons(snapshot);
  // A person here won: the result card's chip celebrates.
  const celebrating = wonHere(snapshot.result, snapshot.viewer, snapshot.seats);
  // The card offers a new game itself; the game's buttons keep only undo and redo meanwhile.
  const newGameInButtons = snapshot.canStartNewGame && !finished;
  const hasButtons = snapshot.supportsUndo || newGameInButtons;
  const ready = snapshot;

  function startNewGame() {
    // Only a game where a person here has a move in effect is worth asking about: not one where
    // only the AI has moved.
    if (ready.inProgress) setConfirmingNewGame(true);
    else transport.requestNewGame();
  }

  // Who the game waits for, by name.
  function waitingName(player: PlayerIndex): string {
    const seat = ready.seats[player];
    const label = playerLabel(player, ready.state);
    if (seat?.kind === "ai") return severalAis ? t("aiSeatName", { player: label }) : t("aiName");
    if (seat?.kind === "remote") return seat.name ?? t("opponent");
    return label;
  }
  // Why the board is locked while the game is on, for a board's own controls to say it: the
  // connection, someone else to play, or a move on its way to the server.
  let lockedReason: string | null = null;
  if (!snapshot.canMove && !finished) {
    if (snapshot.connection !== null && snapshot.connection !== CONNECTION_STATUS.Online) {
      lockedReason = t("locked.reconnecting");
    } else if (snapshot.waitingFor !== null) {
      lockedReason = t("locked.waiting", { player: waitingName(snapshot.currentPlayer) });
    } else {
      lockedReason = t("locked.sending");
    }
  }

  // The parts of the screen around the board, built once per render of the play screen: a board
  // re-rendering by itself (an animation frame) lays out the same elements again, which React
  // skips instead of rendering the turn line and the buttons again.
  // Online only. Its space is kept even when empty, so a lost connection never moves the board.
  const notice =
    snapshot.connection === null ? null : (
      <ConnectionNotice
        status={snapshot.connection}
        onResume={onResume}
        className="my-0 lg:my-1.5 lg:justify-start lg:[grid-area:notice]"
      >
        {refused && (
          <p role="alert" className="text-small text-danger">
            {t("invalidMove")}
          </p>
        )}
      </ConnectionNotice>
    );
  const statusLine = (
    <ResultCard
      announcement={
        <>
          {announcement}
          {repeated && REPEAT_MARK}
        </>
      }
      variant={celebrating ? "won" : finished ? "over" : "turn"}
      detail={snapshot.result === null ? null : resultDetail(snapshot.result, snapshot.state)}
      action={
        snapshot.canStartNewGame ? (
          <Button
            onClick={() => {
              focusNewGame.current = !online;
              focusTitleOnNewGame.current = online;
              startNewGame();
            }}
          >
            {online ? t("rematch") : t("newGame")}
          </Button>
        ) : null
      }
      className="lg:my-1.5 lg:[grid-area:status]"
    />
  );
  // The seats as the players' panel and the bars around a board (`BoardParts.seatOrder`) show them.
  const seatProps = {
    ui,
    state: snapshot.state,
    seats: snapshot.seats,
    currentPlayer: snapshot.currentPlayer,
    result: snapshot.result,
    viewer: snapshot.viewer,
    connectionLost:
      snapshot.connection === null
        ? null
        : snapshot.connection === CONNECTION_STATUS.Idle || connectionLost,
    thinking,
  } as const;
  const players = <PlayerPanel {...seatProps} className="lg:my-1.5 lg:[grid-area:players]" />;
  // Why undo or redo cannot be pressed: read with the button, shown in words while the button has
  // the focus or was just pressed.
  // Shown as a note under the buttons, over the space below them, so the column never moves.
  const reasonText = (button: "undo" | "redo", id: string) => {
    const reason = reasons[button];
    if (reason === null) return null;
    const shown = reasonShown?.button === button && reasonShown.at === ready.moveCount;
    return (
      <p
        id={id}
        className={
          shown
            ? "absolute inset-x-0 top-full z-10 mt-1.5 text-center text-small text-fg-muted lg:text-left"
            : "sr-only"
        }
      >
        {t(`unavailable.${reason}`)}
      </p>
    );
  };
  const reasonEvents = (button: "undo" | "redo") => ({
    onFocus: () => {
      setReasonShown({ button, at: ready.moveCount });
    },
    onPointerDown: () => {
      setReasonShown({ button, at: ready.moveCount });
    },
    onBlur: () => {
      setReasonShown((shown) => (shown?.button === button ? null : shown));
    },
  });
  // `aria-disabled`, not `disabled`: undoing the last move with the keyboard would otherwise
  // disable the focused button and drop focus to the page body.
  const gameButtons = hasButtons ? (
    <div className="relative flex flex-wrap justify-center gap-2 lg:my-1.5 lg:justify-start lg:[grid-area:buttons]">
      {snapshot.supportsUndo && (
        <>
          <Button
            variant="secondary"
            aria-disabled={!snapshot.canUndo}
            aria-describedby={reasons.undo === null ? undefined : undoReasonId}
            onClick={transport.requestUndo}
            {...reasonEvents("undo")}
          >
            {t("undo")}
          </Button>
          <Button
            variant="secondary"
            aria-disabled={!snapshot.canRedo}
            aria-describedby={reasons.redo === null ? undefined : redoReasonId}
            onClick={transport.requestRedo}
            {...reasonEvents("redo")}
          >
            {t("redo")}
          </Button>
        </>
      )}
      {/* Online, a new game is for everyone in the room: offered only once this one is over, and
          then by the result card, as is a new game after a finished game on this device. */}
      {newGameInButtons && (
        <Button ref={newGameRef} onClick={startNewGame}>
          {t("newGame")}
        </Button>
      )}
      {snapshot.supportsUndo && reasonText("undo", undoReasonId)}
      {snapshot.supportsUndo && reasonText("redo", redoReasonId)}
    </div>
  ) : null;

  const confetti =
    celebration !== null && !reducedMotion ? (
      <Confetti key={celebration} onDone={endCelebration} />
    ) : null;

  // Where the board's parts go: one order in the DOM for every width (read and tabbed alike):
  // connection, turn (or the result card), players, board, the game's controls, the game's
  // buttons. Below 1024 px they stack in that order; from 1024 px the board takes the left of
  // every row and the rest stacks beside it, centred on the board's height. The board gets its room
  // as `--board-room`: the width on a phone, and on a laptop a square that leaves the column and the
  // bar on screen. While the AI thinks, the board is busy for assistive technology.
  //
  // A board that names its seats' places (`seatOrder`, Chess) gets a bar for each seat right above
  // and right below it instead of the panel, and its room leaves the two bars on screen as well.
  const layout: BoardLayout = ({ board, controls, seatOrder }) => (
    <div
      className={cn(
        "grid w-full grid-cols-[minmax(0,1fr)] gap-y-4 [--board-room:100%]",
        "lg:grid-cols-[auto_minmax(20rem,24rem)] lg:grid-rows-[minmax(0,1fr)_repeat(5,auto)_minmax(0,1fr)] lg:justify-center lg:gap-x-10 lg:gap-y-0",
        "lg:[grid-template-areas:'board_.'_'board_notice'_'board_status'_'board_players'_'board_controls'_'board_buttons'_'board_.']",
        seatOrder === undefined
          ? "lg:[--board-room:min(100vw_-_34rem,100dvh_-_10rem)]"
          : // The screen's height less the top bar and the page's padding (7.25rem, a little
            // room kept), less the two bars (2 × 2.75rem) and their gaps (2 × 0.375rem).
            "lg:[--board-room:min(100vw_-_34rem,100dvh_-_7.25rem_-_6.25rem)]",
      )}
    >
      {notice}
      {statusLine}
      {seatOrder === undefined && players}
      <div
        aria-busy={seatOrder === undefined ? thinking : undefined}
        className="min-w-0 lg:self-center lg:[grid-area:board] aria-busy:[&_*]:cursor-progress"
      >
        {seatOrder === undefined ? (
          board
        ) : (
          // As wide as the board on a laptop (`w-min`: the bars' words truncate), the page's width
          // on a phone.
          <div className="flex flex-col gap-1.5 lg:mx-auto lg:w-min">
            <SeatBar {...seatProps} player={seatOrder[0]} />
            <div aria-busy={thinking} className="aria-busy:[&_*]:cursor-progress">
              {board}
            </div>
            <SeatBar {...seatProps} player={seatOrder[1]} />
          </div>
        )}
      </div>
      {controls !== null && controls !== undefined && (
        <div className="min-w-0 lg:my-1.5 lg:[grid-area:controls]">{controls}</div>
      )}
      {gameButtons}
      {confetti}
    </div>
  );

  return (
    // The game's own look (`games/<id>/theme.css`) applies from here down.
    <main data-game={gameId} className="flex min-h-dvh flex-col bg-game-page">
      <header className="border-b border-border">
        <div className="mx-auto grid min-h-16 max-w-6xl grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 px-4 py-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:px-10">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "justify-self-start px-3 whitespace-nowrap",
            )}
          >
            <ArrowLeftIcon aria-hidden className="size-5" />
            {t("backToMenu")}
          </Link>
          <div className="flex min-w-0 flex-col items-center gap-x-3 gap-y-1 text-center sm:flex-row sm:flex-wrap sm:justify-center">
            <h1
              ref={titleRef}
              tabIndex={focusTitle || online ? -1 : undefined}
              className="text-heading text-balance focus:outline-none lg:text-title"
            >
              {tGames(`${gameId}.name`)}
            </h1>
            {/* Against the AI, its level stays visible, also after a reload; online, the AI seats
                are the server's, at a level nobody chose. Every rule option, defaults included,
                so both players online read the same words; below the name on a phone. */}
            {hasAiSeat || online || rules !== null ? (
              <div className="flex max-w-full flex-wrap items-center justify-center gap-1.5">
                {hasAiSeat && !online && (
                  <Badge variant="accent">{modeLabel(snapshot.seats)}</Badge>
                )}
                {online && <Badge variant="accent">{t("online")}</Badge>}
                {rules !== null && (
                  <Badge variant="accent" className="max-w-full whitespace-normal">
                    {rules}
                  </Badge>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-4 lg:justify-center lg:px-10 lg:py-6">
        <Board
          state={snapshot.state}
          legalMoves={snapshot.legalMoves}
          onMove={transport.submit}
          disabled={!snapshot.canMove}
          result={snapshot.result}
          lastEntry={snapshot.lastEntry}
          viewer={snapshot.viewer}
          layout={layout}
          lockedReason={lockedReason}
        />
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
