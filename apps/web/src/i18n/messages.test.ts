import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import vi from "../../messages/vi.json";

interface MessageTree {
  [key: string]: string | MessageTree;
}

/** Flattens nested messages into "Namespace.key" → message. */
function flatten(tree: MessageTree, prefix = ""): Map<string, string> {
  const entries = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") entries.set(path, value);
    else for (const [nested, message] of flatten(value, path)) entries.set(nested, message);
  }
  return entries;
}

/** Top-level ICU argument names, e.g. "{count, plural, ...}" → "count". Plural bodies like "{# player}" are skipped. */
function argumentNames(message: string): string[] {
  const names = [...message.matchAll(/\{\s*([A-Za-z_]\w*)/g)].map((match) => match[1] ?? "");
  return [...new Set(names)].sort();
}

const source = flatten(vi);

describe.each([
  ["en", en],
  ["ja", ja],
])("%s messages", (_locale, messages: MessageTree) => {
  const translated = flatten(messages);

  it("have exactly the same keys as Vietnamese", () => {
    expect([...translated.keys()].sort()).toEqual([...source.keys()].sort());
  });

  it("use the same ICU arguments as Vietnamese", () => {
    for (const [key, message] of source) {
      expect(argumentNames(translated.get(key) ?? ""), key).toEqual(argumentNames(message));
    }
  });

  it("have no empty messages", () => {
    for (const [key, message] of translated) {
      expect(message.trim(), key).not.toBe("");
    }
  });
});
