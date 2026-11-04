"use client";

import { PageError, type PageErrorProps } from "@/features/shell/PageError";

/** The rules page failed; see `PageError`. */
export default function RulesError(props: PageErrorProps) {
  return <PageError {...props} />;
}
