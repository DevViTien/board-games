import { expect, type Locator, type Page, test } from "@playwright/test";

import {
  board,
  CARD_SCORE_LONG_NAMES,
  chessSquare,
  choose,
  createCardGroup,
  enterRound,
  horseChoices,
  LUDO_FOUR_CHOICES,
  ludoRecord,
  openFakeRoom,
  PAGE_WITHOUT_STORAGE,
  pressStart,
  rollButton,
  roundButton,
  savedChessGame,
  savedLudoGame,
  status,
  writeSaved,
} from "./helpers";

// Spec accessibility "Dùng được trên điện thoại nhỏ", "Dùng được khi xoay ngang" and "Vùng an toàn
// của màn hình": phones held upright (360 × 740, and 360 × 640 with the browser's bars showing) and
// turned sideways (844 × 390, 740 × 360, and 844 × 300 with Safari's address bar).

const GAMES = ["tictactoe", "caro", "ludo", "chess", "fence-race"] as const;

function scrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}

/** Opens a same-device game saved under its slot, or a new one. */
async function openLocal(page: Page, gameId: (typeof GAMES)[number], saved?: unknown) {
  await page.goto(PAGE_WITHOUT_STORAGE);
  if (saved !== undefined) await writeSaved(page, `${gameId}:local`, saved);
  await page.goto(saved === undefined ? `/play/${gameId}` : `/play/${gameId}/local`);
  if (saved === undefined) {
    await choose(page, "Chế độ", "Cùng máy");
    await pressStart(page);
  }
  await expect(
    board(page).or(page.locator("[data-ply]")).or(page.locator("[data-fence-race-frame]")).first(),
  ).toBeVisible();
}

/** The two bars of Cờ vua's seats, above and below its board. */
const seatBars = (page: Page) => page.locator("div[role=group][data-player]");

/** The board of any game: a grid of cells, or Cờ cá ngựa's picture. */
const anyBoard = (page: Page) =>
  page.locator("[data-ply]").or(page.locator("[data-fence-race-frame]")).or(board(page)).first();

/** Every control of the screen at least 24 × 24 px (WCAG 2.5.8), Cờ caro's small cells aside. */
async function expectTargetsAtLeast24(page: Page, scope: Locator): Promise<void> {
  const small = await scope.evaluate((root) =>
    [...root.querySelectorAll<HTMLElement>("a[href], button, input")]
      .filter((element) => element.closest("[data-game='caro'] [role='grid']") === null)
      // A cell of Cờ rào that is no target can be smaller, as its layer is the one touched.
      .filter(
        (element) =>
          element.closest("[data-fence-race-grid]") === null ||
          element.getAttribute("aria-disabled") === "false",
      )
      .filter((element) => element.getClientRects().length > 0 && !element.closest("[hidden]"))
      // A visually hidden radio is pressed through its label.
      .map((element) => element.closest("label") ?? element)
      // A link inside a sentence is exempt (WCAG 2.5.8 "inline"), as for axe's `target-size`.
      .filter((element) => getComputedStyle(element).display !== "inline")
      .map((element) => ({ element, box: element.getBoundingClientRect() }))
      .filter(({ box }) => box.width < 24 || box.height < 24)
      .map(({ element, box }) => `${element.outerHTML.slice(0, 80)} ${box.width}×${box.height}`),
  );
  expect(small).toEqual([]);
}

for (const viewport of [
  { width: 360, height: 740 },
  { width: 360, height: 640 },
] as const) {
  test.describe(`a phone of ${String(viewport.width)} × ${String(viewport.height)}`, () => {
    test.use({ viewport });

    test("Không cuộn ngang: the menu, setup, play screen and rules of every game", async ({
      page,
    }) => {
      await page.goto("/");
      expect(await scrollsSideways(page)).toBe(false);
      await expectTargetsAtLeast24(page, page.locator("body"));
      for (const gameId of GAMES) {
        await page.goto(`/play/${gameId}`);
        expect(await scrollsSideways(page), `setup of ${gameId}`).toBe(false);
        await expectTargetsAtLeast24(page, page.locator("body"));
        await openLocal(page, gameId);
        expect(await scrollsSideways(page), `play screen of ${gameId}`).toBe(false);
        await expectTargetsAtLeast24(page, page.locator("body"));
        await page.goto(`/rules/${gameId}`);
        expect(await scrollsSideways(page), `rules of ${gameId}`).toBe(false);
        await expectTargetsAtLeast24(page, page.locator("body"));
      }
    });
  });
}

