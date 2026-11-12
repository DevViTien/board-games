"use client";

import { PageError, type PageErrorProps } from "@/features/shell/PageError";

/** Gom thạch failed; see `PageError`. */
export default function JellyGatherError(props: PageErrorProps) {
  return <PageError {...props} />;
}
