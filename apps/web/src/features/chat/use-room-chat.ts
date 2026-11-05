"use client";

import type { PlayerIndex } from "@board-games/engine";
import {
  CHAT_LIMIT,
  CHAT_TEXT_MAX_LENGTH,
  CHAT_WINDOW_MS,
  type ChatBody,
  type ChatMessageView,
  cleanChatText,
  ROOM_ERROR,
  type RoomView,
  sanitizeChatText,
} from "@board-games/protocol";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { z } from "zod";

import { CHAT_READ_KEY_PREFIX } from "@/config/storage-keys";
import { randomId } from "@/lib/random-id";
import type { RoomConnection } from "@/transport/room-connection";
import { CONNECTION_STATUS, type ConnectionStatus } from "@/transport/types";

import { readChatMuted, subscribeChatMuted, writeChatMuted } from "./chat-muted";

/** A message sent and not answered for this long: told, and the connection is renewed. */
const ANSWER_LIMIT_MS = 8000;
/**
 * The server's window, and a little: its clock starts when it writes a message, after this page's.
 * Nothing goes over the network past the limit.
 */
const SEND_WINDOW_MS = CHAT_WINDOW_MS + 500;
/** How long a bubble shows, within the 3–5 s the spec asks for. */
const BUBBLE_MS = 4000;
/** How long a floating reaction shows: its animation, whatever the motion setting. */
const REACTION_MS = 1800;

const readMarkSchema = z.number().int().nonnegative();

/** Why a message did not go through; only those a new try may mend can be sent again. */
export const CHAT_FAILURE = {
  /** No answer in time, or the store failed. */
  NotSent: "not-sent",
  /** The server refuses its content, or the player has no seat any more. */
  Refused: "refused",
} as const;
type ChatFailureReason = (typeof CHAT_FAILURE)[keyof typeof CHAT_FAILURE];

interface Attempt {
  readonly id: string;
  readonly body: ChatBody;
  /** The field's words when a text was sent: it clears only if it still holds them. */
  readonly draft: string | null;
}

interface ChatFailure extends Attempt {
  readonly reason: ChatFailureReason;
}

/** What is wrong with the words in the field, before anything is sent. */
type DraftProblem = "too-long" | "invisible" | null;

/** What the play screen tells the chat: the panel may cover these, so it repeats them. */
export interface ChatPlayContext {
  /** A board holds the screen (Ludo's throw): the chat waits behind it. */
  readonly held: boolean;
  /** The turn line, or the result once the game is over. */
  readonly turnLine: string;
  /** The game has a result: the panel leaves the result card alone. */
  readonly over: boolean;
  /** Claiming the turn abandoned, when it can be done now. */
  readonly claim: ChatAction | null;
  /** Playing again, when it can be done now. */
  readonly rematch: ChatAction | null;
}

interface ChatAction {
  readonly label: string;
  readonly available: boolean;
  readonly run: (opener: HTMLElement) => void;
}

export interface RoomChatSnapshot {
  /** The player has a seat and at least one other person is in the room. */
  readonly visible: boolean;
  /** The game on screen; `null` in the lobby. */
  readonly gameId: string | null;
  readonly status: ConnectionStatus;
  readonly messages: readonly ChatMessageView[];
  readonly open: boolean;
  readonly draft: string;
  readonly draftProblem: DraftProblem;
  /** The length of what would be sent, as the limit counts it: not of what was typed. */
  readonly draftLength: number;
  readonly pending: Attempt | null;
  readonly failure: ChatFailure | null;
  /** Too many messages in the window: nothing goes out until it has passed. */
  readonly slow: boolean;
  readonly muted: boolean;
  readonly unread: number;
  /** The message a bubble shows now. */
  readonly bubble: ChatMessageView | null;
  /** The reaction floating now. */
  readonly reaction: ChatMessageView | null;
  /** The message for screen readers to hear, with a number that changes for each message. */
  readonly announced: { readonly message: ChatMessageView; readonly count: number } | null;
  readonly play: ChatPlayContext | null;
  /** The button that opens the chat, where it is on screen now. */
  readonly button: HTMLElement | null;
  /** Where the panel shows what it covers of a board's words; `null` when it covers nothing. */
  readonly notesSlot: HTMLElement | null;
}

/**
 * What the play screen's chat slot is told on each of its renders: plain values, and functions that
 * stay the same, so rendering again tells the chat nothing new.
 */