test.describe("the card score tool on a small phone", () => {
  for (const viewport of [
    { width: 360, height: 740 },
    { width: 360, height: 640 },
  ]) {
    test.describe(`${String(viewport.width)} × ${String(viewport.height)}`, () => {
      test.use({ viewport });

      test("Không cuộn ngang: eight long names on every screen", async ({ page }) => {
        await page.goto("/tools");
        expect(await scrollsSideways(page), "toolbox").toBe(false);
        await expectTargetsAtLeast24(page, page.locator("body"));

        await createCardGroup(
          page,
          CARD_SCORE_LONG_NAMES,
          "Nhóm có tên dài bốn mươi ký tự vừa đủ nh",
        );
        expect(await scrollsSideways(page), "board, no round").toBe(false);

        await enterRound(page, ["1", "-1"]);
        expect(await scrollsSideways(page), "round").toBe(false);
        await expectTargetsAtLeast24(page, page.getByRole("dialog"));
        await page.getByRole("button", { name: "Đóng" }).click();
        await page.getByRole("button", { name: "Bỏ ván" }).click();

        await enterRound(page, ["0", "0", "0", "0", "0", "0", "0"]);
        await page.getByRole("button", { name: "Lưu ván" }).click();
        await expect(roundButton(page, "Nhập ván 2")).toBeVisible();
        expect(await scrollsSideways(page), "board with a round").toBe(false);
        await expectTargetsAtLeast24(page, page.locator("body"));
        // Tám người trên điện thoại: the table scrolls in its own frame.
        const frame = page.getByRole("region", { name: "Bảng các ván" });
        expect(await frame.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);

        await page.getByRole("link", { name: "Sửa nhóm" }).click();
        await expect(page.getByRole("heading", { level: 1, name: "Sửa nhóm" })).toBeVisible();
        expect(await scrollsSideways(page), "edit").toBe(false);
        await expectTargetsAtLeast24(page, page.locator("body"));

        await page.getByRole("banner").getByRole("link", { name: "Bảng điểm" }).click();
        await page.getByRole("banner").getByRole("link", { name: "Các nhóm" }).click();
        await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(1);
        expect(await scrollsSideways(page), "list").toBe(false);

        await page.goto("/tools/card-score/new");
        await expect(page.getByRole("textbox", { name: "Người chơi 1" })).toBeVisible();
        expect(await scrollsSideways(page), "form").toBe(false);
      });
    });
  }

  test.describe("360 × 640 with the keypad", () => {
    test.use({ viewport: { width: 360, height: 640 } });

    test("Tám người trên màn hình nhỏ, Ô được chọn luôn thấy: the keypad whole, every field reached", async ({
      page,
      isMobile,
    }) => {
      test.skip(!isMobile, "a finger's");
      await createCardGroup(page, CARD_SCORE_LONG_NAMES);
      await roundButton(page, "Nhập ván 1").click();

      const keypad = page.getByRole("group", { name: "Bàn số" });
      await expect(keypad).toBeInViewport({ ratio: 1 });
      await expect(page.getByText("Để trống một người, app tự tính")).toBeInViewport({ ratio: 1 });
      await expect(keypad.getByRole("button", { name: "Lưu ván" })).toBeInViewport({ ratio: 1 });

      for (const name of CARD_SCORE_LONG_NAMES) {
        const field = page.getByRole("textbox", { name, exact: true });
        await expect(field).toBeFocused();
        const box = await field.boundingBox();
        const pad = await keypad.boundingBox();
        expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(pad?.y ?? 0);
        await keypad.getByRole("button", { name: "Tiếp" }).click();
      }
    });
  });

  test.describe("turned sideways, 844 × 390", () => {
    test.use({ viewport: { width: 844, height: 390 } });

    test("Xoay ngang: keypad beside the fields, nothing to scroll to reach it", async ({
      page,
      isMobile,
    }) => {
      test.skip(!isMobile, "a finger's");
      await createCardGroup(page, ["Lan", "Minh", "Hùng", "Tú"]);
      await roundButton(page, "Nhập ván 1").click();
      const keypad = page.getByRole("group", { name: "Bàn số" });
      await expect(keypad).toBeInViewport({ ratio: 1 });
      const field = await page.getByRole("textbox", { name: "Lan", exact: true }).boundingBox();
      const pad = await keypad.boundingBox();
      expect((field?.x ?? 0) + (field?.width ?? 0)).toBeLessThanOrEqual(pad?.x ?? 0);
      expect(await scrollsSideways(page)).toBe(false);
    });
  });
});

