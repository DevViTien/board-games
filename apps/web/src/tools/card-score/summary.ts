import type { CardScoreGroup, CardScorePlayer } from "./group";

export interface Standing {
  readonly player: CardScorePlayer;
  readonly total: number;
  /** 1, 1, 3: the same total, the same place. */
  readonly place: number;
  readonly wins: number;
}

/** How many rounds each player came first in: strictly above 0, all those tied each count one. */
function roundWins(group: CardScoreGroup): ReadonlyMap<string, number> {
  const wins = new Map<string, number>();
  for (const round of group.rounds) {
    const top = Math.max(...Object.values(round.scores));
    if (top <= 0) continue;
    for (const [playerId, score] of Object.entries(round.scores)) {
      if (score === top) wins.set(playerId, (wins.get(playerId) ?? 0) + 1);
    }
  }
  return wins;
}

/** Everyone, those resting too, highest total first; a tie keeps the group's order. */
export function standings(group: CardScoreGroup): readonly Standing[] {
  const totals = new Map<string, number>();
  for (const round of group.rounds) {
    for (const [playerId, score] of Object.entries(round.scores)) {
      totals.set(playerId, (totals.get(playerId) ?? 0) + score);
    }
  }
  const wins = roundWins(group);
  const sorted = group.players
    .map((player, order) => ({ player, order, total: totals.get(player.id) ?? 0 }))
    .sort((a, b) => b.total - a.total || a.order - b.order);

  let place = 1;
  return sorted.map(({ player, total }, index) => {
    const before = sorted[index - 1];
    if (before !== undefined && total < before.total) place = index + 1;
    return { player, total, place, wins: wins.get(player.id) ?? 0 };
  });
}

export interface Settlement {
  readonly from: CardScorePlayer;
  readonly to: CardScorePlayer;
  readonly amount: number;
}

/**
 * Who moves how many points to whom for every total to reach 0: the one who owes most to the one
 * owed most, again and again, ties in the order given. At most one move fewer than the players not
 * at 0; finding the very fewest is a hard problem that eight players do not deserve, so the app
 * calls this a suggestion. Each move settles somebody, so it always ends, even on totals that do
 * not add up to 0.
 */
export function settlements(
  totals: readonly Pick<Standing, "player" | "total">[],
): readonly Settlement[] {
  const owed = totals.filter(({ total }) => total > 0).map((t) => ({ ...t, left: t.total }));
  const owing = totals.filter(({ total }) => total < 0).map((t) => ({ ...t, left: -t.total }));
  const moves: Settlement[] = [];

  for (;;) {
    const payer = largest(owing);
    const payee = largest(owed);
    if (payer === undefined || payee === undefined) return moves;
    const amount = Math.min(payer.left, payee.left);
    moves.push({ from: payer.player, to: payee.player, amount });
    payer.left -= amount;
    payee.left -= amount;
  }
}

function largest<T extends { left: number }>(entries: readonly T[]): T | undefined {
  let best: T | undefined;
  for (const entry of entries) {
    if (entry.left > 0 && (best === undefined || entry.left > best.left)) best = entry;
  }
  return best;
}

/** The words of the shared summary, in the player's language. */
export interface SummaryWords {
  readonly header: (name: string, date: string, rounds: number) => string;
  readonly standing: (place: number, name: string, total: string) => string;
  readonly settlementsTitle: () => string;
  readonly settlement: (from: string, to: string, amount: number) => string;
  readonly formatScore: (score: number) => string;
}

/** The summary as plain text, to send to a group chat. */
export function summaryText(
  group: Pick<CardScoreGroup, "rounds">,
  name: string,
  date: string,
  table: readonly Standing[],
  words: SummaryWords,
): string {
  const moves = settlements(table);
  return [
    words.header(name, date, group.rounds.length),
    ...table.map(({ place, player, total }) =>
      words.standing(place, player.name, words.formatScore(total)),
    ),
    ...(moves.length === 0
      ? []
      : [
          "",
          words.settlementsTitle(),
          ...moves.map(({ from, to, amount }) => words.settlement(from.name, to.name, amount)),
        ]),
  ].join("\n");
}
