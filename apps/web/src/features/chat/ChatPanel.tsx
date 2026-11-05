"use client";

import {
  CHAT_KEPT,
  CHAT_PRESETS,
  CHAT_REACTIONS,
  CHAT_TEXT_MAX_LENGTH,
  type ChatMessageView,
} from "@board-games/protocol";
import {
  Button,
  CircleAlertIcon,
  ClockIcon,
  cn,
  Input,
  MessageCircleIcon,
  MessageCircleOffIcon,
  RotateCwIcon,
  SendIcon,
  WifiOffIcon,
  XIcon,
  ZapIcon,
} from "@board-games/ui";
import { useTranslations } from "next-intl";
import {
  type CSSProperties,
  type KeyboardEvent,
  memo,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { CONNECTION_STATUS } from "@/transport/types";

import { CHAT_REACTION_EMOJI, useChatBodyText } from "./chat-content";
import { CHAT_PANEL_ID } from "./ChatButton";
import { CHAT_LAYOUT, type ChatLayout, isTouchScreen } from "./use-chat-placement";
import { CHAT_FAILURE, type RoomChat, type RoomChatSnapshot } from "./use-room-chat";

/** The counter shows from this many characters. */
const COUNT_FROM = 160;
/** Scrolled this close to the end still counts as reading the latest message. */
const NEAR_END_PX = 24;
/** An Enter or Esc that belongs to the IME (`keyCode` 229 is Safari's order of events). */
function isImeKey(event: KeyboardEvent): boolean {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- the only way to tell in Safari, whose compositionend comes before this keydown
  return event.nativeEvent.isComposing || event.keyCode === 229;
}

interface ChatLineProps {
  readonly tone: "muted" | "warning" | "danger" | "info";
  readonly icon?: ReactNode;
  readonly id?: string | undefined;
  readonly alert?: boolean;
  readonly children: ReactNode;
  readonly action?: ReactNode;
}

const LINE_TONES = {
  muted: "bg-surface-muted font-normal text-fg-muted",
  warning: "bg-warning-soft text-warning-ink",
  danger: "bg-danger-soft text-danger-ink",
  info: "bg-accent-soft text-accent-ink",
} as const;

/** One line of the panel, above the messages: what the connection does, what went wrong. */
function ChatLine({ tone, icon, id, alert = false, children, action }: ChatLineProps) {
  return (
    <div
      id={id}
      role={alert ? "alert" : undefined}
      className={cn(
        "flex flex-none items-center gap-2 px-3 py-1.5 text-caption font-semibold",
        LINE_TONES[tone],
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{children}</span>
      {action}
    </div>
  );
}

const LINE_ICON = "size-4 flex-none";

/** A small button inside a line: its colours are the line's. */
const LINE_BUTTON =
  "focus-ring inline-flex min-h-8 flex-none cursor-pointer items-center gap-1 rounded-control border-[1.5px] border-current bg-surface px-2.5 text-caption font-bold aria-disabled:cursor-not-allowed aria-disabled:border-dashed";

interface ChatMessagesProps {
  readonly messages: readonly ChatMessageView[];
  /** A message of this player is on its way. */
  readonly sending: boolean;
}

/** The messages, kept from rendering again for a key typed: there may be 30 of them. */
const ChatMessages = memo(function ChatMessages({ messages, sending }: ChatMessagesProps) {
  const t = useTranslations("Chat");
  const bodyText = useChatBodyText();
  const list = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const [hasNew, setHasNew] = useState(false);
  const last = messages.at(-1);

  const toEnd = () => {
    const element = list.current;
    if (element === null) return;
    element.scrollTop = element.scrollHeight;
    pinned.current = true;
    setHasNew(false);
  };

  // Not while reading older messages: they stay where they are, and a button offers the new ones.
  useLayoutEffect(() => {
    if (pinned.current || last?.mine === true) {
      const element = list.current;
      if (element !== null) element.scrollTop = element.scrollHeight;
      pinned.current = true;
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- whether the list was scrolled away from its end is only known once the new message is in the page
    if (last !== undefined) setHasNew(true);
    // Only a new message: it is the latest `seq` that matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last?.seq]);

  // A keyboard or a turned phone resizes the list: the latest message stays in view.
  useEffect(() => {
    const element = list.current;
    if (element === null || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => {
      if (pinned.current) element.scrollTop = element.scrollHeight;
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1">
      <div
        ref={list}
        role="log"
        aria-label={t("log")}
        aria-relevant="additions"
        // The messages scroll under a keyboard's reach too: the list is a stop for Tab.
        tabIndex={0}
        className="focus-ring flex min-w-0 flex-1 [scrollbar-width:thin] flex-col overflow-y-auto overscroll-contain px-3 py-2"
        onScroll={(event) => {
          const element = event.currentTarget;
          pinned.current =
            element.scrollHeight - element.scrollTop - element.clientHeight <= NEAR_END_PX;
          if (pinned.current) setHasNew(false);
        }}
      >
        {messages.length === 0 ? (
          <div className="m-auto px-3 py-2 text-center text-small text-fg-muted">
            <MessageCircleIcon aria-hidden className="mx-auto mb-1.5 size-6" />
            {t("empty")}
          </div>
        ) : (
          <>
            {/* Pushes the first message down while they are few: they read from the bottom. */}
            <div className="mt-auto" />
            {messages.length >= CHAT_KEPT && (
              <p className="mb-2 flex-none self-center text-center text-caption text-fg-muted">
                {t("kept", { count: CHAT_KEPT })}
              </p>
            )}
            {messages.map((message, index) => {
              const previous = messages[index - 1];
              const same = previous?.mine === message.mine && previous.name === message.name;
              const { body, mine } = message;
              return (
                <div
                  key={message.seq}
                  data-chat-message=""
                  data-mine={mine || undefined}
                  className={cn(
                    "flex max-w-[86%] flex-none flex-col",
                    mine ? "items-end self-end" : "items-start self-start",
                    same ? "mt-0.5" : "mt-2.5",
                  )}
                >
                  {/* Whose it is, for a reader who hears one message at a time. */}
                  {mine || same ? (
                    <span className="sr-only">
                      {t("said", { name: mine ? t("you") : message.name })}
                    </span>
                  ) : (
                    <span className="mb-0.5 ml-0.5 max-w-full truncate text-caption font-semibold text-fg-muted">
                      <bdi>{message.name}</bdi>
                    </span>
                  )}
                  {body.kind === "text" && (
                    <p
                      dir="auto"
                      className={cn(
                        // `overflow-clip` keeps stacked marks inside the bubble.
                        "max-w-full overflow-clip rounded-control px-2.5 py-1.5 text-small [overflow-wrap:anywhere]",
                        mine
                          ? "bg-accent text-accent-fg"
                          : "border border-border bg-surface text-fg",
                      )}
                    >
                      {body.text}
                    </p>
                  )}
                  {body.kind === "preset" && (
                    <p
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border-[1.5px] bg-surface px-2.5 py-1 text-caption font-semibold",
                        mine
                          ? "border-accent-ink text-accent-ink"
                          : "border-border-control text-fg",
                      )}
                    >
                      <ZapIcon aria-hidden className="size-3" />
                      {bodyText(body)}
                    </p>
                  )}
                  {body.kind === "reaction" && (
                    <p role="img" aria-label={bodyText(body)} className="text-title">
                      {CHAT_REACTION_EMOJI[body.reaction]}
                    </p>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
      {hasNew && (
        <Button
          size="sm"
          className="absolute bottom-2 left-1/2 z-10 h-8 -translate-x-1/2 rounded-full bg-fg px-3 text-caption text-bg shadow-none hover:bg-fg active:translate-y-0"
          onClick={toEnd}
        >
          {t("newMessages")}
        </Button>
      )}
      {/* Not `role="status"`: that is the turn line's, and this must not cut it short. */}
      <span className="sr-only" aria-live="polite">
        {sending ? t("sending") : ""}
      </span>
    </div>
  );
});

interface ChatPanelProps {
  readonly chat: RoomChat;
  readonly snapshot: RoomChatSnapshot;
  readonly layout: ChatLayout;
  /** The keyboard is up: the quick row gives its room to the messages. */
  readonly keyboard: boolean;
  /** Where it goes: measured, so not a matter of classes. */
  readonly style: CSSProperties;
  readonly className: string;
}

/**
 * The chat itself, the same on every screen: who is speaking, what can be sent in one tap, and the
 * field. In the page only while open: `role="log"` then reads new messages, and nothing else does.
 */
export function ChatPanel({ chat, snapshot, layout, keyboard, style, className }: ChatPanelProps) {
  const t = useTranslations("Chat");
  const bodyText = useChatBodyText();
  const titleId = useId();
  const reasonId = useId();
  const emptyReasonId = useId();
  const input = useRef<HTMLInputElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const notesSlot = useRef<HTMLDivElement>(null);
  const { status, draft, draftProblem, draftLength, pending, failure, slow, muted, play } =
    snapshot;
  const online = status === CONNECTION_STATUS.Online;
  const stopped = status === CONNECTION_STATUS.Idle || status === CONNECTION_STATUS.Paused;
  const busy = pending !== null;
  const canSendNow = online && !busy && !slow;
  const canSendDraft = canSendNow && draft.trim() !== "" && draftProblem === null;
  const covers = layout !== CHAT_LAYOUT.Phone;
  const inGame = play !== null;

  // Reads with the keyboard at hand on a laptop; on a touch screen, opening must not raise it just
  // to read what was said.
  useEffect(() => {
    (isTouchScreen() ? close.current : input.current)?.focus({ preventScroll: true });
  }, []);

  // What the panel covers of a board's words comes to its head, while it covers them.
  const hasNotesSlot = covers && inGame;
  useEffect(() => {
    if (!hasNotesSlot) return undefined;
    chat.registerNotesSlot(notesSlot.current);
    return () => {
      chat.registerNotesSlot(null);
    };
  }, [chat, hasNotesSlot]);

  function closePanel(): void {
    chat.setOpen(false);
    chat.focusButton();
  }

  /** Why the field and the buttons do nothing now, read with them. */
  let offlineReason: ReactNode = null;
  if (stopped) {
    offlineReason = (
      <ChatLine
        tone="warning"
        id={reasonId}
        icon={<ClockIcon aria-hidden className={LINE_ICON} />}
        action={
          <button type="button" className={LINE_BUTTON} onClick={chat.resume}>
            {t("resume")}
          </button>
        }
      >
        {status === CONNECTION_STATUS.Idle ? t("idle") : t("paused")}
      </ChatLine>
    );
  } else if (!online) {
    offlineReason = (
      <ChatLine
        tone="warning"
        id={reasonId}
        icon={<WifiOffIcon aria-hidden className={LINE_ICON} />}
      >
        {t("reconnecting")}
      </ChatLine>
    );
  } else if (slow) {
    offlineReason = (
      <ChatLine
        tone="warning"
        id={reasonId}
        alert
        icon={<ClockIcon aria-hidden className={LINE_ICON} />}
      >
        {t("tooFast")}
      </ChatLine>
    );
  }
  // The same line, whichever it is: only one says why at a time.
  const describedBy = offlineReason === null ? undefined : reasonId;
  const draftEmpty = draft.trim() === "";

  const failureLine =
    failure === null || !online ? null : (
      <ChatLine
        tone="danger"
        alert
        icon={<CircleAlertIcon aria-hidden className={LINE_ICON} />}
        action={
          failure.reason === CHAT_FAILURE.NotSent ? (
            <button
              type="button"
              aria-disabled={slow}
              className={LINE_BUTTON}
              onClick={() => {
                if (!slow) chat.retry();
              }}
            >
              <RotateCwIcon aria-hidden className="size-3.5" />
              {t("retry")}
            </button>
          ) : null
        }
      >
        {failure.reason === CHAT_FAILURE.Refused
          ? t("refused")
          : failure.body.kind === "text"
            ? t("failed")
            : t("failedQuick", { text: bodyText(failure.body) })}
      </ChatLine>
    );

  const draftLine =
    draftProblem === null ? null : (
      <ChatLine
        tone="danger"
        id={offlineReason === null ? reasonId : undefined}
        icon={<CircleAlertIcon aria-hidden className={LINE_ICON} />}
      >
        {draftProblem === "too-long" ? t("tooLong", { max: CHAT_TEXT_MAX_LENGTH }) : t("invisible")}
      </ChatLine>
    );

  const quickDisabled = !canSendNow;
  const ignoreRepeat = (event: KeyboardEvent) => {
    // A key held down on a button would click it over and over.
    if (event.repeat) event.preventDefault();
  };

  return (
    <section
      id={CHAT_PANEL_ID}
      aria-labelledby={titleId}
      // `PlayScreen` leaves the focus here when the game replaces the lobby.
      data-keeps-focus=""
      data-chat-panel={layout}
      inert={play?.held === true || undefined}
      style={style}
      className={cn("flex min-h-0 flex-col bg-surface text-fg", className)}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || isImeKey(event)) return;
        // A dialog's own Esc: it sits above the chat.
        if (document.querySelector("dialog[open]") !== null) return;
        event.stopPropagation();
        closePanel();
      }}
    >
      <div className="relative flex min-h-12 flex-none items-center gap-1.5 border-b border-border py-0.5 pr-1 pl-3 max-lg:pt-2 short-landscape:pt-0.5">
        {layout === CHAT_LAYOUT.Phone && (
          <span
            aria-hidden
            className="absolute top-1.5 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full bg-border-control"
          />
        )}
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-body/tight font-bold">
            {t("title")}
          </h2>
          {covers && inGame && !play.over && (
            <p className="line-clamp-2 text-caption text-fg-muted">{play.turnLine}</p>
          )}
          {/* What the panel covers of a board's own words. Empty lines keep no room here. */}
          {hasNotesSlot && (
            <div
              ref={notesSlot}
              data-chat-notes=""
              className="text-caption text-fg-muted [&_p]:min-h-0! [&_p]:text-caption! [&_p:empty]:hidden"
            />
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={muted}
          className="focus-ring flex min-h-11 flex-none cursor-pointer items-center gap-1.5 rounded-control px-1.5 text-caption font-semibold hover:bg-surface-muted"
          onClick={() => {
            chat.setMuted(!muted);
          }}
        >
          {t("mute")}
          <span
            aria-hidden
            className={cn(
              "relative h-5 w-9 flex-none rounded-full border-[1.5px] transition-colors duration-(--duration-fast) motion-reduce:transition-none",
              muted ? "border-accent bg-accent" : "border-border-control bg-surface",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 size-3 rounded-full transition-transform duration-(--duration-fast) motion-reduce:transition-none",
                muted ? "translate-x-4 bg-accent-fg" : "bg-fg-muted",
              )}
            />
          </span>
        </button>
        <button
          ref={close}
          type="button"
          aria-label={t("close")}
          className="focus-ring inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-control hover:bg-surface-muted"
          onClick={closePanel}
        >
          <XIcon aria-hidden className="size-5" />
        </button>
      </div>

      {/* What the panel covers and is needed now comes with it. */}
      {covers &&
        inGame &&
        play.over &&
        layout === CHAT_LAYOUT.Landscape &&
        play.rematch !== null && (
          <ChatLine
            tone="info"
            action={
              <button
                type="button"
                className={LINE_BUTTON}
                onClick={(event) => {
                  play.rematch?.run(event.currentTarget);
                }}
              >
                {play.rematch.label}
              </button>
            }
          >
            {play.turnLine}
          </ChatLine>
        )}
      {covers && inGame && !play.over && play.claim !== null && (
        <ChatLine
          tone="info"
          action={
            <button
              type="button"
              aria-disabled={!play.claim.available}
              className={LINE_BUTTON}
              onClick={(event) => {
                if (play.claim?.available === true) play.claim.run(event.currentTarget);
              }}
            >
              {play.claim.label}
            </button>
          }
        >
          {play.turnLine}
        </ChatLine>
      )}
      {muted && (
        <ChatLine tone="muted" icon={<MessageCircleOffIcon aria-hidden className={LINE_ICON} />}>
          <strong className="font-semibold text-fg">{t("mutedTitle")}</strong> {t("mutedDetail")}
        </ChatLine>
      )}
      {offlineReason}
      {failureLine}
      {draftLine}

      <ChatMessages messages={snapshot.messages} sending={busy} />

      {!keyboard && (
        <div
          role="group"
          aria-label={t("quick")}
          className="flex flex-none [scrollbar-width:none] items-center gap-1 overflow-x-auto border-t border-border px-3 py-0.5"
        >
          {CHAT_REACTIONS.map((reaction) => (
            <button
              key={reaction}
              type="button"
              aria-label={t("sendReaction", { name: t(`reaction.${reaction}`) })}
              aria-disabled={quickDisabled}
              aria-describedby={describedBy}
              className="focus-ring size-10 flex-none cursor-pointer rounded-control text-2xl/none hover:bg-surface-muted aria-disabled:cursor-not-allowed aria-disabled:opacity-55 aria-disabled:grayscale"
              onKeyDown={ignoreRepeat}
              onClick={() => {
                if (!quickDisabled) chat.sendQuick({ kind: "reaction", reaction });
              }}
            >
              {CHAT_REACTION_EMOJI[reaction]}
            </button>
          ))}
          <span aria-hidden className="mx-1 h-6 w-px flex-none bg-border" />
          {CHAT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-disabled={quickDisabled}
              aria-describedby={describedBy}
              className="focus-ring my-0.5 h-10 flex-none cursor-pointer rounded-full border-[1.5px] border-border-control bg-surface px-3 text-caption font-semibold whitespace-nowrap hover:bg-surface-muted aria-disabled:cursor-not-allowed aria-disabled:border-dashed aria-disabled:bg-surface-muted aria-disabled:text-fg-muted"
              onKeyDown={ignoreRepeat}
              onClick={() => {
                if (!quickDisabled) chat.sendQuick({ kind: "preset", preset });
              }}
            >
              {t(`preset.${preset}`)}
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(
          "flex flex-none items-center gap-2 px-3 pt-1.5",
          keyboard ? "pb-2" : "pb-safe-2",
        )}
      >
        <div className="relative min-w-0 flex-1">
          <Input
            ref={input}
            value={draft}
            aria-label={t("inputLabel")}
            aria-describedby={describedBy ?? (draftProblem === null ? undefined : reasonId)}
            aria-invalid={draftProblem !== null}
            placeholder={
              stopped ? t("placeholderIdle") : online ? t("inputLabel") : t("placeholderOffline")
            }
            name="chat-message"
            enterKeyHint="send"
            autoComplete="off"
            className={cn("h-11 px-3", draftLength >= COUNT_FROM && "pr-16")}
            onChange={(event) => {
              chat.setDraft(event.target.value);
            }}
            onCompositionStart={() => {
              chat.setComposing(true);
            }}
            onCompositionEnd={() => {
              chat.setComposing(false);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || isImeKey(event)) return;
              event.preventDefault();
              // Held down: one message, not one for every repeat.
              if (!event.repeat) chat.sendDraft();
            }}
          />
          {draftLength >= COUNT_FROM && (
            <span
              className={cn(
                "absolute top-1/2 right-2.5 -translate-y-1/2 bg-surface pl-1 text-caption tabular-nums",
                draftLength >= CHAT_TEXT_MAX_LENGTH ? "text-danger-ink" : "text-fg-muted",
              )}
            >
              {t("charCount", { count: draftLength, max: CHAT_TEXT_MAX_LENGTH })}
            </span>
          )}
        </div>
        <Button
          size="icon"
          aria-label={busy ? t("sending") : t("send")}
          aria-disabled={!canSendDraft}
          aria-describedby={
            describedBy ??
            (draftProblem !== null ? reasonId : draftEmpty && !busy ? emptyReasonId : undefined)
          }
          // Keeps the on-screen keyboard up.
          onPointerDown={(event) => {
            event.preventDefault();
          }}
          onClick={chat.sendDraft}
        >
          {busy ? (
            <span
              aria-hidden
              className="block size-5 animate-spin rounded-full border-[2.5px] border-current border-r-transparent motion-reduce:animate-[spin_2.4s_linear_infinite]"
            />
          ) : (
            <SendIcon aria-hidden className="size-5" />
          )}
        </Button>
        {draftEmpty && (
          <p id={emptyReasonId} className="sr-only">
            {t("nothingToSend")}
          </p>
        )}
      </div>
    </section>
  );
}