test.describe("a phone of 360 × 740", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("Cờ vua ở 360 × 740: board, both players' bars and the whole of Ván mới without scrolling", async ({
    page,
  }) => {
    await openLocal(page, "chess", savedChessGame(["e2e4", "e7e5"]));

    await expect(board(page)).toBeInViewport({ ratio: 1 });
    for (const bar of await seatBars(page).all()) {
      await expect(bar).toBeInViewport({ ratio: 1 });
    }
    await expect(seatBars(page)).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Ván mới" })).toBeInViewport({ ratio: 1 });
    await expect(status(page)).toBeInViewport({ ratio: 1 });
    // "Lật bàn" is its icon beside the sheet, still named so.
    await expect(page.getByRole("button", { name: "Lật bàn" })).toBeInViewport({ ratio: 1 });
  });

  test("Cờ vua ở 360 × 740 after a move selected: the hint does not push Ván mới off", async ({
    page,
  }) => {
    await openLocal(page, "chess", savedChessGame(["e2e4", "e7e5"]));
    await chessSquare(page, "d2").click();
    await expect(page.getByText(/^Đã chọn Tốt d2/u)).toBeVisible();

    await expect(page.getByRole("button", { name: "Ván mới" })).toBeInViewport({ ratio: 1 });
  });

  test("Cờ cá ngựa: the roll button and the choices are on screen, then the buttons", async ({
    page,
  }) => {
    await openLocal(page, "ludo", savedLudoGame(4, []));
    await expect(anyBoard(page)).toBeInViewport({ ratio: 1 });
    await expect(status(page)).toBeInViewport({ ratio: 1 });
    await expect(rollButton(page)).toBeInViewport({ ratio: 1 });
  });

  test("the buttons of a game against the AI: Ván mới on the first line", async ({ page }) => {
    await page.goto("/play/tictactoe");
    await choose(page, "Chế độ", "Đấu với máy");
    await pressStart(page);
    const newGame = await page.getByRole("button", { name: "Ván mới" }).boundingBox();
    const undo = await page.getByRole("button", { name: "Hoàn tác" }).boundingBox();
    const resign = await page.getByRole("button", { name: "Đầu hàng" }).boundingBox();
    // Undo, redo and a new game on one line; resigning, last, may go below.
    expect(Math.round(newGame?.y ?? 0)).toBe(Math.round(undo?.y ?? -1));
    expect(resign?.y ?? 0).toBeGreaterThanOrEqual(newGame?.y ?? 0);
    for (const box of [newGame, undo, resign]) expect(box?.height).toBe(44);
  });
});

test.describe("a phone of 360 × 640", () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test("Cờ vua ở 360 × 640: scrolled to, the board and the whole of Ván mới fit on screen", async ({
    page,
  }) => {
    await openLocal(page, "chess", savedChessGame(["e2e4", "e7e5"]));
    expect(await scrollsSideways(page)).toBe(false);

    await board(page).scrollIntoViewIfNeeded();
    await expect(board(page)).toBeInViewport({ ratio: 1 });
    const newGame = page.getByRole("button", { name: "Ván mới" });
    await newGame.scrollIntoViewIfNeeded();
    await expect(newGame).toBeInViewport({ ratio: 1 });
  });
});

test.describe("a phone of 360 × 740, online", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("the board does not move when the connection pauses for inactivity", async ({ page }) => {
    await page.clock.install();
    await openFakeRoom(page, {
      gameId: "ludo",
      seats: [
        { kind: "human", name: "Lan", standIn: false },
        { kind: "human", name: "Minh", standIn: false },
      ],
      record: ludoRecord(2, []),
    });
    await expect(rollButton(page)).toBeVisible();
    const before = await anyBoard(page).boundingBox();

    // Ten minutes without anything happening: the connection pauses, "Continue" shows.
    await page.clock.fastForward("10:05");
    const resume = page.getByRole("button", { name: "Tiếp tục" });
    await expect(resume).toBeVisible();

    expect(await anyBoard(page).boundingBox()).toEqual(before);
    // Its target still 24 px high, on the one line kept.
    expect((await resume.boundingBox())?.height).toBe(24);
  });
});

test.describe("a phone of 390 × 844", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Ván online trên điện thoại: the connection line, empty, is one small line at most", async ({
    page,
  }) => {
    await openFakeRoom(page, {
      gameId: "ludo",
      seats: [
        { kind: "human", name: "Lan", standIn: false },
        { kind: "human", name: "Minh", standIn: false },
      ],
      record: ludoRecord(2, []),
    });
    await expect(rollButton(page)).toBeVisible();

    const line = page.getByRole("main").locator("p[aria-live='polite']").first().locator("..");
    const box = await line.boundingBox();
    // `text-small`: 14 px × 1.45.
    expect(box?.height ?? Infinity).toBeLessThanOrEqual(21);
  });
});

// --- Sideways ------------------------------------------------------------------------------------

