import { listOptionChoices, type OptionChoiceList } from "@board-games/engine";
import { GAMES } from "@board-games/games";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Locale } from "@/i18n/config";
import { renderWithIntl } from "@/test/render-with-intl";

import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import vi from "../../messages/vi.json";
import { GAME_ENTRY_LOADERS } from "../games/registry";
import { useOptionLabels } from "./use-option-labels";

const CARO_CHOICES: readonly OptionChoiceList[] = [
  { name: "size", values: [15, 19] },
  { name: "rule", values: ["blocked-ends", "free"] },
];

function Summary(props: {
  readonly gameId: string;
  readonly choices: readonly OptionChoiceList[];
  readonly options: unknown;
}) {
  const labels = useOptionLabels();
  return <p>{labels.summary(props.gameId, props.choices, props.options) ?? "none"}</p>;
}

function summary(
  gameId: string,
  choices: readonly OptionChoiceList[],
  options: unknown,
  locale: Locale = "vi",
) {
  const view = renderWithIntl(<Summary gameId={gameId} choices={choices} options={options} />, {
    locale,
  });
  const text = screen.getByRole("paragraph").textContent;
  view.unmount();
  return text;
}

const LOCALES = { vi, en, ja } as const;

/** The message at a dotted path of the messages of `locale` (Vietnamese by default), or `undefined`. */
function message(path: string, locale: keyof typeof LOCALES = "vi"): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        typeof node === "object" && node !== null
          ? (node as Record<string, unknown>)[key]
          : undefined,
      LOCALES[locale],
    );
}

function argumentNames(text: string): string[] {
  return [
    ...new Set([...text.matchAll(/\{\s*([A-Za-z_]\w*)/g)].map((match) => match[1] ?? "")),
  ].sort();
}

describe("rule option messages", () => {
  const withChoices = GAMES.map((game) => [game.id, listOptionChoices(game)] as const).filter(
    ([, choices]) => choices.length > 0,
  );

  it("exist for at least one game", () => {
    expect(withChoices.map(([id]) => id)).toContain("caro");
  });

  it.each(withChoices)("name every option and value of %s", (gameId, choices) => {
    for (const { name, values } of choices) {
      expect(typeof message(`Games.${gameId}.options.${name}.label`), name).toBe("string");
      for (const value of values) {
        const key = `Games.${gameId}.options.${name}.values.${String(value)}`;
        expect(typeof message(key), key).toBe("string");
      }
    }
  });

  it.each(withChoices)("name the button changing the options of %s", (gameId) => {
    for (const locale of ["vi", "en", "ja"] as const) {
      expect(typeof message(`Games.${gameId}.options.change`, locale), locale).toBe("string");
    }
  });

  it.each(withChoices)(
    "give %s's hints to every value of an option, or to none",
    (gameId, choices) => {
      for (const locale of ["vi", "en", "ja"] as const) {
        for (const { name, values } of choices) {
          const hinted = values.filter(
            (value) =>
              typeof message(`Games.${gameId}.options.${name}.hints.${String(value)}`, locale) ===
              "string",
          );
          expect([0, values.length], `${locale} ${name}`).toContain(hinted.length);
        }
      }
    },
  );

  it("name the next game's button of every game suggesting one", async () => {
    const entries = await Promise.all(Object.values(GAME_ENTRY_LOADERS).map((load) => load()));
    const suggesting = entries
      .filter((entry) => entry.open((_definition, ui) => ui.useNextOptions !== undefined))
      .map((entry) => entry.id);
    for (const gameId of suggesting) {
      for (const locale of ["vi", "en", "ja"] as const) {
        const text = message(`Games.${gameId}.options.next`, locale);
        expect(argumentNames(String(text)), `${gameId} ${locale}`).toEqual(["rules"]);
      }
    }
  });

  it.each(withChoices)("sum up the rules of %s with one argument per option", (gameId, choices) => {
    const text = message(`Games.${gameId}.options.summary`);

    expect(typeof text).toBe("string");
    expect(argumentNames(String(text))).toEqual(choices.map(({ name }) => name).sort());
  });
});

describe("useOptionLabels", () => {
  it("sums up every option of a Gomoku game, defaults included", () => {
    expect(summary("caro", CARO_CHOICES, { size: 19, rule: "free" })).toBe("19×19 · Tự do");
    expect(summary("caro", CARO_CHOICES, { size: 15, rule: "blocked-ends" })).toBe(
      "15×15 · Chặn hai đầu",
    );
  });

  it("lets each language join the options", () => {
    expect(summary("caro", CARO_CHOICES, { size: 19, rule: "free" }, "en")).toBe(
      "19×19 · Free style",
    );
    expect(summary("caro", CARO_CHOICES, { size: 19, rule: "free" }, "ja")).toBe("19×19・フリー");
  });

  it("sums up nothing for a game without choices", () => {
    expect(summary("tictactoe", [], {})).toBe("none");
  });

  it.each([
    ["a value that is not a choice", { size: 17, rule: "free" }],
    ["a missing option", { size: 19 }],
    ["an unknown option", { size: 19, rule: "free", speed: 2 }],
    ["a number given as text", { size: "19", rule: "free" }],
    ["no object", null],
    ["a list", [19, "free"]],
  ])("sums up nothing for options with %s", (_what, options) => {
    expect(summary("caro", CARO_CHOICES, options)).toBe("none");
  });

  it("gives a value's hint, the change button and the next game's button", () => {
    function Labels() {
      const labels = useOptionLabels();
      return (
        <p>
          {[
            labels.hint("caro", "size", 19) ?? "no hint",
            labels.change("caro"),
            labels.next("caro", CARO_CHOICES, { size: 19 }) ?? "no next",
          ].join("|")}
        </p>
      );
    }
    renderWithIntl(<Labels />);

    expect(screen.getByRole("paragraph")).toHaveTextContent("no hint|Đổi bàn, luật|no next");
  });

  it("names an option and its values", () => {
    function Labels() {
      const labels = useOptionLabels();
      return (
        <p>
          {[labels.field("caro", "rule"), labels.value("caro", "rule", "blocked-ends")].join("|")}
        </p>
      );
    }
    renderWithIntl(<Labels />);

    expect(screen.getByRole("paragraph")).toHaveTextContent("Luật thắng|Chặn hai đầu");
  });
});