export interface ChatSlotContext {
  readonly held: boolean;
  readonly turnLine: string;
  readonly over: boolean;
  /** The words of the button claiming the turn abandoned, when it can be done now. */
  readonly claimLabel: string | null;
  readonly claimAvailable: boolean;
  readonly onClaim: (opener: HTMLElement) => void;
  /** The words of the button to play again, when it can be done now. */
  readonly rematchLabel: string | null;
  readonly onRematch: (opener: HTMLElement) => void;
}

export interface RoomChat {
  getSnapshot(this: void): RoomChatSnapshot;
  subscribe(this: void, listener: () => void): () => void;
  /** Starts following the connection; the returned function stops it. */
  start(this: void): () => void;
  setOpen(this: void, open: boolean): void;
  setDraft(this: void, draft: string): void;
  /** Whether a bubble may time out: not while it is pointed at or focused. */
  pauseBubble(this: void, paused: boolean): void;
  /** The bubble would hide the board: it goes at once; the count stays. */
  dismissBubble(this: void): void;
  /** Sends the field's words; nothing happens when they cannot be sent now. */
  sendDraft(this: void): void;
  sendQuick(this: void, body: Extract<ChatBody, { kind: "preset" | "reaction" }>): void;
  /** Sends again what failed, under the same id when it has not changed. */
  retry(this: void): void;
  setMuted(this: void, muted: boolean): void;
  setPlay(this: void, play: ChatPlayContext | null): void;
  /** A composition (an IME) began or ended in the field. */
  setComposing(this: void, composing: boolean): void;
  /** The button that opens the chat, where the focus goes back to. */
  registerButton(this: void, button: HTMLElement | null): void;
  registerNotesSlot(this: void, slot: HTMLElement | null): void;
  /** Gives the focus back to the button, without moving the page to it. */
  focusButton(this: void): void;
  resume(this: void): void;
}

/**
 * Whether a player has anyone to talk to: they hold a seat, and another seat is a person's, even one
 * the AI plays for them now. Reads the seats only, so it holds for every game, in the lobby and in
 * the game, over or not.
 */
export function chatVisible(
  room: Pick<RoomView, "seats"> | null,
  you: PlayerIndex | null,
): boolean {
  if (room === null || you === null) return false;
  return room.seats.filter((seat) => seat?.kind === "human").length >= 2;
}

function lastSeq(messages: readonly ChatMessageView[]): number {
  return messages.at(-1)?.seq ?? 0;
}

