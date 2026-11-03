"use client";

import type { GameResult, PlayerIndex } from "@board-games/engine";
import { Badge, cn } from "@board-games/ui";
import { useTranslations } from "next-intl";

import type { GameUI } from "@/games/types";
import type { SeatView } from "@/transport/types";

interface PlayerPanelProps<State> {
  readonly ui: Pick<GameUI<State, never>, "usePlayerLabel" | "useSeatSummary" | "SeatMark">;
  readonly state: State;
  readonly seats: readonly SeatView[];
  readonly currentPlayer: PlayerIndex;
  readonly result: GameResult | null;
  /** The one seat of a person here, or `null` when every seat is a person on this device. */
  readonly viewer: PlayerIndex | null;
  /** Online: whether this device's connection is lost for a while (or paused); `null` offline. */
  readonly connectionLost: boolean | null;
  /** The AI is choosing the move of the seat to move. */
  readonly thinking: boolean;
  readonly className?: string | undefined;
}

/** Whose turn it is, or who won: a seat's chip. */
type SeatBadge = "turn" | "winner" | null;

function noSummary(): () => null {
  return () => null;
}

/** The mark of a seat when the game draws none: its symbol (X, O) in the game's colours. */
function SymbolMark({ player, symbol }: { player: PlayerIndex; symbol: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-full items-center justify-center rounded-full border border-game-line/40 bg-game-board text-small font-extrabold",
        player === 0 ? "text-game-mark-1" : player === 1 ? "text-game-mark-2" : "text-fg",
      )}
    >
      {symbol}
    </span>
  );
}

/** Three dots that pulse one after another while the AI thinks; still with reduced motion. */
function ThinkingDots() {
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center gap-0.5">
      {["", "[animation-delay:150ms]", "[animation-delay:300ms]"].map((delay) => (
        <span
          key={delay}
          className={cn(
            "size-1 animate-thinking-dots rounded-full bg-current motion-reduce:animate-none",
            delay,
          )}
        />
      ))}
    </span>
  );
}

/**
 * Every seat in the order of play, as compact rows: the seat's mark, its name as the mode tells it
 * ("X", "You · X", "Computer · O", "Minh · O"), and a line under it with the chips (whose turn it
 * is, in words, never colour alone; the winner; online, whether this device is connected, in words
 * other than the connection line's) and words saying who plays the seat (this device, the AI and
 * its level, a remote player) and how it fares. At most 40 px high beside the board, where the turn
 * chip sits at the end of the row; on a phone's narrow tile the chips never get cut: the words
 * shorten (`SeatSummary.short`), then wrap under them. Not a live region: the play screen's turn
 * line is the one status of the page.
 */
export function PlayerPanel<State>({
  ui,
  state,
  seats,
  currentPlayer,
  result,
  viewer,
  connectionLost,
  thinking,
  className,
}: PlayerPanelProps<State>) {
  const t = useTranslations("Play");
  const tLevels = useTranslations("Levels");
  const playerLabel = ui.usePlayerLabel();
  const useSeatSummary = ui.useSeatSummary ?? noSummary;
  const summary = useSeatSummary();
  const { SeatMark } = ui;
  const online = connectionLost !== null;

  const rows = seats.map((seat, index) => {
    const player = index;
    const label = playerLabel(player, state);
    const seatSummary = summary(player, state);
    const thinkingHere = thinking && player === currentPlayer && seat.kind === "ai";
    let name: string;
    // Who plays the seat, in words: kept on a narrow tile unless it is "this device".
    let kind: string | null = null;
    let kindOnNarrow = true;
    if (seat.kind === "ai") {
      name = t("ai", { player: label });
      // Online, the room's AI plays at a level nobody chose: not told.
      if (!online) kind = t("aiLevel", { level: tLevels(seat.level) });
    } else if (seat.kind === "remote") {
      name = t("named", { name: seat.name ?? t("opponent"), player: label });
      kind = t("remote");
    } else if (viewer === null) {
      name = label;
      kind = t("here");
      kindOnNarrow = seatSummary === null;
    } else {
      name = t("you", { player: label });
    }
    const words = (narrow: boolean) =>
      [
        thinkingHere || (narrow && !kindOnNarrow) ? null : kind,
        thinkingHere ? null : narrow ? (seatSummary?.short ?? null) : (seatSummary?.full ?? null),
      ]
        .filter((part) => part !== null)
        .join(" · ");
    let badge: SeatBadge = null;
    if (result === null && player === currentPlayer) badge = "turn";
    else if (result?.kind === "win" && result.winners.includes(player)) badge = "winner";
    const connection =
      online && seat.kind === "human" && player === viewer
        ? connectionLost
          ? "lost"
          : "connected"
        : null;
    return {
      player,
      label,
      name,
      badge,
      connection,
      thinkingHere,
      wide: words(false),
      narrow: words(true),
    } as const;
  });

  return (
    <ul
      aria-label={t("players")}
      className={cn(
        "grid gap-2 lg:grid-cols-1 lg:gap-1",
        seats.length > 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
        className,
      )}
    >
      {rows.map(({ player, label, name, badge, connection, thinkingHere, wide, narrow }) => {
        const hasLine =
          badge !== null || connection !== null || thinkingHere || wide !== "" || narrow !== "";
        return (
          <li
            key={player}
            data-player={player}
            className={cn(
              "relative flex min-h-10 items-center gap-2 rounded-control bg-surface px-2 py-0.5",
              badge === "turn"
                ? "border-[1.5px] border-fg ring-[3px] ring-accent-soft"
                : "border-[1.5px] border-border",
            )}
          >
            <span className="size-7 shrink-0">
              {SeatMark === undefined ? (
                <SymbolMark player={player} symbol={label} />
              ) : (
                <SeatMark player={player} state={state} />
              )}
            </span>
            {/* Room kept at the end of the row for the chip beside the board. */}
            <span className={cn("min-w-0 flex-1", badge !== null && "lg:pr-24")}>
              <span className="block truncate text-small leading-5 font-semibold">{name}</span>
              {hasLine && (
                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-caption leading-4 font-normal text-fg-muted">
                  {badge !== null && (
                    <Badge
                      variant={badge === "turn" ? "ink" : "celebration"}
                      className="shrink-0 px-1.5 py-0 leading-4 lg:absolute lg:top-1/2 lg:right-2 lg:-translate-y-1/2"
                    >
                      {badge === "turn" ? t("turnBadge") : t("winnerBadge")}
                    </Badge>
                  )}
                  {connection !== null && (
                    <Badge
                      variant={connection === "lost" ? "warning" : "success"}
                      className="shrink-0 px-1.5 py-0 leading-4"
                    >
                      <span aria-hidden className="size-1.5 rounded-full bg-current" />
                      {connection === "lost"
                        ? t("connectionBadge.lost")
                        : t("connectionBadge.connected")}
                    </Badge>
                  )}
                  {thinkingHere && (
                    <span className="inline-flex shrink-0 items-center gap-1.5">
                      <ThinkingDots />
                      {t("thinking")}
                    </span>
                  )}
                  {wide === narrow ? (
                    wide !== "" && <span className="max-w-full min-w-0 truncate">{wide}</span>
                  ) : (
                    <>
                      <span className="max-w-full min-w-0 truncate max-lg:hidden">{wide}</span>
                      <span className="max-w-full min-w-0 truncate lg:hidden">{narrow}</span>
                    </>
                  )}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
