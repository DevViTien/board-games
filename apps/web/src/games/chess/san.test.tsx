import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Locale } from "@/i18n/config";
import { renderWithIntl } from "@/test/render-with-intl";

import { parseSan, useDescribeSan } from "./san";

function Described({ san }: { san: string }) {
  const describe = useDescribeSan();
  return <p>{describe(san)}</p>;
}

function read(san: string, locale: Locale = "vi") {
  const { unmount } = renderWithIntl(<Described san={san} />, { locale });
  const text = screen.getByRole("paragraph").textContent;
  unmount();
  return text;
}

const quiet = { disambiguation: "", capture: false, promotion: null, check: null } as const;

describe("parseSan", () => {
  it.each([
    ["e4", { ...quiet, piece: "p", to: "e4" }],
    ["Nf3", { ...quiet, piece: "n", to: "f3" }],
    ["exd5", { ...quiet, piece: "p", disambiguation: "e", capture: true, to: "d5" }],
    ["Nbd2", { ...quiet, piece: "n", disambiguation: "b", to: "d2" }],
    ["R1e2", { ...quiet, piece: "r", disambiguation: "1", to: "e2" }],
    ["e8=Q+", { ...quiet, piece: "p", to: "e8", promotion: "q", check: "check" }],
    ["Qh4#", { ...quiet, piece: "q", to: "h4", check: "mate" }],
  ])("takes %s apart", (san, parsed) => {
    expect(parseSan(san)).toEqual({ castle: null, ...parsed });
  });

  it("reads castling on either side", () => {
    expect(parseSan("O-O")).toEqual({ castle: "king", check: null });
    expect(parseSan("O-O-O+")).toEqual({ castle: "queen", check: "check" });
  });

  it("refuses anything else", () => {
    expect(() => parseSan("Z9")).toThrow();
  });
});

describe("useDescribeSan", () => {
  it.each([
    ["e4", "Tốt e4"],
    ["Nf3", "Mã f3"],
    ["exd5", "Tốt e ăn d5"],
    ["exd5+", "Tốt e ăn d5, chiếu"],
    ["Nbd2", "Mã b d2"],
    ["R1e2", "Xe 1 e2"],
    ["O-O", "Nhập thành cánh vua"],
    ["O-O-O", "Nhập thành cánh hậu"],
    ["e8=Q+", "Tốt e8 phong Hậu, chiếu"],
    ["Qh4#", "Hậu h4, chiếu hết"],
  ])("reads %s in Vietnamese", (san, words) => {
    expect(read(san)).toBe(words);
  });

  it.each([
    ["en", "Nf3", "knight f3"],
    ["en", "exd5+", "pawn e takes d5, check"],
    ["en", "O-O", "Castles kingside"],
    ["en", "e8=Q#", "pawn e8 promotes to queen, checkmate"],
    ["ja", "Nf3", "ナイト f3"],
    ["ja", "O-O-O", "クイーン側キャスリング"],
    ["ja", "Qh4#", "クイーン h4、チェックメイト"],
  ] as const)("reads in %s: %s", (locale, san, words) => {
    expect(read(san, locale)).toBe(words);
  });
});