test.describe("a phone turned sideways, 844 × 390", () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });

  test("Cờ cá ngựa xoay ngang: the whole board, and Gieo xúc xắc beside it on screen", async ({
    page,
  }) => {
    await openLocal(page, "ludo", savedLudoGame(4, []));

    await expect(anyBoard(page)).toBeInViewport({ ratio: 1 });
    await expect(rollButton(page)).toBeInViewport({ ratio: 1 });
    const boardBox = await anyBoard(page).boundingBox();
    const roll = await rollButton(page).boundingBox();
    expect((boardBox?.x ?? 0) + (boardBox?.width ?? 0)).toBeLessThanOrEqual(roll?.x ?? 0);
    expect(await scrollsSideways(page)).toBe(false);
  });

  test("Cờ cá ngựa xoay ngang, four horses to choose: every horse to choose on the board, on screen", async ({
    page,
  }) => {
    await openLocal(page, "ludo", savedLudoGame(4, LUDO_FOUR_CHOICES));
    await expect(horseChoices(page)).toHaveCount(4);

    // The choices are the horses themselves: on the board, with it, no list to scroll to.
    await expect(anyBoard(page)).toBeInViewport({ ratio: 1 });
    for (const choice of await horseChoices(page).all()) {
      await expect(choice).toBeInViewport({ ratio: 1 });
    }
  });

  for (const gameId of ["tictactoe", "caro"] as const) {
    test(`${gameId} xoay ngang: the whole board on screen`, async ({ page }) => {
      await openLocal(page, gameId);
      await expect(anyBoard(page)).toBeInViewport({ ratio: 1 });
      await expect(status(page)).toBeInViewport({ ratio: 1 });
      expect(await scrollsSideways(page)).toBe(false);
    });
  }

  test("Xoay ngang có tai thỏ: Về menu and the board keep clear of a 44 px safe area", async ({
    page,
  }) => {
    await openLocal(page, "chess", savedChessGame([]));
    await page.addStyleTag({ content: ":root { --safe-left: 44px; --safe-right: 44px; }" });

    const back = await page.getByRole("link", { name: "Về menu" }).boundingBox();
    const boardBox = await board(page).boundingBox();
    expect(back?.x ?? 0).toBeGreaterThanOrEqual(44);
    expect(boardBox?.x ?? 0).toBeGreaterThanOrEqual(44);
    await expect(board(page)).toBeInViewport({ ratio: 1 });
    // The page's background (the game's) still reaches the edge.
    const page_ = await page.evaluate(() => {
      const element = document.querySelector("main")?.closest("[data-game]");
      return element == null
        ? null
        : [element.getBoundingClientRect().x, getComputedStyle(element).backgroundColor];
    });
    expect(page_?.[0]).toBe(0);
    expect(page_?.[1]).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("the other screens do not scroll sideways", async ({ page }) => {
    for (const path of ["/", "/play/ludo", "/rules/chess", "/khong-co"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      expect(await scrollsSideways(page), path).toBe(false);
    }
  });
});

test.describe("a phone turned sideways, 740 × 360", () => {
  test.use({ viewport: { width: 740, height: 360 }, hasTouch: true });

  test("Cờ vua xoay ngang: the whole board on screen, a pawn moved by taps", async ({ page }) => {
    await openLocal(page, "chess", savedChessGame([]));
    await expect(board(page)).toBeInViewport({ ratio: 1 });
    // The two players' bars beside it.
    const boardBox = await board(page).boundingBox();
    for (const bar of await seatBars(page).all()) {
      const box = await bar.boundingBox();
      expect(box?.x ?? 0).toBeGreaterThanOrEqual((boardBox?.x ?? 0) + (boardBox?.width ?? 0));
    }

    await chessSquare(page, "e2").tap();
    await chessSquare(page, "e4").tap();

    await expect(status(page)).toHaveText("Đến lượt Đen");
    await expect(board(page)).toBeInViewport({ ratio: 1 });
  });

  for (const gameId of ["tictactoe", "caro", "ludo", "fence-race"] as const) {
    test(`${gameId} xoay ngang: the whole board on screen`, async ({ page }) => {
      await openLocal(page, gameId, gameId === "ludo" ? savedLudoGame(4, []) : undefined);
      await expect(anyBoard(page)).toBeInViewport({ ratio: 1 });
      expect(await scrollsSideways(page)).toBe(false);
    });
  }
});

test.describe("a phone turned sideways with Safari's address bar, 844 × 300", () => {
  test.use({ viewport: { width: 844, height: 300 }, hasTouch: true });

  for (const gameId of GAMES) {
    test(`${gameId}: the whole board in the height left`, async ({ page }) => {
      await openLocal(page, gameId, gameId === "ludo" ? savedLudoGame(4, []) : undefined);
      await expect(anyBoard(page)).toBeInViewport({ ratio: 1 });
      expect(await scrollsSideways(page)).toBe(false);
    });
  }

  test("Cờ vua: a pawn moved by taps", async ({ page }) => {
    await openLocal(page, "chess", savedChessGame([]));
    await chessSquare(page, "e2").tap();
    await chessSquare(page, "e4").tap();
    await expect(status(page)).toHaveText("Đến lượt Đen");
  });
});
