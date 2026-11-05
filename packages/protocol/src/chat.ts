import { z } from "zod";

/** What a text message may hold, in code points, so an emoji counts once. */
export const CHAT_TEXT_MAX_LENGTH = 200;

/** How many messages a room keeps. */
export const CHAT_KEPT = 30;

/** How many messages one player may send within `CHAT_WINDOW_MS`, on all their connections. */
export const CHAT_LIMIT = 5;
export const CHAT_WINDOW_MS = 10_000;

/** Ready-made sentences: only the id crosses the network, each reader sees their own language. */
export const CHAT_PRESETS = [
  "hello",
  "nice-move",
  "hurry-up",
  "one-moment",
  "thanks",
  "sorry",
  "good-game",
  "rematch",
] as const;
export type ChatPreset = (typeof CHAT_PRESETS)[number];

/** One-tap reactions, by id; the app draws each as an emoji and names it in the reader's language. */
export const CHAT_REACTIONS = ["like", "laugh", "wow", "sad", "fire", "clap"] as const;
export type ChatReaction = (typeof CHAT_REACTIONS)[number];

/** A message's content as the room keeps and shows it: checked and sanitized. */
export type ChatBody =
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "preset"; readonly preset: ChatPreset }
  | { readonly kind: "reaction"; readonly reaction: ChatReaction };

/**
 * The same as sent by a client: any string, within the size of a frame. A wrong value reaches the
 * room service, which refuses it with `invalid-chat`; failing the message's schema would answer
 * `invalid-message`, which makes the client reconnect.
 */
export const chatBodyInputSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("text"), text: z.string() }),
  z.strictObject({ kind: z.literal("preset"), preset: z.string() }),
  z.strictObject({ kind: z.literal("reaction"), reaction: z.string() }),
]);
export type ChatBodyInput = z.output<typeof chatBodyInputSchema>;

/** A message's content as stored and sent to clients. Unknown fields are dropped. */
export const chatBodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), text: z.string() }),
  z.object({ kind: z.literal("preset"), preset: z.enum(CHAT_PRESETS) }),
  z.object({ kind: z.literal("reaction"), reaction: z.enum(CHAT_REACTIONS) }),
]) satisfies z.ZodType<ChatBody>;

/** A message as one reader sees it: never whose `playerId` sent it, only whether it was them. */
export interface ChatMessageView {
  /** The room's revision when it was written: rises through the room, so also a mark of what was read. */
  readonly seq: number;
  /** Chosen by the sender, unique among their own messages only. */
  readonly id: string;
  /** The sender's name when they sent it. */
  readonly name: string;
  readonly mine: boolean;
  readonly body: ChatBody;
}

const chatMessageViewSchema = z.object({
  seq: z.number().int().nonnegative(),
  id: z.string(),
  name: z.string(),
  mine: z.boolean(),
  body: chatBodySchema,
}) satisfies z.ZodType<ChatMessageView>;

/**
 * A list read item by item: one that cannot be read (damaged, or of a later version) is left out, and
 * anything but a list reads as an empty one, so a bad message never costs the whole room.
 */
export function looseListSchema<Item>(item: z.ZodType<Item>) {
  return z
    .array(z.unknown())
    .catch([])
    .transform((items): readonly Item[] =>
      items.flatMap((candidate) => {
        const parsed = item.safeParse(candidate);
        return parsed.success ? [parsed.data] : [];
      }),
    );
}

/** Loose like every server message; a missing list (a server that predates chat) is an empty one. */
export const chatMessagesSchema = looseListSchema(chatMessageViewSchema);

/** Written by a client for each new message; it stays the same when that message is sent again. */
export const chatIdSchema = z.string().regex(/^[\w-]{8,64}$/u);

/** Characters that break a line, and a tab: whitespace to a reader of one line of text. */
const LINE_BREAKS = /\r\n|[\t\n\v\f\r\u{85}\u{2028}\u{2029}]/gu;

/**
 * Removed outright: bidi overrides that would flip the text around them, zero-width characters,
 * everything a font draws as nothing or as an empty box (default-ignorable code points, assigned or
 * not, noncharacters), private use characters, lone surrogates, an object replacement character,
 * and U+FFFD, what a broken encoding leaves behind.
 *
 * Except a flag made of tag characters (🏴, its code, a closing tag: at most 6 of them, too few to
 * carry hidden words), kept whole by the first alternative; U+200D, which the next step decides; and
 * the variation selectors that make an emoji one (❤️). `\p{Cn}` stays otherwise: an emoji newer than
 * this server is unassigned to it.
 */
const HIDDEN_CHARACTERS =
  /(\u{1F3F4}[\u{E0030}-\u{E0039}\u{E0061}-\u{E007A}]{1,5}\u{E007F})|(?!\u{200D}|\u{FE0E}|\u{FE0F})[\p{Cc}\p{Cf}\p{Co}\p{Cs}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\p{Noncharacter_Code_Point}\u{FFFC}\u{FFFD}]/gu;

/**
 * U+200D only between two pictographs (🧑‍💻), kept by the first alternative; anywhere else it goes.
 * The left one may carry its variation selector or skin tone, which sit between it and the joiner
 * (❤️‍🔥, 👩🏽‍💻). No lookbehind: this module is in the menu's chunk, and Safari below 16.4 cannot parse
 * one, which would break the whole chunk.
 */
const JOINERS =
  /(\p{Extended_Pictographic}(?:\u{FE0F}|[\u{1F3FB}-\u{1F3FF}])?\u{200D})(?=\p{Extended_Pictographic})|\u{200D}/gu;

/** More than this many marks in a row on one letter is a stack that overflows its line. */
const STACKED_MARKS = /(\p{M}{4})\p{M}+/gu;

/**
 * Nothing a reader would see: whitespace, the blank braille cell, what is left of the ignorable
 * characters, and marks with no letter to sit on.
 */
const NOTHING_VISIBLE = /^[\s\p{M}\p{Default_Ignorable_Code_Point}\u{2800}]*$/u;

/**
 * The text of a message as it would be kept, whatever its length; empty when there is nothing to
 * see. The order matters: what is removed may have kept letters and their marks apart, so NFC comes
 * after, and whitespace is merged only then.
 */
export function cleanChatText(raw: string): string {
  const text = raw
    .replace(LINE_BREAKS, " ")
    .replace(HIDDEN_CHARACTERS, (_, flag: string | undefined) => flag ?? "")
    .replace(JOINERS, (_, kept: string | undefined) => kept ?? "")
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(STACKED_MARKS, "$1");
  return NOTHING_VISIBLE.test(text) ? "" : text;
}

/**
 * The text of a message as it is kept and shown, or `null` when there is nothing left to show or it
 * is too long. Pure and used on both sides: the server decides, and the client checks first so that
 * a huge paste never leaves the browser.
 */
export function sanitizeChatText(raw: string): string | null {
  const text = cleanChatText(raw);
  if (text === "") return null;
  return Array.from(text).length > CHAT_TEXT_MAX_LENGTH ? null : text;
}

/** A message's content as a client sent it, checked and sanitized, or `null` when it is refused. */
export function parseChatBody(body: ChatBodyInput): ChatBody | null {
  const parsed = chatBodySchema.safeParse(body);
  if (!parsed.success) return null;
  if (parsed.data.kind !== "text") return parsed.data;
  const text = sanitizeChatText(parsed.data.text);
  return text === null ? null : { kind: "text", text };
}
