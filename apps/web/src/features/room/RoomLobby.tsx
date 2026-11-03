"use client";

import type { OptionChoiceList, PlayerIndex } from "@board-games/engine";
import type { RegisteredGameId } from "@board-games/games";
import type { RoomView } from "@board-games/protocol";
import { Badge, Button, buttonVariants, Card, Input } from "@board-games/ui";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";

import { parsePlayerName } from "@/features/identity/identity";
import { NameField } from "@/features/identity/NameField";
import { ConnectionNotice } from "@/features/play/ConnectionNotice";
import { useOptionLabels } from "@/lib/use-option-labels";
import { CONNECTION_STATUS, type ConnectionStatus } from "@/transport/types";

type CopyState = "idle" | "copied" | "failed";

const NO_OPTION_CHOICES: readonly OptionChoiceList[] = [];

interface RoomLobbyProps {
  readonly gameId: RegisteredGameId;
  readonly room: RoomView;
  /** The rule options the game offers, to name the room's rules; none by default. */
  readonly optionChoices?: readonly OptionChoiceList[];
  /** This player's seat, or `null` while they have none. */
  readonly you: PlayerIndex | null;
  readonly status: ConnectionStatus;
  /** The name remembered on this browser, offered in the field before "Join game". */
  readonly name: string;
  /**
   * Asks the server for a seat under `name` and remembers that name; `false` when it could not be
   * sent.
   */
  readonly onSit: (name: string) => boolean;
  readonly onResume: () => void;
}

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
  you,
  status,
  name,
  onSit,
  onResume,
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
  const [tried, setTried] = useState(false);
  const [sitting, setSitting] = useState(false);
  // Only rendered in the browser (after the identity is read), so `window` is there.
  const inviteUrl = `${window.location.origin}/room/${room.code}`;
  const canShare = typeof navigator.share === "function";
  const hasEmptySeat = room.seats.some((seat) => seat === null);
  const rules = optionLabels.summary(gameId, optionChoices, room.record.options);

  // A "Join game" lost with the connection may be pressed again once back.
  if (sitting && status !== CONNECTION_STATUS.Online) setSitting(false);

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
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{tGames(`${gameId}.name`)}</h1>
          <Badge className="text-sm">{tPlay("online")}</Badge>
        </div>
        <Link href="/" className={buttonVariants({ variant: "ghost" })}>
          {tPlay("backToMenu")}
        </Link>
      </header>

      <ConnectionNotice status={status} onResume={onResume} />

      <Card className="flex flex-col gap-4 p-6">
        {rules !== null && <p className="font-medium">{t("rules", { rules })}</p>}
        <dl className="flex flex-col gap-1">
          <dt className="text-sm font-medium text-fg-muted">{t("code")}</dt>
          <dd className="font-mono text-2xl font-semibold tracking-widest">{room.code}</dd>
        </dl>
        <div className="flex flex-col gap-2">
          <label htmlFor={linkId} className="text-sm font-medium text-fg-muted">
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
        <h2 id={playersId} className="text-lg font-medium">
          {t("players")}
        </h2>
        <ol className="flex flex-col gap-2">
          {room.seats.map((seat, index) => (
            // Seats are fixed places: the index is their identity.
            <li key={index}>
              <Card className="py-3">
                {seat === null ? (
                  <span className="text-fg-muted">{t("emptySeat")}</span>
                ) : index === you ? (
                  <span className="font-medium">{t("you", { name: seat.name })}</span>
                ) : (
                  <span>{seat.name}</span>
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
          <NameField ref={nameInput} value={draft} onChange={setDraft} showError={tried} />
          <Button type="submit" size="lg" className="self-start" aria-disabled={sitting}>
            {t("sit")}
          </Button>
        </form>
      ) : (
        <p className="text-fg-muted">{t("waitingForFriends")}</p>
      )}
    </main>
  );
}
