import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  CHAT_PRESETS,
  CHAT_REACTIONS,
  CHAT_TEXT_MAX_LENGTH,
  cleanChatText,
  looseListSchema,
  parseChatBody,
  sanitizeChatText,
} from "./chat";

describe("sanitizeChatText", () => {
  it("Tin quá dài: keeps 200 code points and refuses 201, counting an emoji once", () => {
    expect(CHAT_TEXT_MAX_LENGTH).toBe(200);
    expect(sanitizeChatText("a".repeat(200))).toHaveLength(200);
    expect(sanitizeChatText("a".repeat(201))).toBeNull();
    expect(sanitizeChatText("👍".repeat(200))).toBe("👍".repeat(200));
    expect(sanitizeChatText("👍".repeat(201))).toBeNull();
    // Measured once cleaned: spaces around a text do not count.
    expect(sanitizeChatText(`  ${"a".repeat(200)}  `)).toHaveLength(200);
  });

  it("refuses a huge paste", () => {
    expect(sanitizeChatText("x".repeat(20_000))).toBeNull();
  });

  it("Ký tự đảo chiều chữ: removes bidi overrides", () => {
    expect(sanitizeChatText("chào\u{202E} bạn")).toBe("chào bạn");
    expect(sanitizeChatText("\u{2066}a\u{2069}\u{200F}b")).toBe("ab");
  });

  it("Emoji ghép giữ nguyên: keeps U+200D between two pictographs", () => {
    for (const emoji of [
      "🧑\u{200D}💻",
      "👨\u{200D}👩\u{200D}👧\u{200D}👦",
      // With the skin tone or the variation selector between the pictograph and the joiner.
      "👩🏽\u{200D}💻",
      "❤\u{FE0F}\u{200D}🔥",
      "🏳\u{FE0F}\u{200D}🌈",
      "🏃\u{200D}♂\u{FE0F}",
    ]) {
      expect(sanitizeChatText(emoji)).toBe(emoji);
    }
  });

  it("removes U+200D elsewhere", () => {
    expect(sanitizeChatText("a\u{200D}b")).toBe("ab");
    expect(sanitizeChatText("🧑\u{200D}b")).toBe("🧑b");
    expect(sanitizeChatText("a\u{200D}💻")).toBe("a💻");
    // Two in a row join nothing.
    expect(sanitizeChatText("🧑\u{200D}\u{200D}💻")).toBe("🧑💻");
    // Another hidden character between them is gone first, so the joiner is still between two.
    expect(sanitizeChatText("🧑\u{200B}\u{200D}💻")).toBe("🧑\u{200D}💻");
  });

  it("keeps tag characters only in an emoji flag", () => {
    const england = "🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}";
    expect(sanitizeChatText(england)).toBe(england);
    expect(sanitizeChatText("a\u{E0067}\u{E0062}b")).toBe("ab");
    // No closing tag: not a flag.
    expect(sanitizeChatText("🏴\u{E0067}\u{E0062}")).toBe("🏴");
  });

  it("turns line breaks into a space, and merges whitespace", () => {
    expect(sanitizeChatText("a\nb\r\nc\rd\u{2028}e\u{2029}f\u{85}g\th")).toBe("a b c d e f g h");
    expect(sanitizeChatText("  a \n\n  b  ")).toBe("a b");
    expect(sanitizeChatText("a\u{3000}b")).toBe("a b");
  });

  it("Tin vô hình: refuses a text with nothing to see", () => {
    for (const blank of [
      "",
      "   ",
      "\n\n",
      "\u{200B}",
      "\u{200D}",
      "\u{3164}",
      "\u{2800}",
      "\u{FFA0}",
      "\u{115F}",
      "\u{1160}",
      "\u{200B}\u{200D}\u{3164}\u{2800} ",
      "\u{FEFF}\u{AD}",
      "\u{FE0F}",
      "\u{301}\u{301}",
    ]) {
      expect(sanitizeChatText(blank), JSON.stringify(blank)).toBeNull();
    }
  });

  it("removes blank letters next to something visible too", () => {
    expect(sanitizeChatText("a\u{3164}b")).toBe("ab");
  });

  it.each([
    ["U+2065", "\u{2065}"],
    ["U+FFF0", "\u{FFF0}"],
    ["U+E0000", "\u{E0000}"],
    ["U+E0080", "\u{E0080}"],
    ["U+E01F0", "\u{E01F0}"],
    ["U+FFFE", "\u{FFFE}"],
    ["U+FDD0", "\u{FDD0}"],
    ["U+FFFC", "\u{FFFC}"],
  ])("Tin vô hình: nothing to see in %s, alone or in a text", (_label, character) => {
    expect(sanitizeChatText(character)).toBeNull();
    expect(sanitizeChatText(`a${character}b`)).toBe("ab");
  });

  it("keeps an emoji with its variation selector, and a keycap", () => {
    for (const emoji of ["❤\u{FE0F}", "1\u{FE0F}\u{20E3}", "☺\u{FE0E}", "🏳\u{FE0F}"]) {
      expect(sanitizeChatText(emoji)).toBe(emoji);
    }
  });

  it("keeps only a flag of valid length: no hidden words in tag characters", () => {
    const tags = (word: string) =>
      Array.from(word, (letter) => String.fromCodePoint(0xe0000 + letter.charCodeAt(0))).join("");
    const flag = (word: string) => `🏴${tags(word)}\u{E007F}`;
    for (const valid of ["gbeng", "gbsct", "gbwls"]) {
      expect(sanitizeChatText(flag(valid))).toBe(flag(valid));
    }
    // Five tag letters and the closing one at most.
    expect(sanitizeChatText(flag("gbengl"))).toBe("🏴");
    expect(sanitizeChatText(flag("hidden message"))).toBe("🏴");
    // Capitals and other tag characters are in no flag.
    expect(sanitizeChatText(flag("GBENG"))).toBe("🏴");
  });

  it("uses no lookbehind: this module is in the menu's chunk, and Safari below 16.4 cannot parse one", () => {
    const source = readFileSync(path.join(import.meta.dirname, "chat.ts"), "utf8");
    expect(source).not.toMatch(/\(\?<[!=]/u);
  });

  it("Dấu chồng quá nhiều: keeps at most four marks on one letter", () => {
    const zalgo = `a${"\u{301}".repeat(100)}b`;
    const kept = sanitizeChatText(zalgo);
    expect(kept).not.toBeNull();
    expect(kept?.match(/\p{M}/gu)).toHaveLength(4);
    expect(kept?.endsWith("b")).toBe(true);
  });

  it("Chữ tiếng Việt có dấu: stores NFC with every mark", () => {
    const nfd = "Ngẫu nhiên".normalize("NFD");
    expect(nfd).not.toBe("Ngẫu nhiên".normalize("NFC"));
    expect(sanitizeChatText(nfd)).toBe("Ngẫu nhiên".normalize("NFC"));
    expect(sanitizeChatText("Đến lượt, Việt, Hoàn tác".normalize("NFD"))).toBe(
      "Đến lượt, Việt, Hoàn tác".normalize("NFC"),
    );
  });

  it("composes letters and marks a hidden character kept apart", () => {
    expect(sanitizeChatText("e\u{200B}\u{301}")).toBe("é");
  });

  it("removes lone surrogates and the replacement character", () => {
    expect(sanitizeChatText("a\u{D83D}b")).toBe("ab");
    expect(sanitizeChatText("a\u{DC00}b")).toBe("ab");
    expect(sanitizeChatText("a\u{FFFD}b")).toBe("ab");
    expect(sanitizeChatText("\u{D83D}")).toBeNull();
  });

  it("removes private use characters but keeps unassigned ones, perhaps a newer emoji", () => {
    expect(sanitizeChatText("a\u{E000}b")).toBe("ab");
    // U+1FAFF is unassigned at the time of writing.
    expect(sanitizeChatText("a\u{1FAFF}b")).toBe("a\u{1FAFF}b");
  });

  it("leaves HTML and links as they are: they are shown as plain text", () => {
    expect(sanitizeChatText("<b>chào</b> https://example.com")).toBe(
      "<b>chào</b> https://example.com",
    );
  });
});

describe("cleanChatText", () => {
  it("gives the text as it would be kept, whatever its length", () => {
    expect(cleanChatText("  a\u{200B}b  ")).toBe("ab");
    expect(cleanChatText("\u{200B}".repeat(300))).toBe("");
    expect(Array.from(cleanChatText("\u{958}".repeat(150)))).toHaveLength(300);
    expect(Array.from(cleanChatText("e\u{301}".repeat(105)))).toHaveLength(105);
  });
});

describe("looseListSchema", () => {
  it("leaves out what it cannot read, item by item", () => {
    expect(looseListSchema(z.number()).parse([1, "two", 3, null])).toEqual([1, 3]);
  });

  it("reads anything but a list as an empty one", () => {
    expect(looseListSchema(z.number()).parse("broken")).toEqual([]);
    expect(looseListSchema(z.number()).parse(undefined)).toEqual([]);
  });
});

describe("parseChatBody", () => {
  it("sanitizes a text", () => {
    expect(parseChatBody({ kind: "text", text: "  a\u{202E} " })).toEqual({
      kind: "text",
      text: "a",
    });
    expect(parseChatBody({ kind: "text", text: "\u{200B}" })).toBeNull();
  });

  it("Câu có sẵn không có trong danh sách: takes only the app's ids", () => {
    for (const preset of CHAT_PRESETS) {
      expect(parseChatBody({ kind: "preset", preset })).toEqual({ kind: "preset", preset });
    }
    for (const reaction of CHAT_REACTIONS) {
      expect(parseChatBody({ kind: "reaction", reaction })).toEqual({ kind: "reaction", reaction });
    }
    expect(parseChatBody({ kind: "preset", preset: "not-a-preset" })).toBeNull();
    expect(parseChatBody({ kind: "reaction", reaction: "hello" })).toBeNull();
  });
});
