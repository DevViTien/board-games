"use client";

import type { GameResult, PlayerIndex } from "@board-games/engine";
import { Badge, cn } from "@board-games/ui";
import { useTranslations } from "next-intl";
import { useId } from "react";

import type { GameUI } from "@/games/types";
import { type SeatView, standInName } from "@/transport/types";

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
  /** Every seat plays on one side: a win is the team's, never marked on one seat. */
  readonly cooperative?: boolean;
  /** Every seat moves at any time: no seat is marked to move. */
  readonly freePlay?: boolean;
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

/** A seat as the panel and the bars around the board show it. */
interface SeatRow {
  readonly player: PlayerIndex;
  readonly label: string;
  readonly name: string;
  readonly badge: SeatBadge;
  readonly connection: "lost" | "connected" | null;
  readonly thinkingHere: boolean;
  /** Who plays the seat and how it fares, in full and on a narrow tile ("" for nothing). */
  readonly wide: string;
  readonly narrow: string;
}

type SeatRowsProps<State> = Omit<PlayerPanelProps<State>, "className">;

/** Every seat's row: its name as the mode tells it, its chips and its words (see `PlayerPanel`). */
function useSeatRows<State>({
  ui,
  state,
  seats,
  currentPlayer,
  result,
  viewer,
  connectionLost,
  thinking,
  cooperative = false,
  freePlay = false,
}: SeatRowsProps<State>): readonly SeatRow[] {
  const t = useTranslations("Play");
  const tLevels = useTranslations("Levels");
  const playerLabel = ui.usePlayerLabel();
  const useSeatSummary = ui.useSeatSummary ?? noSummary;
  const summary = useSeatSummary();
  const online = connectionLost !== null;

  return seats.map((seat, index) => {
    const player = index;
    const label = playerLabel(player, state);
    const seatSummary = summary(player, state);
    const thinkingHere = thinking && player === currentPlayer && seat.kind === "ai";
    let name: string;
    // Who plays the seat, in words: kept on a narrow tile unless it is "this device".
    let kind: string | null = null;
    let kindOnNarrow = true;
    const standIn = standInName(seat);
    if (standIn !== null) {
      // A person's seat the server's AI plays for them: still theirs, under their name.
      name =
        player === viewer
          ? t("you", { player: label })
          : t("named", { name: standIn, player: label });
      kind = t("standIn");
    } else if (seat.kind === "ai") {
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
    if (result === null && player === currentPlayer && !freePlay) badge = "turn";
    else if (!cooperative && result?.kind === "win" && result.winners.includes(player)) {
      badge = "winner";
    }
    const connection = online && player === viewer ? (connectionLost ? "lost" : "connected") : null;
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
}

/** A seat's chips: whose turn it is or who won, and, online, this device's connection. */
function SeatChips({
  row,
  turnClassName,
}: {
  readonly row: SeatRow;
  /** Where the turn or winner chip goes (the panel pins it to the row's end beside the board). */
  readonly turnClassName?: string;
}) {
  const t = useTranslations("Play");
  return (
    <>
      {row.badge !== null && (
        <Badge
          variant={row.badge === "turn" ? "ink" : "celebration"}
          className={cn("shrink-0 px-1.5 py-0 leading-4", turnClassName)}
        >
          {row.badge === "turn" ? t("turnBadge") : t("winnerBadge")}
        </Badge>
      )}
      {row.connection !== null && (
        <Badge
          variant={row.connection === "lost" ? "warning" : "success"}
          className="shrink-0 px-1.5 py-0 leading-4"
        >
          <span aria-hidden className="size-1.5 rounded-full bg-current" />
          {row.connection === "lost" ? t("connectionBadge.lost") : t("connectionBadge.connected")}
        </Badge>
      )}
    </>
  );
}

/** The words under a seat's name: in full beside the board, shorter on a phone. */
function SeatWords({ row }: { readonly row: SeatRow }) {
  if (row.wide === row.narrow) {
    return row.wide === "" ? null : <span className="max-w-full min-w-0 truncate">{row.wide}</span>;
  }
  return (
    <>
      <span className="max-w-full min-w-0 truncate max-lg:hidden">{row.wide}</span>
      <span className="max-w-full min-w-0 truncate lg:hidden">{row.narrow}</span>
    </>
  );
}

/** A seat's mark, the game's own or its symbol. */
function SeatMarkOf<State>({
  ui,
  row,
  state,
}: {
  readonly ui: PlayerPanelProps<State>["ui"];
  readonly row: SeatRow;
  readonly state: State;
}) {
  const { SeatMark } = ui;
  return SeatMark === undefined ? (
    <SymbolMark player={row.player} symbol={row.label} />
  ) : (
    <SeatMark player={row.player} state={state} />
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
export function PlayerPanel<State>({ className, ...props }: PlayerPanelProps<State>) {
  const t = useTranslations("Play");
  const rows = useSeatRows(props);
  const { ui, state, seats } = props;

  return (
    <ul
      aria-label={t("players")}
      className={cn(
        "grid gap-2 lg:grid-cols-1 lg:gap-1",
        seats.length > 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
        className,
      )}
    >
      {rows.map((row) => {
        const { player, name, badge, connection, thinkingHere, wide, narrow } = row;
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
              <SeatMarkOf ui={ui} row={row} state={state} />
            </span>
            {/* Room kept at the end of the row for the chip beside the board. */}
            <span className={cn("min-w-0 flex-1", badge !== null && "lg:pr-24")}>
              <span className="block truncate text-small leading-5 font-semibold">{name}</span>
              {hasLine && (
                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-caption leading-4 font-normal text-fg-muted">
                  <SeatChips
                    row={row}
                    turnClassName="lg:absolute lg:top-1/2 lg:right-2 lg:-translate-y-1/2"
                  />
                  {thinkingHere && (
                    <span className="inline-flex shrink-0 items-center gap-1.5">
                      <ThinkingDots />
                      {t("thinking")}
                    </span>
                  )}
                  <SeatWords row={row} />
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

interface SeatBarProps<State> extends PlayerPanelProps<State> {
  /** The seat the bar is for. */
  readonly player: PlayerIndex;
}

/**
 * One seat as a bar along the board's edge (Chess: above and below it, `BoardParts.seatOrder`): the
 * seat's mark, its name as the mode tells it ("Trắng", "Bạn · Đen", "Minh · Trắng") with the words
 * of the players' panel under it, and its chips at the end of the bar, where a clock may go one day.
 * The same seat as in `PlayerPanel`, told the same way; not a live region either.
 */
export function SeatBar<State>({ player, className, ...props }: SeatBarProps<State>) {
  const t = useTranslations("Play");
  const nameId = useId();
  const row = useSeatRows(props)[player];
  if (row === undefined) return null;
  const turn = row.badge === "turn";
  return (
    <div
      role="group"
      aria-labelledby={nameId}
      data-player={player}
      className={cn(
        "flex h-11 min-w-0 items-center gap-2.5 rounded-control border bg-surface py-0 pr-2.5 pl-1.5",
        turn ? "border-fg shadow-[inset_0_0_0_1px_var(--fg)]" : "border-border",
        className,
      )}
    >
      <span className="size-8 shrink-0">
        <SeatMarkOf ui={props.ui} row={row} state={props.state} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span id={nameId} className="truncate text-small leading-5 font-semibold">
          {row.name}
        </span>
        {(row.wide !== "" || row.narrow !== "" || row.thinkingHere) && (
          <span className="flex min-w-0 items-center gap-1.5 text-caption leading-4 text-fg-muted">
            {row.thinkingHere && (
              <span className="inline-flex shrink-0 items-center gap-1.5">
                <ThinkingDots />
                {t("thinking")}
              </span>
            )}
            <SeatWords row={row} />
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <SeatChips row={row} />
      </span>
    </div>
  );
}
