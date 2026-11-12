// idb-keyval creates a store only when its database is first created, so every purpose (saved
// games now, statistics later) gets its own database instead of sharing one.
export const SAVED_GAMES_DB = "board-games-saved-games";
export const SAVED_GAMES_STORE = "saved-games";

// localStorage: the setup screen's last choices, one entry per game ("<prefix><gameId>").
export const SETUP_CHOICE_KEY_PREFIX = "board-games:setup:";

// localStorage: the player's temporary name and random id for online play (`features/identity`).
export const IDENTITY_KEY = "board-games:identity";

// sessionStorage: who a room page is in this tab, one entry per room ("<prefix><code>"), so a
// reload greets with the id that holds the seat even when another tab remembered another one.
export const ROOM_IDENTITY_KEY_PREFIX = "board-games:room-identity:";

// localStorage: whether the player muted the chat, for every room of this browser.
export const CHAT_MUTED_KEY = "board-games:chat-muted";

// localStorage: whether the chat's column of a wide screen is open or collapsed, for every room.
export const CHAT_COLUMN_KEY = "board-games:chat-column";

// sessionStorage: the last chat message read, by its `seq`, one entry per room ("<prefix><code>").
export const CHAT_READ_KEY_PREFIX = "board-games:chat-read:";

// Cookie: the theme the player picked ("light" or "dark"; none follows the system). A cookie, not
// localStorage, so the server renders the page in that theme from the first paint.
export const THEME_COOKIE = "theme";

// IndexedDB: the card score tool's groups, a database of its own (see above).
export const CARD_SCORE_DB = "board-games-card-score";
export const CARD_SCORE_STORE = "groups";

// sessionStorage: the new round being typed, one entry per group ("<prefix><groupId>").
export const CARD_SCORE_DRAFT_KEY_PREFIX = "board-games:card-score-draft:";

// localStorage: the player changed the round screen's keypad for the device's own keyboard.
export const CARD_SCORE_KEYBOARD_KEY = "board-games:card-score-keyboard";

// localStorage: Gom thạch's progress (solved levels and best moves) and each level's attempt
// ("<prefix><levelId>", the history of its moves), so a reload goes on where the player was.
export const JELLY_GATHER_PROGRESS_KEY = "board-games:jelly-gather:progress";
export const JELLY_GATHER_ATTEMPT_KEY_PREFIX = "board-games:jelly-gather:attempt:";
