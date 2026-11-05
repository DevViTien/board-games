import { CHAT_PRESETS, CHAT_REACTIONS } from "@board-games/protocol";
import { describe, expect, it } from "vitest";

import en from "../../../messages/en.json";
import ja from "../../../messages/ja.json";
import vi from "../../../messages/vi.json";
import { CHAT_REACTION_EMOJI } from "./chat-content";

describe("what the protocol's ids mean to the app", () => {
  const catalogues = { vi, en, ja };

  it.each(Object.entries(catalogues))("%s names every preset", (_locale, messages) => {
    for (const preset of CHAT_PRESETS) expect(messages.Chat.preset[preset]).toBeTruthy();
    expect(Object.keys(messages.Chat.preset)).toHaveLength(CHAT_PRESETS.length);
  });

  it.each(Object.entries(catalogues))(
    "Tên đọc được của emoji: %s names every reaction",
    (_locale, messages) => {
      for (const reaction of CHAT_REACTIONS) expect(messages.Chat.reaction[reaction]).toBeTruthy();
      expect(Object.keys(messages.Chat.reaction)).toHaveLength(CHAT_REACTIONS.length);
    },
  );

  it("draws every reaction", () => {
    for (const reaction of CHAT_REACTIONS) expect(CHAT_REACTION_EMOJI[reaction]).toBeTruthy();
    expect(new Set(Object.values(CHAT_REACTION_EMOJI)).size).toBe(CHAT_REACTIONS.length);
  });
});
