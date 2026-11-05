"use client";

import { cn } from "@board-games/ui";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { type RoomChat, useRoomChatValue } from "./use-room-chat";

interface ChatNotesProps {
  readonly chat: RoomChat;
  /** The game's words about the position (`BoardParts.notes`), whatever they are. */
  readonly children: ReactNode;
}

/**
 * What a board says about the position, where the chat's panel may cover it: while it does, the
 * words show at the head of the panel instead, like the turn line. Where they were they keep their
 * room, so nothing in the column moves, but are out of sight and out of reach of screen readers, so
 * a live region among them is not read twice.
 */
export function ChatNotes({ chat, children }: ChatNotesProps) {
  const slot = useRoomChatValue(chat, (snapshot) => snapshot.notesSlot);
  return (
    <>
      <div data-chat-covered={slot === null ? undefined : ""} className={cn(slot && "invisible")}>
        {children}
      </div>
      {slot !== null && createPortal(children, slot)}
    </>
  );
}
