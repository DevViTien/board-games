"use client";

import { PlayLoadError, type PlayLoadErrorProps } from "@/features/play/PlayLoadError";

/** The setup screen failed; see `PlayLoadError`. */
export default function SetupError(props: PlayLoadErrorProps) {
  return <PlayLoadError {...props} />;
}
