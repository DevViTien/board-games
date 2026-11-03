"use client";

import { PlayLoadError, type PlayLoadErrorProps } from "@/features/play/PlayLoadError";

/** The room failed, most likely loading the game's code; see `PlayLoadError`. */
export default function RoomPageError(props: PlayLoadErrorProps) {
  return <PlayLoadError {...props} />;
}
