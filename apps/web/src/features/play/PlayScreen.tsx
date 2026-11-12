"use client";

import {
  ENDING_REASON,
  type GameResult,
  type OptionChoiceList,
  type PlayerIndex,
} from "@board-games/engine";
import type { RegisteredGameId } from "@board-games/games";
import { Badge, BookOpenIcon, Button, cn, ConfirmDialog, Dialog, FlagIcon } from "@board-games/ui";
import { useFormatter, useTranslations } from "next-intl";
import {
  type ComponentType,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import type { ChatSlotContext } from "@/features/chat/use-room-chat";
import { LazyRules } from "@/features/rules/LazyRules";
import { AppTopBar } from "@/features/shell/AppTopBar";
import type { BoardLayout, GameUI } from "@/games/types";
import { useModeLabel } from "@/lib/use-mode-label";
import { useOptionLabels } from "@/lib/use-option-labels";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import {
  CONNECTION_STATUS,
  type ReadySnapshot,
  type SeatView,
  standInName,
  type Transport,
  type TurnClock,
} from "@/transport/types";

import { AbandonNotice } from "./AbandonNotice";
import { Confetti } from "./Confetti";
import { ConnectionNotice } from "./ConnectionNotice";
import { PlayerPanel, SeatBar } from "./PlayerPanel";
import { PlayLoading } from "./PlayLoading";
import { PresentationHoldProvider, useHeldPresentation } from "./presentation-hold";
import { ResultCard } from "./ResultCard";
import { isAiThinking, unavailableReasons } from "./unavailable-reason";
import { useLostForAWhile } from "./use-lost-for-a-while";
import { useTransportSnapshot } from "./use-transport";
import { TURN_LEVEL, useTurnThresholds } from "./use-turn-thresholds";

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
  /**
   * What the rules dialog shows in place of the game's rules (`LazyRules`, loaded when the dialog
   * first opens): a stand-in for tests.
   */
  readonly rules?: ReactNode;
  /**
   * The room's chat, placed where the game's buttons are: online with someone to talk to. Told what
   * it may cover or wait for. Keep its identity stable (`useCallback`): a game does not render again
   * for a message.
   */
  readonly chat?: ComponentType<ChatSlotContext> | undefined;
  /** Puts a board's words about the position (`BoardParts.notes`) where the chat can follow them. */
  readonly chatNotes?: ((notes: ReactNode) => ReactNode) | undefined;
}

function noop(): void {
  // A game on this device has no connection to resume.
}

const NO_OPTION_CHOICES: readonly OptionChoiceList[] = [];

function noResultDetail(): () => null {
  return () => null;
}

/**
 * Whether a person at this device is among the winners: every person here on a shared device. A
 * seat the AI won while standing in for the person here is not their win.
 */
function wonHere(
  result: GameResult | null,
  viewer: PlayerIndex | null,
  seats: readonly SeatView[],
): boolean {
  if (result?.kind !== "win") return false;
  return result.winners.some(
    (winner) => (viewer === null || winner === viewer) && seats[winner]?.kind === "human",
  );
}

/** Whether a game ended by a resignation or a turn abandoned, not by its rules. */
function endedOutsideRules(result: GameResult | null): boolean {
  return result?.reason === ENDING_REASON.Resigned || result?.reason === ENDING_REASON.Abandoned;
}

/**
 * Which turn a turn clock is about: the game, its position and the player to move. Not its start,
 * which may be reckoned again a few ms off (a reconnection) for the very same turn.
 */
function turnKey(turn: TurnClock | null): string | null {
  return turn === null
    ? null
    : [turn.gameNumber, turn.moveIndex, turn.player].map(String).join(":");
}

