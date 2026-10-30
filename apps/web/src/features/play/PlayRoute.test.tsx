import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Component, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GAME_ENTRY_LOADERS } from "@/games/registry";
import { renderWithIntl } from "@/test/render-with-intl";
import { createMemoryStore } from "@/transport/memory-store";

import { PlayRoute } from "./PlayRoute";

const chunk = vi.hoisted(() => ({ fail: false }));

vi.mock("@/games/registry", async (importOriginal) => {
  const actual = await importOriginal<{ GAME_ENTRY_LOADERS: typeof GAME_ENTRY_LOADERS }>();
  return {
    GAME_ENTRY_LOADERS: {
      tictactoe: () =>
        chunk.fail
          ? Promise.reject(new Error("ChunkLoadError"))
          : actual.GAME_ENTRY_LOADERS.tictactoe(),
    },
  };
});

/** Stands in for `app/play/[gameId]/error.tsx`: shows a retry button that re-renders the route. */
class RetryBoundary extends Component<{ readonly children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <button
        type="button"
        onClick={() => {
          this.setState({ failed: false });
        }}
      >
        retry
      </button>
    );
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PlayRoute", () => {
  it("loads the game's code again when retried after a failed load", async () => {
    // React reports the caught error on the console; it is expected here.
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    chunk.fail = true;
    await act(async () => {
      renderWithIntl(
        <RetryBoundary>
          <PlayRoute gameId="tictactoe" store={createMemoryStore()} />
        </RetryBoundary>,
      );
      await Promise.resolve();
    });
    const retry = await screen.findByRole("button", { name: "retry" });

    chunk.fail = false;
    await userEvent.click(retry);

    expect(await screen.findByRole("group", { name: "Bàn cờ" })).toBeInTheDocument();
  });
});
