"use client";

import { PlayLoadError, type PlayLoadErrorProps } from "@/features/play/PlayLoadError";

/** The play screen failed, most likely loading the game's code; see `PlayLoadError`. */
export default function PlayError(props: PlayLoadErrorProps) {
  return <PlayLoadError {...props} />;
}
