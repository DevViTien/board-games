import { afterEach, describe, expect, it, vi } from "vitest";

import { CHAT_COLUMN_KEY } from "@/config/storage-keys";

import { CHAT_COLUMN, readChatColumn, writeChatColumn } from "./chat-column";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("the chat's column choice", () => {
  it("is open when nothing was chosen", () => {
    expect(readChatColumn()).toBe(CHAT_COLUMN.Open);
  });

  it("remembers a collapsed column", () => {
    writeChatColumn(CHAT_COLUMN.Collapsed);
    expect(window.localStorage.getItem(CHAT_COLUMN_KEY)).toBe('"collapsed"');
    expect(readChatColumn()).toBe(CHAT_COLUMN.Collapsed);
  });

  it("is open when storage holds anything else", () => {
    window.localStorage.setItem(CHAT_COLUMN_KEY, '"sideways"');
    expect(readChatColumn()).toBe(CHAT_COLUMN.Open);
    window.localStorage.setItem(CHAT_COLUMN_KEY, "{not json");
    expect(readChatColumn()).toBe(CHAT_COLUMN.Open);
  });

  it("is open when storage cannot be read, and writing does not throw", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readChatColumn()).toBe(CHAT_COLUMN.Open);
    expect(() => {
      writeChatColumn(CHAT_COLUMN.Collapsed);
    }).not.toThrow();
  });
});
