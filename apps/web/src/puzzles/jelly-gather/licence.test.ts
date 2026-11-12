import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// The Boxoban levels of chapter 5 ship under Apache 2.0 (design §4 of add-jelly-gather-molds):
// the licences page must name the set, its source, every level taken, what was changed, and carry
// the licence in full.

const LICENCES = readFileSync(
  path.join(import.meta.dirname, "../../../public/third-party-licenses.txt"),
  "utf8",
);
const LEVELS_SOURCE = readFileSync(path.join(import.meta.dirname, "levels.ts"), "utf8");

describe("the Boxoban levels' notice", () => {
  const start = LICENCES.indexOf("Boxoban levels");
  const end = LICENCES.indexOf("\n-----", start);
  const section = LICENCES.slice(start, end === -1 ? undefined : end);

  it("names the set, its source at a fixed commit, and says what was changed", () => {
    expect(section).toContain("https://github.com/google-deepmind/boxoban-levels");
    expect(section).toContain("78011d8c86ad423bfb2e1005012393b4c3c24409");
    expect(section).toContain("This is not an official Google product.");
    expect(section).toMatch(/Changes made: /);
    expect(section).toContain("distributed under the same Apache License, Version 2.0");
  });

  it("carries the Apache License 2.0 in full", () => {
    expect(section).toContain("Version 2.0, January 2004");
    expect(section).toContain("TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION");
    expect(section).toContain("END OF TERMS AND CONDITIONS");
  });

  it("lists every level that levels.ts says it took from the set", () => {
    // Each source comment comes just before its level's definition: the next `id:` is its level.
    const taken = [
      ...LEVELS_SOURCE.matchAll(/Boxoban hard\/000\.txt #(\d+)[\s\S]*?id: "(5-\d)"/g),
    ].map((match) => [match[1] ?? "", match[2] ?? ""] as const);
    expect(taken.map(([, id]) => id)).toEqual([
      "5-1",
      "5-2",
      "5-3",
      "5-4",
      "5-5",
      "5-6",
      "5-7",
      "5-8",
    ]);
    for (const [number, id] of taken) {
      expect(section).toMatch(new RegExp(String.raw`#${number} \(${id}\)`));
    }
  });
});
