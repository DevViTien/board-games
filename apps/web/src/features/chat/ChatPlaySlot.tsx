"use client";

import { useEffect, useMemo } from "react";

import { ChatButton } from "./ChatButton";
import type { ChatSlotContext, RoomChat } from "./use-room-chat";

interface ChatPlaySlotProps extends ChatSlotContext {
  readonly chat: RoomChat;
}

/**
 * The chat's place in the row of the game's buttons: its button, and what the play screen must tell
 * the chat floating above it (the throw on screen, the turn line the panel may cover). Only a real
 * change of those reaches the chat: the play screen rendering again tells it nothing new.
 */
export function ChatPlaySlot({
  chat,
  held,
  turnLine,
  over,
  claimLabel,
  claimAvailable,
  onClaim,
  rematchLabel,
  onRematch,
}: ChatPlaySlotProps) {
  const claim = useMemo(
    () =>
      claimLabel === null ? null : { label: claimLabel, available: claimAvailable, run: onClaim },
    [claimLabel, claimAvailable, onClaim],
  );
  const rematch = useMemo(
    () => (rematchLabel === null ? null : { label: rematchLabel, available: true, run: onRematch }),
    [rematchLabel, onRematch],
  );

  useEffect(() => {
    chat.setPlay({ held, turnLine, over, claim, rematch });
  }, [chat, held, turnLine, over, claim, rematch]);

  useEffect(
    () => () => {
      chat.setPlay(null);
    },
    [chat],
  );

  return <ChatButton chat={chat} />;
}
