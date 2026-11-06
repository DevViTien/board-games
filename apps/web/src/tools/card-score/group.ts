import { z } from "zod";

import { parsePlayerName } from "@/features/identity/identity";

import { SCORE_LIMIT, type Scores } from "./score-logic";

const GROUP_FORMAT = 1;
export const MIN_ACTIVE_PLAYERS = 2;
export const MAX_ACTIVE_PLAYERS = 8;
/** Everyone a group has ever had, those resting included. */
export const MAX_PLAYERS = 16;
export const MAX_ROUNDS = 500;
export const MAX_GROUP_NAME_LENGTH = 40;

export interface CardScorePlayer {
  readonly id: string;
  readonly name: string;
  readonly active: boolean;
}

/** One round: only those who were playing then have a score in it. */
export interface CardScoreRound {
  readonly id: string;
  readonly at: string;
  readonly scores: Scores;
}

export interface CardScoreGroup {
  readonly format: typeof GROUP_FORMAT;
  readonly id: string;
  /** Empty: the group goes by its players' names (`displayName`). */
  readonly name: string;
  readonly players: readonly CardScorePlayer[];
  readonly rounds: readonly CardScoreRound[];
  /** Player ids are short ("p1", "p2") and never used twice, to keep a long group small. */
  readonly nextPlayerId: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const CARD_SCORE_ERROR = {
  groupGone: "group-gone",
  groupNewer: "group-newer",
  groupCorrupt: "group-corrupt",
  scoreMismatch: "score-mismatch",
  roundGone: "round-gone",
  roundLimit: "round-limit",
  playerGone: "player-gone",
  playerHasScores: "player-has-scores",
  nameInvalid: "name-invalid",
  nameTaken: "name-taken",
  groupNameInvalid: "group-name-invalid",
  tooFewPlayers: "too-few-players",
  tooManyPlayers: "too-many-players",
  playerLimit: "player-limit",
} as const;

export type CardScoreErrorCode = (typeof CARD_SCORE_ERROR)[keyof typeof CARD_SCORE_ERROR];

/** A change a group refuses: the app says why from its code. */
export class CardScoreError extends Error {
  override readonly name = "CardScoreError";
  readonly code: CardScoreErrorCode;
  /** With `name-taken`: the player who has the name. */
  readonly player: CardScorePlayer | undefined;

