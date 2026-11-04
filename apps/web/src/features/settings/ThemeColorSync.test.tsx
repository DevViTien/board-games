import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ThemeColorSync } from "./ThemeColorSync";

/** The page's top bar, its background as styles.css would give it. */
function Bar({ colour }: { readonly colour: string }) {
  return <header data-top-bar="" style={{ backgroundColor: colour }} />;
}

const themeColours = () =>
  [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].map(
    (meta) => meta.content,
  );

beforeEach(() => {
  // The server's two tags, one per colour scheme.
  for (const media of ["(prefers-color-scheme: light)", "(prefers-color-scheme: dark)"]) {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.media = media;
    meta.content = "#f6f5f1";
    document.head.append(meta);
  }
});

afterEach(() => {
  // Unmounted first, so nothing below is synced again.
  cleanup();
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.remove();
  delete document.documentElement.dataset.theme;
});

describe("ThemeColorSync", () => {
  it("Màn hình chơi Cờ cá ngựa ở giao diện tối: the bar takes the game's own background", () => {
    render(
      <>
        <Bar colour="rgb(31, 26, 18)" />
        <ThemeColorSync />
      </>,
    );

    // Whichever tag the browser reads.
    expect(themeColours()).toEqual(["rgb(31, 26, 18)", "rgb(31, 26, 18)"]);
  });

  it("follows the theme the player picks", async () => {
    const { rerender } = render(
      <>
        <Bar colour="rgb(251, 244, 228)" />
        <ThemeColorSync />
      </>,
    );
    expect(themeColours()).toEqual(["rgb(251, 244, 228)", "rgb(251, 244, 228)"]);
    // styles.css turns the page dark as `data-theme` changes.
    rerender(
      <>
        <Bar colour="rgb(31, 26, 18)" />
        <ThemeColorSync />
      </>,
    );

    await act(async () => {
      document.documentElement.dataset.theme = "dark";
      await Promise.resolve();
    });

    expect(themeColours()).toEqual(["rgb(31, 26, 18)", "rgb(31, 26, 18)"]);
  });

  it("Về menu: the next page's bar sets it again when it opens", () => {
    const { unmount } = render(
      <>
        <Bar colour="rgb(31, 26, 18)" />
        <ThemeColorSync />
      </>,
    );
    unmount();

    render(
      <>
        <Bar colour="rgb(246, 245, 241)" />
        <ThemeColorSync />
      </>,
    );

    expect(themeColours()).toEqual(["rgb(246, 245, 241)", "rgb(246, 245, 241)"]);
  });

  it("sets it again when the page's head brings the tags back with the server's colour (a new language)", async () => {
    render(
      <>
        <Bar colour="rgb(31, 26, 18)" />
        <ThemeColorSync />
      </>,
    );

    await act(async () => {
      for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.remove();
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = "#121322";
      document.head.append(meta);
      await Promise.resolve();
    });

    expect(themeColours()).toEqual(["rgb(31, 26, 18)"]);

    await act(async () => {
      const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (meta !== null) meta.content = "#f6f5f1";
      await Promise.resolve();
    });

    expect(themeColours()).toEqual(["rgb(31, 26, 18)"]);
  });
});
