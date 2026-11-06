import { StateScreen } from "@board-games/ui";
import type { ComponentProps, ReactNode } from "react";

import { AppTopBar } from "./AppTopBar";

/**
 * `StateScreen` (loading, not found, failed) with the app's top bar above it: the way back to the
 * menu or to `back`, the theme and the language, as on every page.
 */
export function AppStateScreen({
  back,
  ...props
}: Omit<ComponentProps<typeof StateScreen>, "topBar"> & { readonly back?: ReactNode }) {
  return <StateScreen {...props} topBar={<AppTopBar back={back} />} />;
}
