// Games planned for the MVP that have no rules yet; the menu shows them as "coming soon". This is
// product content, not rules, so it lives in the app. Names come from the "Games" messages.
export const PLANNED_GAMES = [
  { id: "caro", players: { min: 2, max: 2 }, durationMinutes: 5 },
  { id: "ludo", players: { min: 2, max: 4 }, durationMinutes: 20 },
  { id: "chess", players: { min: 2, max: 2 }, durationMinutes: 20 },
] as const;
