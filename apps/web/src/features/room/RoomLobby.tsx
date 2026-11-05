"use client";

import type { OptionChoiceList, PlayerIndex } from "@board-games/engine";
import type { RegisteredGameId } from "@board-games/games";
import type { RoomView } from "@board-games/protocol";
import { Badge, Button, Card, Input } from "@board-games/ui";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

import { parsePlayerName } from "@/features/identity/identity";
import { NameField } from "@/features/identity/NameField";
import { ConnectionNotice } from "@/features/play/ConnectionNotice";
import { AppTopBar } from "@/features/shell/AppTopBar";
import { useOptionLabels } from "@/lib/use-option-labels";
import { CONNECTION_STATUS, type ConnectionStatus } from "@/transport/types";

type CopyState = "idle" | "copied" | "failed";

const NO_OPTION_CHOICES: readonly OptionChoiceList[] = [];

interface RoomLobbyProps {
  readonly gameId: RegisteredGameId;
  readonly room: RoomView;
  /** The rule options the game offers, to name the room's rules; none by default. */
  readonly optionChoices?: readonly OptionChoiceList[];
  /** Whether the game has an AI, so the host may give it empty seats; not by default. */
  readonly supportsAI?: boolean;
  /** This player's seat, or `null` while they have none. */
  readonly you: PlayerIndex | null;
  readonly status: ConnectionStatus;
  /**
   * The name remembered on this browser, offered in the field before "Join game"; empty for a
   * visitor who has not chosen one yet, whom the lobby asks for it (change `ask-name-in-lobby`).
   */
  readonly name: string;
  /**
   * Asks the server for a seat under `name` and remembers that name; `false` when it could not be
   * sent.
   */
  readonly onSit: (name: string) => boolean;
  /** The host marks a seat for the AI or empties it again; `false` when it could not be sent. */
  readonly onAiSeat?: (seat: PlayerIndex, on: boolean) => boolean;
  /**
   * Goes up with every AI seat request the server refused: the host's buttons wait no more for an
   * answer then, even one that brought no newer room.
   */
  readonly aiSeatRefusals?: number;
  readonly onResume: () => void;
  /** The room's chat button, on the title row, when the player has someone to talk to. */
  readonly chat?: ReactNode;
}

/**
 * An AI seat request on its way: answered once the seat is as asked, or by a refusal. Any other
 * change of the room (a rename, someone sitting elsewhere) answers nothing.
 */
interface AiSeatRequest {
  readonly seat: PlayerIndex;
  readonly on: boolean;
  readonly refusals: number;
}

/** AI seats are for rooms of three or four (Cờ cá ngựa); the server refuses them in a room for two. */
const MIN_SEATS_FOR_AI = 3;

const cannotSend = () => false;

/**
 * The room while it waits for players, or while this player has no seat yet: the room's rules (for
 * a game with rule options, so whoever opens the invite knows them before joining), the invite
 * link to copy or share, the room code, and who sits where. Opening the link never takes a seat; only
 * "Join game" does, under the name in the field then, so someone who opens their own link in
 * another browser (a chat app's) does not take their friend's seat.
 */