/** Where the focus goes once a question about resigning or a turn abandoned has closed. */
interface FocusAfterDialog {
  readonly target: "title" | "opener";
  /** Raised for every request, so the same target twice moves the focus twice. */
  readonly seq: number;
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
  rules,
  chat: ChatSlot,
  chatNotes,
}: PlayScreenProps<State, Move, Outcome>) {
  const t = useTranslations("Play");
  const tGames = useTranslations("Games");
  const format = useFormatter();
  const live = useTransportSnapshot(transport);
  const readLive = useCallback(() => transport.getSnapshot(), [transport]);
  // What the screen around the board shows: the live snapshot, or the one a board asked to keep
  // while it plays out a moment of its own (Ludo's throw); the board always gets the live one.
  const { shown: snapshot, control: presentation, held } = useHeldPresentation(live, readLive);
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
  const [confirmingResign, setConfirmingResign] = useState(false);
  // The turn (`turnKey`) the question about a player gone is about: it closes once that turn is
  // over, never because its start was reckoned again a few ms off.
  const [confirmingClaim, setConfirmingClaim] = useState<string | null>(null);
  // The turn the server refused a claim on (too early): told until that turn is over or becomes
  // claimable.
  const [claimRefusedFor, setClaimRefusedFor] = useState<string | null>(null);
  const [focusAfterDialog, setFocusAfterDialog] = useState<FocusAfterDialog | null>(null);
  // Whether the rules dialog is open, and whether it was ever opened: its content is rendered from
  // the first opening on (a room loads the rules then), and kept, so it opens at once again.
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rulesOpened, setRulesOpened] = useState(false);
  // The button that opened the question, to give the focus back to when it is cancelled.
  const opener = useRef<HTMLElement | null>(null);
  const turnLevel = useTurnThresholds(
    snapshot.status === "ready" ? (snapshot.turn?.startedAt ?? null) : null,
  );
  const reducedMotion = usePrefersReducedMotion();
  // The connection as it is now, also while the screen is held: a lost connection always shows.
  const connection = live.status === "ready" ? live.connection : null;
  const connectionLost = useLostForAWhile(connection);
  const useResultDetail = ui.useResultDetail ?? noResultDetail;
  const resultDetail = useResultDetail();
  const undoReasonId = useId();
  const redoReasonId = useId();
  const resignReasonId = useId();
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
  // For the chat's panel, which may cover the buttons they stand for: the same functions from one
  // render to the next, so rendering again tells the chat nothing new.
  const claimedTurn = turnKey(snapshot.status === "ready" ? snapshot.turn : null);
  const claimFromChat = useCallback(
    (button: HTMLElement) => {
      opener.current = button;
      setConfirmingClaim(claimedTurn);
    },
    [claimedTurn],
  );
  // Online, where nothing is asked first: only a finished game can start a new one.
  const rematchFromChat = useCallback(() => {
    focusTitleOnNewGame.current = true;
    transport.requestNewGame();
  }, [transport]);
  const { Board } = ui;
  const title = useRef<HTMLHeadingElement | null>(null);
  const titleRef = useCallback(
    (heading: HTMLHeadingElement | null) => {
      title.current = heading;
      // Not away from a layer above the page (the chat, still being typed in).
      if (focusTitle && document.activeElement?.closest("[data-keeps-focus]") == null) {
        heading?.focus();
      }
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
  // After the dialog has closed (the dialog's own effect runs first and gives the focus back to
  // what had it), to the button that opened it, or to the title when that is gone or the game
  // moved on.
  useEffect(() => {
    if (focusAfterDialog === null) return;
    const button = opener.current;
    if (focusAfterDialog.target === "opener" && button?.isConnected === true) button.focus();
    else title.current?.focus();
  }, [focusAfterDialog]);

  // The transport tells only refusals worth a word (online: the rules refused the move, or a turn
  // claimed abandoned too early).
  useEffect(
    () =>
      transport.subscribe((event) => {
        const current = transport.getSnapshot();
        if (event.type === "claim-refused") {
          setClaimRefusedFor(current.status === "ready" ? turnKey(current.turn) : null);
          return;
        }
        if (event.type !== "rejected") return;
        setRefusedAt(current.status === "ready" ? current.moveCount : null);
      }),
    [transport],
  );

  // A game replaced while held (a new game, undo, the room as it is after reconnecting): the
  // latest state at once. Adjusted during render.
  if (
    held &&
    (live.status !== "ready" ||
      (snapshot.status === "ready" && live.moveCount < snapshot.moveCount))
  ) {
    presentation.release();
  }

  if (snapshot.status === "loading" || live.status === "loading") return <PlayLoading />;

  // Adjusted during render: once a move is played (or a new game begins), the refusal is old news.
  if (refusedAt !== null && refusedAt !== snapshot.moveCount) setRefusedAt(null);
  const refused = refusedAt !== null;

  // The question is about dropping a game in progress: once there is none (the AI ended it), it no
  // longer applies. Adjusted during render, so the dialog never shows it for a finished game.
  if (confirmingNewGame && !snapshot.inProgress) setConfirmingNewGame(false);

  // The questions about leaving close as soon as they no longer apply (the game ended, the player
  // gone moved), the focus then going to the title: the button that opened them may be gone.
  const requestTitleFocus = () => {
    setFocusAfterDialog((previous) => ({ target: "title", seq: (previous?.seq ?? 0) + 1 }));
  };
  if (confirmingResign && snapshot.resign === null) {
    setConfirmingResign(false);
    requestTitleFocus();
  }
  const { turn } = snapshot;
  const currentTurn = turnKey(turn);
  if (confirmingClaim !== null && (turn?.claim == null || currentTurn !== confirmingClaim)) {
    setConfirmingClaim(null);
    requestTitleFocus();
  }
  if (claimRefusedFor !== null && currentTurn !== claimRefusedFor) setClaimRefusedFor(null);
  // Why resigning or claiming cannot be done now: the connection, lost or paused for inactivity
  // (then "Continue" on the connection line brings it back).
  const unavailableReason =
    connection === CONNECTION_STATUS.Idle ? t("locked.idle") : t("locked.reconnecting");

  // A seat the AI plays for a person who left is told by their name, not counted among AI seats.
  const aiSeatCount = snapshot.seats.filter(
    (seat) => seat.kind === "ai" && standInName(seat) === null,
  ).length;
  const hasAiSeat = aiSeatCount > 0;
  // Several AIs are told apart by their seats' names; a single one is simply "the computer".
  const severalAis = aiSeatCount > 1;
  // Online whoever else plays: a room of one person and three AIs has no remote seat.
  const online = snapshot.connection !== null;
  const optionSummary = optionLabels.summary(gameId, optionChoices, snapshot.options);

  function describeStatus({
    state,
    result,
    currentPlayer,
    viewer,
    seats,
    lastEntry,
    lastMover,
    moveCount,
    cooperative,
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
    // A winner by name: a seat the AI won for a person who left as "the computer (for Lan)".
    const winnerName = (player: PlayerIndex) => {
      const standIn = standInName(seats[player]);
      if (standIn !== null) return t("standInName", { name: standIn });
      const seat = seats[player];
      if (seat?.kind === "ai") return t("aiSeatTitle", { player: label(player) });
      return seat?.kind === "remote" ? nameOf(player) : label(player);
    };
    // A cooperative game is won, ended or stopped by the whole team, whoever is here (spec
    // "Kết quả của game cùng phe"): before every way of naming winners below.
    if (cooperative && result !== null) {
      if (result.kind === "win") return t("teamWins");
      return endedOutsideRules(result) ? t("teamStopped") : t("teamEnded");
    }
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
      // Online, a seat the AI plays for a person who left: its moves are told as the AI's with the
      // person's name, and its turn as the AI's for them, this player's own seat included.
      const standInMover = moved === null ? null : standInName(moved.seat);
      const standInToMove = result === null ? standInName(seats[currentPlayer]) : null;
      if (result === null && (standInMover !== null || standInToMove !== null)) {
        let then: string;
        if (standInToMove !== null) {
          then =
            currentPlayer === viewer
              ? t("standInThinkingForYou")
              : t("standInThinking", { name: standInToMove });
        } else if (currentPlayer === viewer) {
          then = t("yourTurn", { player: label(viewer) });
        } else if (seats[currentPlayer]?.kind === "ai") {
          then = severalAis
            ? t("aiSeatThinking", { player: label(currentPlayer) })
            : t("aiThinking");
        } else {
          then = t("waitingFor", { name: nameOf(currentPlayer) });
        }
        if (moved === null) return then;
        let movedText: string | null = null;
        if (standInMover !== null) {
          movedText = t("aiStandInMoved", { name: standInMover, move: moved.move });
        } else if (moved.seat?.kind === "ai") {
          movedText = severalAis
            ? t("aiSeatMoved", { mover: label(moved.by), move: moved.move })
            : t("aiMoved", { move: moved.move });
        } else if (moved.seat?.kind === "remote") {
          movedText = t("opponentMoved", { name: nameOf(moved.by), move: moved.move });
        }
        return movedText === null ? then : t("movedThen", { moved: movedText, then });
      }
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
      if (
        result?.kind === "win" &&
        result.winners.some((winner) => standInName(seats[winner]) !== null)
      ) {
        // The AI standing in for someone won: said so on every screen, theirs included.
        const [only] = result.winners;
        const standIn = result.winners.length === 1 ? standInName(seats[only ?? -1]) : null;
        return standIn !== null
          ? t("standInWins", { name: standIn })
          : t("winner", {
              player: format.list(result.winners.map(winnerName), { type: "conjunction" }),
              count: result.winners.length,
            });
      }
      if (result?.kind === "win" && result.winners.includes(viewer)) return t("youWin");
      if (
        result?.kind === "win" &&
        result.winners.every((winner) => seats[winner]?.kind === "ai")
      ) {
        // The player resigned to the AI: the computer wins, however many AI seats there are.
        return severalAis && result.reason !== ENDING_REASON.Resigned
          ? t("aiSeatWins", { player: labels(result.winners) })
          : t("aiWins");
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

  // Who the game waits for, by name.
  function waitingName(player: PlayerIndex): string {
    const seat = ready.seats[player];
    const label = playerLabel(player, ready.state);
    const standIn = standInName(seat);
    if (standIn !== null) return t("standInName", { name: standIn });
    if (seat?.kind === "ai") return severalAis ? t("aiSeatName", { player: label }) : t("aiName");
    if (seat?.kind === "remote") return seat.name ?? t("opponent");
    return label;
  }
  const ready = snapshot;

  /**
   * Online, at 5 minutes, the turn line of the players waiting says they may claim the turn: in
   * words on screen, as the claim button appears. The seconds tick in the notice under it, never
   * in the live region.
   */
  function describeClaimReady(): string | null {
    if (turn === null || turn.player === ready.viewer || turn.claim === null) return null;
    if (turnLevel !== TURN_LEVEL.Claimable) return null;
    const name = waitingName(turn.player);
    if (turn.claim === "stand-in") return t("abandon.readyStandIn", { name });
    return turn.claim === "end" ? t("abandon.readyEnd", { name }) : t("abandon.readyWin", { name });
  }

  /**
   * Online, at 4 minutes, the turn line of the player to move gains a sentence for screen readers
   * only, said once: the reminder under it shows the seconds left.
   */
  function describeMoverWarning(): string | null {
    if (turn?.player !== ready.viewer) return null;
    if (turnLevel !== TURN_LEVEL.Warn && turnLevel !== TURN_LEVEL.Claimable) return null;
    if (ready.resign?.outcome === "end") return t("abandon.turnWarnTeam");
    return ready.resign?.outcome === "stand-in"
      ? t("abandon.turnWarnStandIn")
      : t("abandon.turnWarnWin");
  }

  /** Why the game ended, when not by its rules: who resigned, or who was gone too long. */
  function describeEnding(result: GameResult): string | null {
    if (!endedOutsideRules(result)) return null;
    // A cooperative game stopped is a draw: only the ending says who left.
    if (ready.cooperative) {
      const leaver = ready.ending?.player;
      if (leaver === undefined) return null;
      const resigned = result.reason === ENDING_REASON.Resigned;
      if (leaver === ready.viewer)
        return resigned ? t("ending.youGaveUp") : t("ending.youAbandoned");
      const name = waitingName(leaver);
      return resigned
        ? t("ending.opponentGaveUp", { name })
        : t("ending.opponentAbandoned", { name });
    }
    if (result.kind !== "win") return null;
    const leaver = ready.seats.findIndex((_, seat) => !result.winners.includes(seat));
    if (leaver === -1) return null;
    const resigned = result.reason === ENDING_REASON.Resigned;
    if (leaver === ready.viewer) {
      return resigned ? t("ending.youResigned") : t("ending.youAbandoned");
    }
    const name = waitingName(leaver);
    return resigned
      ? t("ending.opponentResigned", { name })
      : t("ending.opponentAbandoned", { name });
  }

  // Two moves in a row may be told in the same words (the AI rolls a 6 that cannot move, twice):
  // the second gets an invisible mark, so the live region changes and is read again.
  const announcement = describeClaimReady() ?? describeStatus(snapshot);
  const moverWarning = describeMoverWarning();
  const spoken = moverWarning === null ? announcement : `${announcement} ${moverWarning}`;
  // A move of a person here (a roll, which the board's hint reads out) never makes the same words
  // be said again: the invisible mark stays as it was, so the live region does not change.
  const movedHere =
    snapshot.lastMover !== null && snapshot.seats[snapshot.lastMover]?.kind === "human";
  if (said?.moveCount !== snapshot.moveCount || said.text !== spoken) {
    const same = said?.text === spoken;
    setSaid({
      moveCount: snapshot.moveCount,
      text: spoken,
      repeated: same && (movedHere ? said.repeated : !said.repeated),
    });
  }
  const repeated = said?.repeated === true && said.text === spoken;

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
  const { resign } = snapshot;
  // The chat stays once the game has a result or the player resigned: when people say "gg".
  const hasButtons =
    snapshot.supportsUndo || newGameInButtons || resign !== null || ChatSlot !== undefined;

  function startNewGame() {
    // Only a game where a person here has a move in effect is worth asking about: not one where
    // only the AI has moved.
    if (ready.inProgress) setConfirmingNewGame(true);
    else transport.requestNewGame();
  }

  // Why the board is locked while the game is on, for a board's own controls to say it: the
  // connection, someone else to play, or a move on its way to the server.
  // From the live snapshot, as the board's own `disabled` is.
  let lockedReason: string | null = null;
  if (!live.canMove && live.result === null) {
    if (connection !== null && connection !== CONNECTION_STATUS.Online) {
      lockedReason = unavailableReason;
    } else if (live.waitingFor !== null) {
      lockedReason = t("locked.waiting", { player: waitingName(live.currentPlayer) });
    } else {
      lockedReason = t("locked.sending");
    }
  }

  // The parts of the screen around the board, built once per render of the play screen: a board
  // re-rendering by itself (an animation frame) lays out the same elements again, which React
  // skips instead of rendering the turn line and the buttons again.
  // Online only. Its space is kept even when empty, so a lost connection never moves the board.
  const notice =
    connection === null ? null : (
      <ConnectionNotice
        status={connection}
        onResume={onResume}
        // Below 1024 px it takes back half of the column's gaps: one small line, close to the chips.
        className="-my-2 lg:my-1.5 lg:justify-start lg:[grid-area:notice] short-landscape:my-1 short-landscape:justify-start short-landscape:[grid-area:notice]"
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
          {moverWarning !== null && <span className="sr-only"> {moverWarning}</span>}
          {repeated && REPEAT_MARK}
        </>
      }
      variant={celebrating ? "won" : finished ? "over" : "turn"}
      detail={
        snapshot.result === null
          ? null
          : // The engine's own reasons first: the game's rules know nothing of resigning.
            (describeEnding(snapshot.result) ??
            (endedOutsideRules(snapshot.result)
              ? null
              : resultDetail(snapshot.result, snapshot.state)))
      }
      notice={
        turn === null ? null : (
          <AbandonNotice
            turn={turn}
            level={turnLevel}
            viewer={snapshot.viewer}
            name={waitingName(turn.player)}
            resign={resign}
            refused={claimRefusedFor !== null}
            unavailableReason={unavailableReason}
            onClaim={(event) => {
              opener.current = event.currentTarget;
              setConfirmingClaim(turnKey(turn));
            }}
          />
        )
      }
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
      className="lg:my-1.5 lg:[grid-area:status] short-landscape:my-1 short-landscape:[grid-area:status]"
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
      connection === null ? null : connection === CONNECTION_STATUS.Idle || connectionLost,
    thinking,
    cooperative: snapshot.cooperative,
  } as const;
  const players = (
    <PlayerPanel
      {...seatProps}
      className="lg:my-1.5 lg:[grid-area:players] short-landscape:my-1 short-landscape:[grid-area:players]"
    />
  );
  const claimText = claimQuestion();

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
            ? "absolute inset-x-0 top-full z-10 mt-1.5 text-center text-small text-fg-muted lg:text-left short-landscape:text-left"
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
    // Below 1024 px a compact row (44 px high, narrower padding), one line at 360 px when it fits:
    // undo, redo and a new game do; "Đầu hàng" against the AI goes to a second line, after "Ván
    // mới" in the first.
    <div className="relative flex flex-wrap justify-center gap-2 lg:my-1.5 lg:justify-start lg:[grid-area:buttons] short-landscape:my-1 short-landscape:justify-start short-landscape:[grid-area:buttons] max-lg:[&>button]:h-11 max-lg:[&>button]:px-3">
      {ChatSlot !== undefined && (
        <ChatSlot
          held={held}
          turnLine={announcement}
          over={finished}
          claimLabel={
            turn?.claim != null &&
            turn.player !== snapshot.viewer &&
            turnLevel === TURN_LEVEL.Claimable
              ? claimText.confirm
              : null
          }
          claimAvailable={turn?.available === true}
          onClaim={claimFromChat}
          rematchLabel={snapshot.canStartNewGame && online ? t("rematch") : null}
          onRematch={rematchFromChat}
        />
      )}
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
      {/* Last, apart from the game's own controls: final, so it always asks first. */}
      {resign !== null && (
        <Button
          variant="secondary"
          aria-disabled={!resign.available}
          aria-describedby={resign.available ? undefined : resignReasonId}
          onClick={(event) => {
            if (!resign.available) return;
            opener.current = event.currentTarget;
            setConfirmingResign(true);
          }}
        >
          <FlagIcon aria-hidden className="size-4" />
          {resign.outcome === "end" ? t("resignTeam") : t("resign")}
        </Button>
      )}
      {resign?.available === false && (
        <p id={resignReasonId} className="sr-only">
          {unavailableReason}
        </p>
      )}
      {snapshot.supportsUndo && reasonText("undo", undoReasonId)}
      {snapshot.supportsUndo && reasonText("redo", redoReasonId)}
    </div>
  ) : null;

  /** What resigning will do, in the question asked first. */
  function resignQuestion(): string {
    if (resign?.outcome === "end") return t("confirmResign.descriptionTeam");
    if (resign?.outcome === "stand-in") return t("confirmResign.descriptionStandIn");
    const others = ready.seats.flatMap((_, seat) => (seat === ready.viewer ? [] : [seat]));
    // Every other seat played by the AI (against the computer): the computer wins.
    if (others.every((seat) => ready.seats[seat]?.kind === "ai")) {
      return t("confirmResign.descriptionAi");
    }
    return t("confirmResign.descriptionWin", {
      name: format.list(others.map(waitingName), { type: "conjunction" }),
    });
  }

  /** The question before claiming the running turn abandoned, by what the claim does. */
  function claimQuestion(): { title: string; description: string; confirm: string } {
    const name = turn === null ? t("opponent") : waitingName(turn.player);
    switch (turn?.claim) {
      case "stand-in":
        return {
          title: t("confirmAbandon.titleStandIn", { name }),
          description: t("confirmAbandon.descriptionStandIn", { name }),
          confirm: t("abandon.claimStandIn"),
        };
      case "end":
        return {
          title: t("confirmAbandon.titleEnd", { name }),
          description: ready.cooperative
            ? t("confirmAbandon.descriptionTeam", { name })
            : t("confirmAbandon.descriptionEnd", { name }),
          confirm: t("abandon.claimEnd"),
        };
      default:
        return {
          title: t("confirmAbandon.titleWin", { name }),
          description: t("confirmAbandon.descriptionWin", { name }),
          confirm: t("abandon.claimWin"),
        };
    }
  }

  const confetti =
    celebration !== null && !reducedMotion ? (
      <Confetti key={celebration} onDone={endCelebration} />
    ) : null;

  // Against the AI, its level stays visible, also after a reload; online, the AI seats are the
  // server's, at a level nobody chose. Every rule option, defaults included, so both players online
  // read the same words. At the top of the page's content (the top bar keeps one row), beside the
  // board from 1024 px.
  const chips =
    hasAiSeat || online || optionSummary !== null ? (
      <div
        data-chips=""
        className="flex max-w-full flex-wrap items-center justify-center gap-1.5 lg:my-1.5 lg:justify-start lg:[grid-area:chips] short-landscape:my-1 short-landscape:justify-start short-landscape:[grid-area:chips]"
      >
        {hasAiSeat && !online && <Badge variant="accent">{modeLabel(snapshot.seats)}</Badge>}
        {online && <Badge variant="accent">{t("online")}</Badge>}
        {optionSummary !== null && (
          <Badge variant="accent" className="max-w-full whitespace-normal">
            {optionSummary}
          </Badge>
        )}
      </div>
    ) : null;

  // Where the board's parts go: one order in the DOM for every width (read and tabbed alike): the
  // chips, connection, turn (or the result card), players, board, the game's controls, the game's
  // buttons. Below 1024 px they stack in that order; from 1024 px, and on a phone turned sideways
  // (`short-landscape:`, at most 512 px high), the board takes the left of every row and the rest
  // stacks beside it, centred on the board's height (sideways, the board stays in view while a long
  // column scrolls). The board gets its room as `--board-room`: the width on a phone, and beside the
  // column a square that leaves the column, the top bar (`--top-bar-height`) and the page's padding
  // on screen. While the AI thinks, the board is busy for assistive technology.
  //
  // A board that names its seats' places (`seatOrder`, Chess) gets a bar for each seat right above
  // and right below it instead of the panel, and its room leaves the two bars on screen as well;
  // sideways the two bars go to the column, so the board keeps the screen's height.
  const besideBoard =
    "short-landscape:sticky short-landscape:top-[calc(var(--top-bar-height)+var(--safe-top)+0.5rem)] short-landscape:self-start short-landscape:[grid-area:board]";
  const layout: BoardLayout = ({ board, controls, seatOrder, notes }) => (
    <div
      className={cn(
        "grid w-full grid-cols-[minmax(0,1fr)] gap-y-4 [--board-room:100%]",
        "lg:grid-cols-[auto_minmax(20rem,24rem)] lg:grid-rows-[minmax(0,1fr)_repeat(7,auto)_minmax(0,1fr)] lg:justify-center lg:gap-x-10 lg:gap-y-0 [:root[data-chat-column=open]_&]:lg:grid-cols-[auto_20rem] [:root[data-chat-column=open]_&]:lg:gap-x-8",
        "lg:[grid-template-areas:'board_.'_'board_chips'_'board_notice'_'board_status'_'board_players'_'board_notes'_'board_controls'_'board_buttons'_'board_.']",
        // The page's height less the top bar and the page's padding (3rem), a little room kept.
        seatOrder === undefined
          ? "lg:[--board-room:min(100vw_-_var(--play-side)_-_var(--chat-room),100dvh_-_var(--top-bar-height)_-_var(--safe-top)_-_6rem)]"
          : // Less the two bars (2 × 2.75rem) and their gaps (2 × 0.375rem) too.
            "lg:[--board-room:min(100vw_-_var(--play-side)_-_var(--chat-room),100dvh_-_var(--top-bar-height)_-_var(--safe-top)_-_3.25rem_-_6.25rem)]",
        "short-landscape:grid-cols-[auto_minmax(0,1fr)] short-landscape:grid-rows-[minmax(0,1fr)_repeat(9,auto)_minmax(0,1fr)] short-landscape:gap-x-6 short-landscape:gap-y-0",
        "short-landscape:[grid-template-areas:'board_.'_'board_chips'_'board_notice'_'board_status'_'board_players'_'board_seat-top'_'board_seat-bottom'_'board_notes'_'board_controls'_'board_buttons'_'board_.']",
        // The page's height less the top bar and the page's padding (1rem); the column at least
        // 16rem wide, the gap and the page's sides.
        "short-landscape:[--board-room:min(100vw_-_22rem_-_var(--safe-left)_-_var(--safe-right),100dvh_-_var(--top-bar-height)_-_var(--safe-top)_-_1rem)]",
      )}
    >
      {/* While a board holds the screen (Ludo's throw), everything but the board's own controls is
          inert: nothing behind the throw can be reached by Tab or a click. The wrappers have no
          box of their own (`contents`), so the grid places what they hold as before. */}
      {/* Where the chat's panel goes beside the board: the column above the controls, or under the
          result card to leave "Chơi lại" in view. A grid item with no height of its own, measured by
          the chat floating over it. */}
      {ChatSlot !== undefined && (
        <div
          aria-hidden
          data-chat-dock=""
          className={cn(
            "hidden lg:block lg:[contain:size] short-landscape:[grid-column:2] short-landscape:[grid-row:1/2] short-landscape:block short-landscape:[contain:size]",
            finished
              ? "lg:[grid-column:2] lg:[grid-row:5/-1]"
              : "lg:[grid-column:2] lg:[grid-row:1/7]",
          )}
        />
      )}
      <div className="contents" inert={held || undefined}>
        {chips}
        {notice}
        {statusLine}
        {seatOrder === undefined && players}
      </div>
      <div
        inert={held || undefined}
        aria-busy={seatOrder === undefined ? thinking : undefined}
        data-play-board=""
        className={cn(
          "min-w-0 lg:self-center lg:[grid-area:board] aria-busy:[&_*]:cursor-progress",
          seatOrder === undefined ? besideBoard : "short-landscape:contents",
        )}
      >
        {seatOrder === undefined ? (
          board
        ) : (
          // As wide as the board on a laptop (`w-min`: the bars' words truncate), the page's width
          // on a phone.
          <div className="flex flex-col gap-1.5 lg:mx-auto lg:w-min short-landscape:contents">
            <SeatBar
              {...seatProps}
              player={seatOrder[0]}
              className="short-landscape:my-1 short-landscape:[grid-area:seat-top]"
            />
            <div
              aria-busy={thinking}
              className={cn("aria-busy:[&_*]:cursor-progress", besideBoard)}
            >
              {board}
            </div>
            <SeatBar
              {...seatProps}
              player={seatOrder[1]}
              className="short-landscape:my-1 short-landscape:[grid-area:seat-bottom]"
            />
          </div>
        )}
      </div>
      {/* Below 1024 px it takes back half of the column's gap: close to the controls it is about. */}
      {notes !== undefined && (
        <div className="-mb-2 min-w-0 lg:my-1.5 lg:[grid-area:notes] short-landscape:my-1 short-landscape:[grid-area:notes]">
          {chatNotes === undefined ? notes : chatNotes(notes)}
        </div>
      )}
      {controls !== null && controls !== undefined && (
        <div className="min-w-0 lg:my-1.5 lg:[grid-area:controls] short-landscape:my-1 short-landscape:[grid-area:controls]">
          {controls}
        </div>
      )}
      <div className="contents" inert={held || undefined}>
        {gameButtons}
      </div>
      {confetti}
    </div>
  );

  const gameName = tGames(`${gameId}.name`);

  return (
    // The game's own look (`games/<id>/theme.css`) applies from here down, the top bar included.
    <div data-game={gameId} className="flex min-h-dvh flex-col bg-game-page">
      <div className="contents" inert={held || undefined}>
        <AppTopBar
          title={
            <h1
              ref={titleRef}
              // Focusable by script only: where the focus goes when what had it is gone.
              tabIndex={-1}
              // One line: cut short on a phone, whole for screen readers.
              className="truncate text-heading focus:outline-none lg:text-title"
            >
              {gameName}
            </h1>
          }
          actions={
            // The rules, in a dialog: the game goes on (online too) while they are read. Its icon
            // alone on a phone, named all the same.
            <Button
              variant="secondary"
              size="icon"
              className="sm:w-auto sm:px-4"
              onClick={() => {
                setRulesOpen(true);
                setRulesOpened(true);
              }}
            >
              <BookOpenIcon aria-hidden className="size-5" />
              <span className="sr-only sm:not-sr-only">{t("rules")}</span>
            </Button>
          }
        />
      </div>

      {/* Clear of the chat's column at the right of a wide screen: the top bar still runs across. */}
      <div className="flex flex-1 flex-col pr-(--chat-room)">
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col py-4 px-safe-4 lg:justify-center lg:py-6 lg:px-safe-10 short-landscape:justify-start short-landscape:py-2 [:root[data-chat-column=open]_&]:lg:px-safe-6">
          <PresentationHoldProvider value={presentation}>
            <Board
              state={live.state}
              legalMoves={live.legalMoves}
              onMove={transport.submit}
              disabled={!live.canMove}
              result={live.result}
              lastEntry={live.lastEntry}
              viewer={live.viewer}
              layout={layout}
              lockedReason={lockedReason}
            />
          </PresentationHoldProvider>
        </main>
      </div>

      {
        <Dialog
          open={rulesOpen}
          title={t("rulesDialog.title", { game: gameName })}
          closeLabel={t("rulesDialog.close")}
          onClose={() => {
            setRulesOpen(false);
            // The turn line was out of reach while the dialog was open (`showModal()`): read it
            // again, with whatever happened meanwhile, by changing its invisible mark.
            setSaid((current) =>
              current === null ? null : { ...current, repeated: !current.repeated },
            );
          }}
        >
          {/* A container, so the rules lay their figures out for the dialog's width. */}
          <div className="@container flex flex-col gap-6">
            {optionSummary !== null && (
              <Badge variant="accent" className="self-start whitespace-normal">
                {t("rulesDialog.inThisGame", { rules: optionSummary })}
              </Badge>
            )}
            {rulesOpened && (rules ?? <LazyRules gameId={gameId} open={rulesOpen} />)}
          </div>
        </Dialog>
      }

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

      <ConfirmDialog
        open={confirmingResign}
        title={resign?.outcome === "end" ? t("confirmResign.titleTeam") : t("confirmResign.title")}
        description={resignQuestion()}
        confirmLabel={
          resign?.outcome === "end" ? t("confirmResign.confirmTeam") : t("confirmResign.confirm")
        }
        cancelLabel={t("confirmResign.cancel")}
        confirmUnavailableReason={resign?.available === false ? unavailableReason : undefined}
        onConfirm={() => {
          setConfirmingResign(false);
          requestTitleFocus();
          transport.resign();
        }}
        onCancel={() => {
          setConfirmingResign(false);
          setFocusAfterDialog((previous) => ({ target: "opener", seq: (previous?.seq ?? 0) + 1 }));
        }}
      />

      <ConfirmDialog
        open={confirmingClaim !== null}
        title={claimText.title}
        description={claimText.description}
        confirmLabel={claimText.confirm}
        cancelLabel={t("confirmAbandon.cancel")}
        confirmUnavailableReason={turn?.available === false ? unavailableReason : undefined}
        onConfirm={() => {
          setConfirmingClaim(null);
          requestTitleFocus();
          transport.claimAbandoned();
        }}
        onCancel={() => {
          setConfirmingClaim(null);
          setFocusAfterDialog((previous) => ({ target: "opener", seq: (previous?.seq ?? 0) + 1 }));
        }}
      />
    </div>
  );
}
