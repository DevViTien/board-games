import { GAME_IDS, type RegisteredGameId } from "@board-games/games/ids";
import { screen } from "@testing-library/react";
import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";

import { GAME_RULES } from "@/games/rules";
import { type Locale, TIME_ZONE } from "@/i18n/config";
import { renderWithIntl } from "@/test/render-with-intl";
import { rulesTranslator } from "@/test/rules-translator";

import en from "../../../messages/en.json";
import ja from "../../../messages/ja.json";
import vi from "../../../messages/vi.json";
import { RulesPage } from "./RulesPage";
import type { RulesPlace } from "./types";

const MESSAGES = { vi, en, ja } as const;

/** A game's rules page as the route renders it, in `locale`. */
async function renderRulesPage(
  gameId: RegisteredGameId,
  locale: Locale,
  place: RulesPlace = "page",
) {
  const Rules = await GAME_RULES[gameId]();
  const t = rulesTranslator(locale);
  const tGames = createTranslator({
    locale,
    messages: MESSAGES[locale],
    namespace: "Games",
    timeZone: TIME_ZONE,
  });
  const name = tGames(`${gameId}.name`);
  return renderWithIntl(
    place === "page" ? (
      <RulesPage
        gameId={gameId}
        title={t("title", { game: name })}
        facts="2"
        artwork={null}
        playLabel={t("play", { game: name })}
      >
        <Rules t={t} place="page" />
      </RulesPage>
    ) : (
      <Rules t={t} place="dialog" />
    ),
    { locale },
  );
}

/** Every piece of text a person or a screen reader meets: text nodes and accessible labels. */
function visibleStrings(root: HTMLElement): string[] {
  const strings: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = node.textContent?.trim() ?? "";
    if (text !== "") strings.push(text);
  }
  for (const element of root.querySelectorAll("[aria-label]")) {
    strings.push(element.getAttribute("aria-label") ?? "");
  }
  return strings;
}

/**
 * What may read the same in Vietnamese and Japanese (design §5): numbers, sizes, coordinates a–h,
 * the marks X and O, the colours' symbols and punctuation.
 */
const SAME_IN_EVERY_LANGUAGE = /^[\d\s×·–\-+.,:;()→a-hXO●■▲◆~]+$/;
/** A message key shown instead of a missing message ("Rules.caro.goal.title"). */
const RAW_KEY = /^[A-Za-z]+(\.[\w-]+)+$/;

/** Colours a figure may use: a token (CSS variable), the text's colour, or none. */
const THEMED_COLOUR = /^(var\(--[\w-]+\)|currentColor|none|transparent)$/;
const COLOUR_ATTRIBUTES = ["fill", "stroke", "color", "stop-color", "flood-color", "style"];
/** A Tailwind colour class that is not a token: an arbitrary value or a palette colour. */
const FIXED_COLOUR_CLASS =
  /^(?:[\w-]+:)*(fill|stroke|text|bg)-(\[(#|rgb|hsl|oklch)|black$|white$|(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d)/;

describe.each(GAME_IDS)("the rules of %s", (gameId) => {
  it("Hình theo giao diện: every colour of every figure is the theme's, none fixed", async () => {
    const { container } = await renderRulesPage(gameId, "vi");

    const svgs = container.querySelectorAll("svg[role='img']");
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) {
      for (const element of [svg, ...svg.querySelectorAll("*")]) {
        for (const attribute of COLOUR_ATTRIBUTES) {
          const value = element.getAttribute(attribute);
          if (value === null) continue;
          if (attribute === "style") {
            expect(value, `${element.tagName} style`).not.toMatch(/#|rgb|hsl|oklch/);
          } else {
            expect(value, `${element.tagName} ${attribute}`).toMatch(THEMED_COLOUR);
          }
        }
        for (const name of element.classList) {
          expect(name, `${element.tagName} class`).not.toMatch(FIXED_COLOUR_CLASS);
        }
      }
    }
  });

  it("Hình có mô tả: each figure has a name and a caption on screen", async () => {
    await renderRulesPage(gameId, "vi");

    for (const figure of screen.getAllByRole("figure")) {
      const picture = figure.querySelector("svg[role='img']");
      expect(picture).not.toBeNull();
      expect(picture).toHaveAccessibleName();
      expect(figure.querySelector("figcaption")?.textContent.trim()).not.toBe("");
    }
  });

  it("Trang luật bằng tiếng Nhật: no words of the page are a raw key or the Vietnamese ones", async () => {
    // The rules' words: the top bar's (a language named in itself) are its own tests'.
    await renderRulesPage(gameId, "vi");
    const vietnamese = new Set(visibleStrings(screen.getByRole("main")));
    document.body.innerHTML = "";
    await renderRulesPage(gameId, "ja");
    const japanese = visibleStrings(screen.getByRole("main"));

    expect(japanese.length).toBeGreaterThan(10);
    for (const text of japanese) {
      expect(text).not.toMatch(RAW_KEY);
      if (SAME_IN_EVERY_LANGUAGE.test(text)) continue;
      expect(vietnamese.has(text), `"${text}" is the same in Vietnamese`).toBe(false);
    }
  });

  it("ends with resigning and leaving a game online", async () => {
    await renderRulesPage(gameId, "vi");

    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.at(-1)).toHaveAccessibleName("Đầu hàng và bỏ ván");
    expect(headings.at(-1)?.closest("section")).toHaveTextContent(/5 phút/);
  });

  it("in the dialog: sections are h3 under the dialog's title, and no link leaves the game", async () => {
    await renderRulesPage(gameId, "vi", "dialog");

    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
    expect(screen.getAllByRole("heading", { level: 3 }).length).toBeGreaterThanOrEqual(4);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
