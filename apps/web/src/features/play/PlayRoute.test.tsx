import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Component, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createInlineAiPlayer } from "@/ai-worker/ai-player";
import type { GAME_ENTRY_LOADERS } from "@/games/registry";
import { renderWithIntl } from "@/test/render-with-intl";
import { createMemoryStore } from "@/transport/memory-store";

import { PlayLoadError } from "./PlayLoadError";
import { PlayRoute } from "./PlayRoute";

const chunk = vi.hoisted(() => ({ fail: false, loads: 0 }));

// Like Next.js, which keeps `useSearchParams` in step with the address, `replaceState` included.
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

vi.mock("@/games/registry", async (importOriginal) => {
  const actual = await importOriginal<{ GAME_ENTRY_LOADERS: typeof GAME_ENTRY_LOADERS }>();
  return {
    GAME_ENTRY_LOADERS: {
      tictactoe: () => {
        chunk.loads += 1;
        return chunk.fail
          ? Promise.reject(new Error("ChunkLoadError"))
          : actual.GAME_ENTRY_LOADERS.tictactoe();
      },
    },
  };
});

/** Stands in for Next.js around `app/play/[gameId]/[mode]/error.tsx`: retrying re-renders the route. */
class RetryBoundary extends Component<{ readonly children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <PlayLoadError
        error={new Error("ChunkLoadError")}
        retry={() => {
          this.setState({ failed: false });
        }}
      />
    );
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("PlayRoute", () => {
  it("keeps a failed load of the game's code until the player retries, then loads it again", async () => {
    // React reports the caught error on the console; it is expected here.
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    chunk.fail = true;
    const renderRoute = async () => {
      let view: ReturnType<typeof renderWithIntl> | undefined;
      await act(async () => {
        view = renderWithIntl(
          <RetryBoundary>
            <PlayRoute gameId="tictactoe" mode="local" store={createMemoryStore()} />
          </RetryBoundary>,
        );
        await Promise.resolve();
      });
      return view;
    };
    const first = await renderRoute();
    await screen.findByRole("button", { name: "Thử lại" });
    first?.unmount();

    // Rendered again from scratch, as React does in the browser after a load fails: importing
    // again there kept the route loading forever, and the error page never showed.
    await renderRoute();
    const retry = await screen.findByRole("button", { name: "Thử lại" });
    expect(chunk.loads).toBe(1);

    chunk.fail = false;
    // Awaited, so that React finishes the render that suspends while the code loads again.
    await act(async () => {
      await userEvent.click(retry);
    });

    expect(await screen.findByRole("group", { name: "Bàn cờ" })).toBeInTheDocument();
    expect(chunk.loads).toBe(2);
  });

  it("starts the game asked for in the address once, then removes the query and keeps the transport", async () => {
    window.history.replaceState(null, "", "/play/tictactoe/ai?new=1&level=hard&first=ai#board");
    const store = createMemoryStore();
    const load = vi.spyOn(store, "load");
    const createAiPlayer = vi.fn(() => createInlineAiPlayer());
    const route = (
      <PlayRoute gameId="tictactoe" mode="ai" store={store} createAiPlayer={createAiPlayer} />
    );
    let view: ReturnType<typeof renderWithIntl> | undefined;
    await act(async () => {
      view = renderWithIntl(route);
      await Promise.resolve();
    });
    await screen.findByRole("group", { name: "Bàn cờ" });

    // Gone from the address, so a reload or Back resumes this game instead of starting another.
    expect(window.location.pathname).toBe("/play/tictactoe/ai");
    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("#board");
    // Next.js renders the route again with the new address; the page's props are the same.
    view?.rerender(route);

    // The game asked for: Hard, the AI moving first, and the player answering as O.
    expect(await screen.findByText(/Đến lượt bạn \(O\)$/)).toBeInTheDocument();
    expect(screen.getByText("Với máy · Khó")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /, X$/ })).toHaveLength(1);
    // One transport, and one AI, for the whole visit.
    expect(createAiPlayer).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledOnce();
  });

  it("keeps the game asked for in the address until it is set up, so retrying still starts it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    window.history.replaceState(null, "", "/play/tictactoe/ai?new=1&level=hard&first=ai");
    const store = createMemoryStore();
    // The first try fails before the game is set up, as a failed load of its code would.
    const createAiPlayer = vi
      .fn(() => createInlineAiPlayer())
      .mockImplementationOnce(() => {
        throw new Error("ChunkLoadError");
      });
    await act(async () => {
      renderWithIntl(
        <RetryBoundary>
          <PlayRoute gameId="tictactoe" mode="ai" store={store} createAiPlayer={createAiPlayer} />
        </RetryBoundary>,
      );
      await Promise.resolve();
    });
    const retry = await screen.findByRole("button", { name: "Thử lại" });
    expect(window.location.search).toBe("?new=1&level=hard&first=ai");

    await act(async () => {
      await userEvent.click(retry);
    });

    // The game asked for, not one set up like the last choices: Hard, the AI moving first.
    expect(await screen.findByText("Với máy · Khó")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /, X$/ })).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("resumes the saved game when the address asks for no new game", async () => {
    const store = createMemoryStore();
    const renderRoute = async () => {
      let view: ReturnType<typeof renderWithIntl> | undefined;
      await act(async () => {
        view = renderWithIntl(<PlayRoute gameId="tictactoe" mode="local" store={store} />);
        await Promise.resolve();
      });
      return view;
    };
    const first = await renderRoute();
    await userEvent.click(await screen.findByRole("button", { name: "Hàng 1, cột 1, trống" }));
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    first?.unmount();

    await renderRoute();

    expect(await screen.findByRole("button", { name: "Hàng 1, cột 1, X" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Đến lượt O");
  });
});
