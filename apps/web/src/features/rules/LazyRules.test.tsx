import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CaroRules } from "@/games/caro/Rules";
import { renderWithIntl } from "@/test/render-with-intl";
import { rulesTranslator } from "@/test/rules-translator";

import { LazyRules } from "./LazyRules";
import { type LoadedRules, loadRules } from "./load-rules";

const CARO: LoadedRules = { Rules: CaroRules, t: rulesTranslator() };

/** A load that answers when told: `resolve()` or `reject()` the pending call. */
function controlledLoad() {
  let settle: { resolve: () => void; reject: () => void } | null = null;
  const load = vi.fn<typeof loadRules>(
    () =>
      new Promise<LoadedRules>((resolve, reject) => {
        settle = {
          resolve: () => {
            resolve(CARO);
          },
          reject: () => {
            reject(new Error("ChunkLoadError"));
          },
        };
      }),
  );
  return {
    load,
    resolve: () => settle?.resolve(),
    reject: () => settle?.reject(),
  };
}

describe("LazyRules", () => {
  it("loads the game's rules in the language in use, placed for the dialog", async () => {
    renderWithIntl(<LazyRules gameId="caro" open />, { locale: "en" });

    expect(screen.getByRole("status")).toHaveTextContent("Loading the rules…");
    expect(
      await screen.findByRole("heading", { level: 3, name: "The “Free style” rule" }),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
  });

  it("Không tải được luật: says so, and loads them on “Thử lại”, the focus kept meanwhile", async () => {
    const { load, resolve, reject } = controlledLoad();
    renderWithIntl(<LazyRules gameId="caro" open load={load} />);
    reject();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không tải được luật chơi. Kiểm tra kết nối rồi thử lại; ván vẫn đang tiếp tục.",
    );
    const retry = screen.getByRole("button", { name: "Thử lại" });
    await userEvent.click(retry);

    // Trying again: the button stays, focused and not pressable, until the answer.
    expect(retry).toHaveFocus();
    expect(retry).toHaveAttribute("aria-disabled", "true");
    resolve();

    const heading = await screen.findByRole("heading", { level: 3, name: "Luật “tự do”" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    // The focus moves to the rules, never to the page behind the dialog.
    expect(heading.closest("[tabindex='-1']")).toHaveFocus();
    expect(load).toHaveBeenCalledTimes(2);
    expect(load).toHaveBeenLastCalledWith("caro", "vi");
  });

  it("keeps “Thử lại” when trying again fails too", async () => {
    const { load, reject } = controlledLoad();
    renderWithIntl(<LazyRules gameId="caro" open load={load} />);
    reject();
    await userEvent.click(await screen.findByRole("button", { name: "Thử lại" }));
    reject();

    const retry = await screen.findByRole("button", { name: "Thử lại" });
    await vi.waitFor(() => {
      expect(retry).toHaveAttribute("aria-disabled", "false");
    });
    expect(retry).toHaveFocus();
  });

  it("tries again by itself when the dialog opens again after a failure", async () => {
    const { load, resolve, reject } = controlledLoad();
    const view = renderWithIntl(<LazyRules gameId="caro" open load={load} />);
    reject();
    await screen.findByRole("alert");

    view.rerender(<LazyRules gameId="caro" open={false} load={load} />);
    view.rerender(<LazyRules gameId="caro" open load={load} />);
    resolve();

    expect(
      await screen.findByRole("heading", { level: 3, name: "Luật “tự do”" }),
    ).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("loads every game's rules with its translations", async () => {
    const { Rules, t } = await loadRules("ludo", "ja");

    expect(Rules.name).toBe("LudoRules");
    expect(t("ludo.win.title")).toBe("勝ち");
  });
});
