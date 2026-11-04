/**
 * The page's background (`--bg` of styles.css) in each theme, for what cannot read a CSS variable:
 * the `theme-color` the server sends before any script runs. `styles.test.ts` keeps it equal to the
 * tokens.
 */
export const PAGE_BACKGROUND = { light: "#f6f5f1", dark: "#121322" } as const;
