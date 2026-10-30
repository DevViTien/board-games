// Placeholder until the game registry exists (plan.md M1); the menu will then be generated from game metadata.
// Names and labels come from the "Games" and "Menu" messages, keyed by id.
export const UPCOMING_GAMES = [
  { id: "caro", players: { min: 2, max: 2 }, durationMinutes: 5 },
  { id: "ludo", players: { min: 2, max: 4 }, durationMinutes: 20 },
  { id: "chess", players: { min: 2, max: 2 }, durationMinutes: 20 },
] as const;
