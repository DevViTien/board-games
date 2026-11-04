import { StateScreen } from "@board-games/ui";
import type { ComponentProps } from "react";

import { AppTopBar } from "./AppTopBar";

/**
 * `StateScreen` (loading, not found, failed) with the app's top bar above it: the way back to the
 * menu, the theme and the language, as on every page.
 */
export function AppStateScreen(props: Omit<ComponentProps<typeof StateScreen>, "topBar">) {
  return <StateScreen {...props} topBar={<AppTopBar />} />;
}
