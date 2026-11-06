"use client";

import { PageError, type PageErrorProps } from "@/features/shell/PageError";

/** The toolbox or a tool failed; see `PageError`. */
export default function ToolsError(props: PageErrorProps) {
  return <PageError {...props} />;
}
