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

// Cookie: the theme the player picked ("light" or "dark"; none follows the system). A cookie, not
// localStorage, so the server renders the page in that theme from the first paint.
export const THEME_COOKIE = "theme";
