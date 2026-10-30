// idb-keyval creates a store only when its database is first created, so every purpose (saved
// games now, statistics later) gets its own database instead of sharing one.
export const SAVED_GAMES_DB = "board-games-saved-games";
export const SAVED_GAMES_STORE = "saved-games";