export function RoomLobby({
  gameId,
  room,
  optionChoices = NO_OPTION_CHOICES,
  supportsAI = false,
  you,
  status,
  name,
  onSit,
  onAiSeat = cannotSend,
  aiSeatRefusals = 0,
  onResume,
  chat,
}: RoomLobbyProps) {
  const t = useTranslations("Room");
  const optionLabels = useOptionLabels();
  const tGames = useTranslations("Games");
  const tPlay = useTranslations("Play");
  const linkId = useId();
  const playersId = useId();
  const link = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const [copy, setCopy] = useState<CopyState>("idle");
  const [draft, setDraft] = useState(name);
  // Decided once, when the lobby first shows: a visitor without a name is asked for one here.
  const [asksName] = useState(name === "");
  const [tried, setTried] = useState(false);
  const [sitting, setSitting] = useState(false);
  const [aiSeatRequest, setAiSeatRequest] = useState<AiSeatRequest | null>(null);
  // Only rendered in the browser (after the identity is read), so `window` is there.
  const inviteUrl = `${window.location.origin}/room/${room.code}`;
  const canShare = typeof navigator.share === "function";
  const emptySeats = room.seats.filter((seat) => seat === null).length;
  const hasEmptySeat = emptySeats > 0;
  // Only the host, in a room for three or four, before the game's first move, for a game with an AI.
  const managesAiSeats =
    you !== null &&
    you === room.host &&
    supportsAI &&
    room.seats.length >= MIN_SEATS_FOR_AI &&
    room.record.entries.length === 0;
  const askedSeat = aiSeatRequest === null ? undefined : room.seats[aiSeatRequest.seat];
  const awaitingAiSeat =
    aiSeatRequest !== null &&
    status === CONNECTION_STATUS.Online &&
    aiSeatRequest.refusals === aiSeatRefusals &&
    (aiSeatRequest.on ? askedSeat?.kind !== "ai" : askedSeat !== null);
  const rules = optionLabels.summary(gameId, optionChoices, room.record.options);

  // The name is the one thing to do first: its field takes the focus, its hint read with it.
  useEffect(() => {
    if (asksName) nameInput.current?.focus();
  }, [asksName]);

  // A "Join game" lost with the connection may be pressed again once back.
  if (sitting && status !== CONNECTION_STATUS.Online) setSitting(false);

  function toggleAiSeat(seat: PlayerIndex, on: boolean): void {
    if (awaitingAiSeat) return;
    if (onAiSeat(seat, on)) setAiSeatRequest({ seat, on, refusals: aiSeatRefusals });
  }

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopy("copied");
    } catch {
      // No clipboard (plain http, a refused permission): select the link to copy by hand.
      link.current?.focus();
      link.current?.select();
      setCopy("failed");
    }
  }

  async function shareLink(): Promise<void> {
    try {
      await navigator.share({
        title: t("shareTitle", { game: tGames(`${gameId}.name`) }),
        url: inviteUrl,
      });
    } catch {
      // Cancelled by the player, or refused: nothing to tell.
    }
  }

  function sit(): void {
    setTried(true);
    const parsed = parsePlayerName(draft);
    // Back to the field, so its error is read with it.
    if (parsed === null) nameInput.current?.focus();
    if (parsed === null || sitting) return;
    if (onSit(parsed)) setSitting(true);
  }

  return (
    <>
      {/* The way back to the menu (no name needed), the theme and the language. */}
      <AppTopBar />
      <main className="mx-auto flex max-w-xl flex-col gap-6 pt-8 px-safe-4 pb-safe-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-title">{tGames(`${gameId}.name`)}</h1>
          <Badge>{tPlay("online")}</Badge>
          {chat}
        </div>

        {/* Nothing below would jump much: no space kept while the connection is fine. */}
        <ConnectionNotice status={status} onResume={onResume} reserveSpace={false} />

        <Card className="flex flex-col gap-4 p-6">
          {rules !== null && <p className="font-semibold">{t("rules", { rules })}</p>}
          <dl className="flex flex-col gap-1">
            <dt className="text-sm font-semibold text-fg-muted">{t("code")}</dt>
            <dd className="font-mono text-2xl font-semibold tracking-widest">{room.code}</dd>
          </dl>
          <div className="flex flex-col gap-2">
            <label htmlFor={linkId} className="text-sm font-semibold text-fg-muted">
              {t("inviteLink")}
            </label>
            <Input
              ref={link}
              id={linkId}
              value={inviteUrl}
              readOnly
              onFocus={(event) => {
                event.target.select();
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void copyLink()}>
                {t("copy")}
              </Button>
              {canShare && (
                <Button variant="secondary" onClick={() => void shareLink()}>
                  {t("share")}
                </Button>
              )}
            </div>
            <p aria-live="polite" className="text-sm text-fg-muted">
              {copy === "copied" ? t("copied") : copy === "failed" ? t("copyFailed") : null}
            </p>
          </div>
        </Card>

        <section aria-labelledby={playersId} className="flex flex-col gap-3">
          <h2 id={playersId} className="text-lg font-semibold">
            {t("players")}
          </h2>
          <ol className="flex flex-col gap-2">
            {room.seats.map((seat, index) => (
              // Seats are fixed places: the index is their identity.
              <li key={index}>
                <Card className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span className="flex flex-wrap items-center gap-2">
                    {seat === null ? (
                      <span className="text-fg-muted">{t("emptySeat")}</span>
                    ) : seat.kind === "ai" ? (
                      <span>{t("aiSeat")}</span>
                    ) : index === you ? (
                      <span className="font-semibold">{t("you", { name: seat.name })}</span>
                    ) : (
                      <span>{seat.name}</span>
                    )}
                    {index === room.host && <Badge>{t("host")}</Badge>}
                  </span>
                  {/* One button in the same place either way, so the focus stays on it once the
                    seat changes. */}
                  {managesAiSeats && (seat === null || seat.kind === "ai") && (
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-disabled={awaitingAiSeat}
                      aria-label={
                        seat !== null
                          ? t("removeAiLabel", { seat: index + 1 })
                          : emptySeats === 1
                            ? t("addAiAndStartLabel", { seat: index + 1 })
                            : t("addAiLabel", { seat: index + 1 })
                      }
                      onClick={() => {
                        toggleAiSeat(index, seat === null);
                      }}
                    >
                      {seat === null ? t("addAi") : t("removeAi")}
                    </Button>
                  )}
                </Card>
              </li>
            ))}
          </ol>
        </section>

        {you === null && hasEmptySeat ? (
          <form
            className="flex flex-col gap-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              sit();
            }}
          >
            <NameField
              ref={nameInput}
              value={draft}
              onChange={setDraft}
              showError={tried}
              hint={asksName ? t("nameHint") : undefined}
            />
            <Button type="submit" className="self-start" aria-disabled={sitting}>
              {t("sit")}
            </Button>
          </form>
        ) : (
          <p className="text-fg-muted">{t("waitingForFriends")}</p>
        )}
      </main>
    </>
  );
}