function readMark(code: string): number | null {
  try {
    const raw = window.sessionStorage.getItem(`${CHAT_READ_KEY_PREFIX}${code}`);
    if (raw === null) return null;
    const parsed = readMarkSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function saveMark(code: string, mark: number): void {
  try {
    window.sessionStorage.setItem(`${CHAT_READ_KEY_PREFIX}${code}`, JSON.stringify(mark));
  } catch {
    // Blocked storage: the mark lasts as long as the page.
  }
}

/** Two copies of the list hold the same messages: lists are new objects with every room. */
function sameMessages(one: readonly ChatMessageView[], other: readonly ChatMessageView[]): boolean {
  return (
    one === other ||
    (one.length === other.length &&
      one[0]?.seq === other[0]?.seq &&
      lastSeq(one) === lastSeq(other))
  );
}

/** What the field holds, judged by what would be kept of it: `draftProblem`, `draftLength`. */
function checkDraft(draft: string): { readonly problem: DraftProblem; readonly length: number } {
  const clean = cleanChatText(draft);
  const length = Array.from(clean).length;
  if (clean === "") return { problem: draft.trim() === "" ? null : "invisible", length };
  return { problem: length > CHAT_TEXT_MAX_LENGTH ? "too-long" : null, length };
}

/**
 * Everything the chat of a room remembers, outside React: created above the lobby and the play
 * screen, so words being typed, whether it is open and a message on its way survive the game
 * replacing the lobby. It reads the room straight from the connection, not through the transport's
 * queue of moves, so a message shows at once while moves are being shown one at a time.
 *
 * Unread messages are counted from a mark, a `seq`, not by counting arrivals, so messages that fell
 * off the 30 kept do not break it. Its first value is the first room with a seat: someone who just
 * sat down has read nothing, and owes nothing. Bubbles are for messages seen arriving while the page
 * is open, never for what the first room holds; a room after reconnecting that brings several gets
 * one, for its latest.
 */
export function createRoomChat(connection: RoomConnection): RoomChat {
  const listeners = new Set<() => void>();
  let code: string | null = null;
  let you = connection.getSnapshot().you;
  let status = connection.getSnapshot().status;
  let visible = false;
  let gameId: string | null = null;
  let messages: readonly ChatMessageView[] = [];
  let open = false;
  let draft = "";
  let pending: Attempt | null = null;
  let failure: ChatFailure | null = null;
  // A text sent and not in the room yet: sending the same words again keeps its id.
  let lastText: { readonly id: string; readonly text: string; readonly draft: string } | null =
    null;
  let checkedDraft = { draft, ...checkDraft(draft) };
  let muted = false;
  let mark: number | null = null;
  let seen: number | null = null;
  let bubble: ChatMessageView | null = null;
  let reaction: ChatMessageView | null = null;
  let waitingBubble: ChatMessageView | null = null;
  let announced: RoomChatSnapshot["announced"] = null;
  let bubblePaused = false;
  let play: ChatPlayContext | null = null;
  let composing = false;
  let clearAfterComposing: string | null = null;
  let button: HTMLElement | null = null;
  let notesSlot: HTMLElement | null = null;
  let lastStatus: ConnectionStatus | null = null;
  let slowUntil: number | null = null;
  // When each message of this player was sent or first seen, by id, while it counts.
  const sentAt = new Map<string, number>();

  let answerTimer: ReturnType<typeof setTimeout> | undefined;
  let slowTimer: ReturnType<typeof setTimeout> | undefined;
  let bubbleTimer: ReturnType<typeof setTimeout> | undefined;
  let reactionTimer: ReturnType<typeof setTimeout> | undefined;

  function build(): RoomChatSnapshot {
    // Not again for what the field already holds: a whole paste goes through it.
    if (checkedDraft.draft !== draft) checkedDraft = { draft, ...checkDraft(draft) };
    return {
      visible,
      gameId,
      status,
      messages,
      open,
      draft,
      draftProblem: checkedDraft.problem,
      draftLength: checkedDraft.length,
      pending,
      failure,
      slow: slowUntil !== null,
      muted,
      unread: unreadCount(),
      bubble,
      reaction,
      announced,
      play,
      button,
      notesSlot,
    };
  }

  function unreadCount(): number {
    if (muted || mark === null) return 0;
    const from = mark;
    return messages.filter((message) => !message.mine && message.seq > from).length;
  }

  let snapshot = build();

  function publish(): void {
    const next = build();
    const same = (Object.keys(next) as (keyof RoomChatSnapshot)[]).every(
      (key) => next[key] === snapshot[key],
    );
    if (same) return;
    snapshot = next;
    for (const listener of listeners) listener();
  }

  function readUpTo(seq: number): void {
    if (mark === seq) return;
    mark = seq;
    if (code !== null) saveMark(code, seq);
  }

  function clearBubbleTimer(): void {
    if (bubbleTimer !== undefined) clearTimeout(bubbleTimer);
    bubbleTimer = undefined;
  }

  function startBubbleTimer(): void {
    clearBubbleTimer();
    if (bubble === null || bubblePaused || play?.held === true) return;
    bubbleTimer = setTimeout(() => {
      bubbleTimer = undefined;
      bubble = null;
      publish();
    }, BUBBLE_MS);
  }

  function clearIncoming(): void {
    clearBubbleTimer();
    if (reactionTimer !== undefined) clearTimeout(reactionTimer);
    reactionTimer = undefined;
    bubble = null;
    reaction = null;
    waitingBubble = null;
    bubblePaused = false;
  }

  function showIncoming(message: ChatMessageView): void {
    // A throw on the screen: the count goes up now, the message shows once it is over.
    if (play?.held === true) {
      waitingBubble = message;
      return;
    }
    if (message.body.kind === "reaction") {
      reaction = message;
      if (reactionTimer !== undefined) clearTimeout(reactionTimer);
      reactionTimer = setTimeout(() => {
        reactionTimer = undefined;
        reaction = null;
        publish();
      }, REACTION_MS);
      return;
    }
    bubble = message;
    startBubbleTimer();
  }

  /** Which messages of this player still count, and whether that blocks sending now. */
  function updateSlow(now: number): void {
    for (const [id, at] of sentAt) {
      if (now - at >= SEND_WINDOW_MS) sentAt.delete(id);
    }
    if (sentAt.size < CHAT_LIMIT) {
      if (slowUntil !== null && now < slowUntil && slowTimer !== undefined) return;
      slowUntil = null;
      return;
    }
    const oldest = Math.min(...sentAt.values());
    holdSlowUntil(oldest + SEND_WINDOW_MS);
  }

  function holdSlowUntil(until: number): void {
    slowUntil = until;
    if (slowTimer !== undefined) clearTimeout(slowTimer);
    slowTimer = setTimeout(
      () => {
        slowTimer = undefined;
        slowUntil = null;
        updateSlow(Date.now());
        publish();
      },
      Math.max(0, until - Date.now()),
    );
  }

  /** A text is in the room: the field clears only if it still holds those very words. */
  function clearDraftOf(sent: string): void {
    if (draft !== sent) return;
    // Clearing the field in the middle of a composition would break the IME's text.
    if (composing) clearAfterComposing = sent;
    else draft = "";
  }

  /** Follows the connection: runs for every room and every change of its status. */
  function sync(): void {
    const current = connection.getSnapshot();
    ({ you, status } = current);
    const { room } = current;
    // The first room after a greeting may hold anything from the time without a connection.
    const greeted = lastStatus !== CONNECTION_STATUS.Online && status === CONNECTION_STATUS.Online;
    lastStatus = status;
    code = room?.code ?? code;
    const list = room?.chat ?? [];
    if (!sameMessages(messages, list)) messages = list;
    visible = chatVisible(room, you);
    gameId = room !== null && you !== null && !room.seats.includes(null) ? room.gameId : null;

    if (you !== null && code !== null) {
      if (seen === null) {
        seen = lastSeq(messages);
        mark = readMark(code) ?? mark ?? seen;
        saveMark(code, mark);
      }
      const from = seen;
      const fresh = messages.filter((message) => message.seq > from);
      if (fresh.length > 0) {
        seen = lastSeq(fresh);
        const now = Date.now();
        // From another tab of this player, as it happens: that counts. The same after reconnecting
        // may be old by any amount, and the room's copy says nothing of when it was sent.
        for (const message of fresh) {
          if (!greeted && message.mine && !sentAt.has(message.id)) sentAt.set(message.id, now);
        }
        updateSlow(now);
        const incoming = fresh.filter((message) => !message.mine).at(-1);
        if (open || muted) {
          readUpTo(lastSeq(messages));
        } else if (incoming !== undefined) {
          announced = { message: incoming, count: (announced?.count ?? 0) + 1 };
          showIncoming(incoming);
        }
      }
    }

    confirm();
    publish();
  }

  /** A message of this player that the room now shows is settled, even after it was told as failed. */
  function confirm(): void {
    const inRoom = (id: string) => messages.some((message) => message.mine && message.id === id);
    if (pending !== null && inRoom(pending.id)) {
      pending = null;
      clearAnswerTimer();
    }
    if (failure !== null && inRoom(failure.id)) failure = null;
    // Also when what is told has moved on since: the same words typed again are a new message.
    if (lastText !== null && inRoom(lastText.id)) {
      clearDraftOf(lastText.draft);
      lastText = null;
    }
  }

  /** The greeting after a lost connection does not show a message on its way: it did not arrive. */
  function onSynced(): void {
    if (pending === null) return;
    failure = { ...pending, reason: CHAT_FAILURE.NotSent };
    pending = null;
    clearAnswerTimer();
    publish();
  }

  function clearAnswerTimer(): void {
    if (answerTimer !== undefined) clearTimeout(answerTimer);
    answerTimer = undefined;
  }

  function send(attempt: Attempt): void {
    if (pending !== null || status !== CONNECTION_STATUS.Online) return;
    const now = Date.now();
    updateSlow(now);
    if (slowUntil !== null) {
      publish();
      return;
    }
    if (!connection.send({ type: "chat", id: attempt.id, body: attempt.body })) return;
    pending = attempt;
    failure = null;
    sentAt.set(attempt.id, now);
    updateSlow(now);
    clearAnswerTimer();
    answerTimer = setTimeout(() => {
      answerTimer = undefined;
      if (pending === null) return;
      failure = { ...pending, reason: CHAT_FAILURE.NotSent };
      pending = null;
      publish();
      // Perhaps half-dead: the greeting brings the room, which tells whether it was written.
      connection.reconnect();
    }, ANSWER_LIMIT_MS);
    publish();
  }

  function onRejected(code_: string, id: string | undefined): void {
    const attempt = pending;
    if (attempt === null || (id !== undefined && id !== attempt.id)) return;
    pending = null;
    clearAnswerTimer();
    // Not written: it does not count against the limit.
    sentAt.delete(attempt.id);
    if (code_ === ROOM_ERROR.ChatTooFast) {
      const now = Date.now();
      updateSlow(now);
      // Other tabs may have sent more than this page knows: at worst, a whole window from now.
      if (slowUntil === null) holdSlowUntil(now + SEND_WINDOW_MS);
      // A text stays in the field to send again; a preset or a reaction has nowhere else to stay.
      if (attempt.draft === null) failure = { ...attempt, reason: CHAT_FAILURE.NotSent };
      publish();
      return;
    }
    failure = {
      ...attempt,
      reason:
        code_ === ROOM_ERROR.Unavailable || code_ === ROOM_ERROR.InvalidMessage
          ? CHAT_FAILURE.NotSent
          : CHAT_FAILURE.Refused,
    };
    updateSlow(Date.now());
    publish();
  }

  const chat: RoomChat = {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start: () => {
      muted = readChatMuted();
      const stop = [
        connection.subscribe(sync),
        connection.onSynced(onSynced),
        connection.onRejected(({ request, code: rejection, id }) => {
          if (request === "chat") onRejected(rejection, id);
        }),
        subscribeChatMuted(() => {
          chat.setMuted(readChatMuted());
        }),
      ];
      sync();
      return () => {
        for (const unsubscribe of stop) unsubscribe();
        clearAnswerTimer();
        clearIncoming();
        if (slowTimer !== undefined) clearTimeout(slowTimer);
        slowTimer = undefined;
        slowUntil = null;
      };
    },
    setOpen: (next) => {
      if (open === next) return;
      open = next;
      if (open) {
        clearIncoming();
        announced = null;
        readUpTo(lastSeq(messages));
      }
      publish();
    },
    setDraft: (next) => {
      draft = next;
      clearAfterComposing = null;
      publish();
    },
    pauseBubble: (paused) => {
      bubblePaused = paused;
      if (paused) clearBubbleTimer();
      else startBubbleTimer();
    },
    dismissBubble: () => {
      clearBubbleTimer();
      bubble = null;
      publish();
    },
    sendDraft: () => {
      const text = sanitizeChatText(draft);
      if (text === null) return;
      const id = lastText?.text === text ? lastText.id : randomId();
      if (pending !== null || status !== CONNECTION_STATUS.Online) return;
      lastText = { id, text, draft };
      send({ id, body: { kind: "text", text }, draft });
    },
    sendQuick: (body) => {
      send({ id: randomId(), body, draft: null });
    },
    retry: () => {
      if (failure === null) return;
      // A text as the field holds it now: edited, it is a new message. Emptied, or a preset or a
      // reaction: what failed.
      if (failure.draft !== null && draft.trim() !== "") chat.sendDraft();
      else send(failure);
    },
    setMuted: (next) => {
      if (muted === next) {
        publish();
        return;
      }
      muted = next;
      if (muted) {
        clearIncoming();
        announced = null;
        writeChatMuted(true);
      } else {
        writeChatMuted(false);
      }
      // Both ways: back on, what came meanwhile is not unread, even under a mark older than this
      // page, kept from before a reload while muted.
      readUpTo(lastSeq(messages));
      publish();
    },
    setPlay: (next) => {
      const releasing = play?.held === true && next?.held !== true;
      const holding = play?.held !== true && next?.held === true;
      play = next;
      // Out of reach under the throw, a bubble on screen does not use up its time.
      if (holding) clearBubbleTimer();
      if (releasing) startBubbleTimer();
      if (releasing && waitingBubble !== null && !open && !muted) {
        const message = waitingBubble;
        waitingBubble = null;
        showIncoming(message);
      }
      publish();
    },
    setComposing: (next) => {
      composing = next;
      if (composing || clearAfterComposing === null) return;
      if (draft === clearAfterComposing) draft = "";
      clearAfterComposing = null;
      publish();
    },
    registerButton: (next) => {
      button = next;
      publish();
    },
    registerNotesSlot: (slot) => {
      notesSlot = slot;
      publish();
    },
    focusButton: () => {
      button?.focus({ preventScroll: true });
    },
    resume: () => {
      connection.resume();
    },
  };
  return chat;
}

/** The chat of `connection`, for as long as it is mounted. Its identity never changes with it. */
export function useRoomChat(connection: RoomConnection): RoomChat {
  const chat = useMemo(() => createRoomChat(connection), [connection]);
  useEffect(() => chat.start(), [chat]);
  return chat;
}

export function useRoomChatSnapshot(chat: RoomChat): RoomChatSnapshot {
  return useSyncExternalStore(chat.subscribe, chat.getSnapshot, chat.getSnapshot);
}

/** One value of the chat's state: renders only when it changes, not for every key typed. */
export function useRoomChatValue<Value>(
  chat: RoomChat,
  select: (snapshot: RoomChatSnapshot) => Value,
): Value {
  const read = () => select(chat.getSnapshot());
  return useSyncExternalStore(chat.subscribe, read, read);
}
