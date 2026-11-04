"use client";

import { PageError, type PageErrorProps } from "@/features/shell/PageError";

/** Any page that failed (the menu, a room's page outside its own boundary); see `PageError`. */
export default function RootError(props: PageErrorProps) {
  return <PageError {...props} />;
}
