import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import vi from "../../messages/vi.json";
import { clientMessages } from "./client-messages";

describe("clientMessages", () => {
  it.each([
    ["vi", vi],
    ["en", en],
    ["ja", ja],
  ])("leaves out the rules and keeps every other namespace (%s)", (_locale, messages) => {
    const sent = clientMessages(messages);

    expect(sent).not.toHaveProperty("Rules");
    expect(Object.keys(sent).toSorted()).toEqual(
      Object.keys(messages)
        .filter((namespace) => namespace !== "Rules")
        .toSorted(),
    );
  });
});