  constructor(code: CardScoreErrorCode, player?: CardScorePlayer) {
    super(code);
    this.code = code;
    this.player = player;
  }
}

const scoreSchema = z.number().int().min(-SCORE_LIMIT).max(SCORE_LIMIT);

// Names are plain strings here: the rules for a name apply when it is typed, so tightening them one
// day does not turn old groups unreadable.
const groupSchema = z
  .object({
    format: z.literal(GROUP_FORMAT),
    id: z.string().min(1),
    name: z.string(),
    players: z.array(z.object({ id: z.string().min(1), name: z.string(), active: z.boolean() })),
    rounds: z.array(
      z.object({
        id: z.string().min(1),
        at: z.string(),
        scores: z.record(z.string(), scoreSchema),
      }),
    ),
    nextPlayerId: z.number().int().positive(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .superRefine((group, context) => {
    const ids = new Set(group.players.map((player) => player.id));
    if (ids.size !== group.players.length) {
      context.addIssue({ code: "custom", message: "duplicate player id" });
    }
    if (new Set(group.rounds.map((round) => round.id)).size !== group.rounds.length) {
      context.addIssue({ code: "custom", message: "duplicate round id" });
    }
    for (const round of group.rounds) {
      if (Object.keys(round.scores).some((id) => !ids.has(id))) {
        context.addIssue({ code: "custom", message: "score of an unknown player" });
      }
    }
    for (const id of ids) {
      if (Number(id.slice(1)) >= group.nextPlayerId) {
        context.addIssue({ code: "custom", message: "player id not below nextPlayerId" });
      }
    }
  });

export type StoredGroup =
  | { readonly kind: "saved"; readonly group: CardScoreGroup }
  | { readonly kind: "newer" }
  | { readonly kind: "corrupt" };

/** What the storage holds under a group's key: never trusted as it is. */
export function readGroup(raw: unknown): StoredGroup {
  const format = (raw as { format?: unknown } | null | undefined)?.format;
  if (typeof format === "number" && format > GROUP_FORMAT) return { kind: "newer" };
  const parsed = groupSchema.safeParse(raw);
  return parsed.success ? { kind: "saved", group: parsed.data } : { kind: "corrupt" };
}

/** The group's name, or its players' when it has none. */
export function displayName(group: Pick<CardScoreGroup, "name" | "players">): string {
  if (group.name !== "") return group.name;
  return group.players
    .filter((player) => player.active)
    .map((player) => player.name)
    .join(", ");
}

/** The name as it is kept, or `null` when too long. */
export function parseGroupName(raw: string): string | null {
  const name = raw.normalize("NFC").trim();
  // Nothing to see in it: it would show as a blank title, so it counts as no name.
  if (name.replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\s]/gu, "") === "") return "";
  return Array.from(name).length <= MAX_GROUP_NAME_LENGTH ? name : null;
}

/** What two names must differ in: not the case. */
export function nameKey(name: string): string {
  return name.normalize("NFC").trim().toLocaleLowerCase();
}

function checkedPlayerName(raw: string): string {
  const name = parsePlayerName(raw);
  if (name === null) throw new CardScoreError(CARD_SCORE_ERROR.nameInvalid);
  return name;
}

function checkNameFree(group: CardScoreGroup, name: string, except?: string): void {
  const taken = group.players.find(
    (player) => player.id !== except && nameKey(player.name) === nameKey(name),
  );
  if (taken !== undefined) throw new CardScoreError(CARD_SCORE_ERROR.nameTaken, taken);
}

function activeCount(group: CardScoreGroup): number {
  return group.players.filter((player) => player.active).length;
}

function touched(group: CardScoreGroup, now: Date): CardScoreGroup {
  return { ...group, updatedAt: now.toISOString() };
}

function findPlayer(group: CardScoreGroup, playerId: string): CardScorePlayer {
  const player = group.players.find((candidate) => candidate.id === playerId);
  if (player === undefined) throw new CardScoreError(CARD_SCORE_ERROR.playerGone);
  return player;
}

function withPlayer(
  group: CardScoreGroup,
  playerId: string,
  change: Partial<CardScorePlayer>,
): CardScoreGroup {
  return {
    ...group,
    players: group.players.map((player) =>
      player.id === playerId ? { ...player, ...change } : player,
    ),
  };
}

function hasScores(group: CardScoreGroup, playerId: string): boolean {
  return group.rounds.some((round) => playerId in round.scores);
}

export interface NewGroupInput {
  readonly id: string;
  readonly name: string;
  readonly playerNames: readonly string[];
}

export function createGroup(input: NewGroupInput, now: Date): CardScoreGroup {
  const name = parseGroupName(input.name);
  if (name === null) throw new CardScoreError(CARD_SCORE_ERROR.groupNameInvalid);
  if (input.playerNames.length < MIN_ACTIVE_PLAYERS) {
    throw new CardScoreError(CARD_SCORE_ERROR.tooFewPlayers);
  }
  if (input.playerNames.length > MAX_ACTIVE_PLAYERS) {
    throw new CardScoreError(CARD_SCORE_ERROR.tooManyPlayers);
  }
  const at = now.toISOString();
  let group: CardScoreGroup = {
    format: GROUP_FORMAT,
    id: input.id,
    name,
    players: [],
    rounds: [],
    nextPlayerId: 1,
    createdAt: at,
    updatedAt: at,
  };
  for (const playerName of input.playerNames) group = addPlayer(group, playerName, now);
  return group;
}

function checkScores(scores: Scores): void {
  const values = Object.values(scores);
  const sum = values.reduce((total, score) => total + score, 0);
  const fits = values.every((score) => Number.isInteger(score) && Math.abs(score) <= SCORE_LIMIT);
  if (sum !== 0 || !fits) throw new CardScoreError(CARD_SCORE_ERROR.scoreMismatch);
}

/**
 * A new round. Its id was chosen when the round was opened, so saving it again (a double press, a
 * retry after an answer that came too late) adds no second one: a duplicate round still adds up to
 * 0, and nothing else would ever catch it.
 */
export function addRound(
  group: CardScoreGroup,
  round: { readonly id: string; readonly scores: Scores },
  now: Date,
): CardScoreGroup {
  const saved = group.rounds.find((existing) => existing.id === round.id);
  if (saved !== undefined) {
    const same =
      Object.keys(saved.scores).length === Object.keys(round.scores).length &&
      Object.entries(round.scores).every(([playerId, score]) => saved.scores[playerId] === score);
    // Saved with other numbers: the answer came too late, and the player corrected them meanwhile.
    return same ? group : editRound(group, round.id, round.scores, now);
  }
  if (group.rounds.length >= MAX_ROUNDS) throw new CardScoreError(CARD_SCORE_ERROR.roundLimit);
  checkScores(round.scores);
  const known = new Set(group.players.map((player) => player.id));
  if (Object.keys(round.scores).some((id) => !known.has(id))) {
    throw new CardScoreError(CARD_SCORE_ERROR.playerGone);
  }
  return touched({ ...group, rounds: [...group.rounds, { ...round, at: now.toISOString() }] }, now);
}

/** New scores for a round: the same players, never one more. */
export function editRound(
  group: CardScoreGroup,
  roundId: string,
  scores: Scores,
  now: Date,
): CardScoreGroup {
  const round = group.rounds.find((candidate) => candidate.id === roundId);
  if (round === undefined) throw new CardScoreError(CARD_SCORE_ERROR.roundGone);
  checkScores(scores);
  const before = Object.keys(round.scores);
  if (
    before.length !== Object.keys(scores).length ||
    before.some((playerId) => !(playerId in scores))
  ) {
    throw new CardScoreError(CARD_SCORE_ERROR.playerGone);
  }
  return touched(
    {
      ...group,
      rounds: group.rounds.map((candidate) =>
        candidate.id === roundId ? { ...candidate, scores } : candidate,
      ),
    },
    now,
  );
}

export function deleteRound(group: CardScoreGroup, roundId: string, now: Date): CardScoreGroup {
  if (!group.rounds.some((round) => round.id === roundId)) {
    throw new CardScoreError(CARD_SCORE_ERROR.roundGone);
  }
  return touched({ ...group, rounds: group.rounds.filter((round) => round.id !== roundId) }, now);
}

export function renameGroup(group: CardScoreGroup, raw: string, now: Date): CardScoreGroup {
  const name = parseGroupName(raw);
  if (name === null) throw new CardScoreError(CARD_SCORE_ERROR.groupNameInvalid);
  return touched({ ...group, name }, now);
}

export function renamePlayer(
  group: CardScoreGroup,
  playerId: string,
  raw: string,
  now: Date,
): CardScoreGroup {
  findPlayer(group, playerId);
  const name = checkedPlayerName(raw);
  checkNameFree(group, name, playerId);
  return touched(withPlayer(group, playerId, { name }), now);
}

export function addPlayer(group: CardScoreGroup, raw: string, now: Date): CardScoreGroup {
  const name = checkedPlayerName(raw);
  checkNameFree(group, name);
  if (group.players.length >= MAX_PLAYERS) throw new CardScoreError(CARD_SCORE_ERROR.playerLimit);
  if (activeCount(group) >= MAX_ACTIVE_PLAYERS) {
    throw new CardScoreError(CARD_SCORE_ERROR.tooManyPlayers);
  }
  return touched(
    {
      ...group,
      players: [...group.players, { id: `p${group.nextPlayerId}`, name, active: true }],
      nextPlayerId: group.nextPlayerId + 1,
    },
    now,
  );
}

/** A player sits out from now on, keeping their scores and their place in the standings. */
export function restPlayer(group: CardScoreGroup, playerId: string, now: Date): CardScoreGroup {
  findPlayer(group, playerId);
  if (activeCount(group) <= MIN_ACTIVE_PLAYERS) {
    throw new CardScoreError(CARD_SCORE_ERROR.tooFewPlayers);
  }
  return touched(withPlayer(group, playerId, { active: false }), now);
}

export function returnPlayer(group: CardScoreGroup, playerId: string, now: Date): CardScoreGroup {
  findPlayer(group, playerId);
  if (activeCount(group) >= MAX_ACTIVE_PLAYERS) {
    throw new CardScoreError(CARD_SCORE_ERROR.tooManyPlayers);
  }
  return touched(withPlayer(group, playerId, { active: true }), now);
}

/** Removes a player for good: only one without a score, and never below two playing. */
export function removePlayer(group: CardScoreGroup, playerId: string, now: Date): CardScoreGroup {
  const player = findPlayer(group, playerId);
  if (hasScores(group, playerId)) throw new CardScoreError(CARD_SCORE_ERROR.playerHasScores);
  if (player.active && activeCount(group) <= MIN_ACTIVE_PLAYERS) {
    throw new CardScoreError(CARD_SCORE_ERROR.tooFewPlayers);
  }
  return touched({ ...group, players: group.players.filter((p) => p.id !== playerId) }, now);
}

/** Whether a player can only rest, not go: they have a score in some round. */
export function playerHasScores(group: CardScoreGroup, playerId: string): boolean {
  return hasScores(group, playerId);
}

/** What "Buổi mới" fills the form with: the name and those playing now. */
export function newSessionDraft(group: CardScoreGroup): {
  readonly name: string;
  readonly playerNames: readonly string[];
} {
  return {
    name: group.name,
    playerNames: group.players.filter((player) => player.active).map((player) => player.name),
  };
}
