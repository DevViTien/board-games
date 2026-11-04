import type { Rng } from "@board-games/engine";
import { ludo } from "@board-games/games/ludo";
import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PlayScreen } from "@/features/play/PlayScreen";
import { renderWithIntl } from "@/test/render-with-intl";
import { AI_THROW_DELAY_MS } from "@/transport/ai-timing";
import { createLocalTransport } from "@/transport/local-transport";
import { createMemoryStore } from "@/transport/memory-store";
import type { AiPlayer } from "@/transport/types";

import { LudoBoard } from "../Board";
import { useLudoMoveLabel } from "../move-label";
import { useLudoPlayerLabel } from "../player-label";
import type { DiceStage } from "./stage-types";
import { THROW_DEADLINE_MS } from "./use-dice-throw";

// The play screen while the person here throws the 3D die (design of redesign-ludo-play §4): it
// shows the game as before the roll until the die rests, then tells the result once.

const rest = vi.hoisted(() => ({ onRest: null as (() => void) | null }));

vi.mock("./load-dice3d", () => {
  const stage: DiceStage = {
    canvas: document.createElement("canvas"),
    prepare: () => undefined,
    hold: () => undefined,
    release: () => undefined,
    land: (_face, _within, onRest) => {
      rest.onRest = onRest;
      return true;
    },
    topFace: () => null,
    diePoint: () => ({ x: 0.5, y: 0.5 }),
    holdPoint: () => ({ x: 0.5, y: 0.5 }),
    stop: () => undefined,
    onFailure: () => undefined,
    dispose: () => undefined,
  };
  return { useDice3d: () => stage };
});

const ui = { Board: LudoBoard, usePlayerLabel: useLudoPlayerLabel, useMoveLabel: useLudoMoveLabel };

/** Every roll is a 3 (no horse out: the turn is lost). */
const threes: Rng = { nextInt: (min, max) => Math.min(max, Math.max(min, 2)), nextFloat: () => 0 };

/** An AI that plays its first legal move at once. */
const firstMove: AiPlayer = {
  chooseMove: (request) => Promise.resolve(ludo.legalMoves(request.state as never)[0]),
  dispose: () => undefined,
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Kết quả chỉ lộ khi xúc xắc dừng", () => {
  it("Mất lượt chưa lộ khi xúc xắc còn lăn: the turn line says the player's turn until the die rests", async () => {
    const transport = createLocalTransport({
      definition: ludo,
      store: createMemoryStore(),
      rng: threes,
      mode: "ai",
      start: { mode: "ai", level: "easy", first: "human", playerCount: 2 },
      fallback: { mode: "ai", level: "easy", first: "human" },
      ai: firstMove,
    });
    renderWithIntl(<PlayScreen gameId="ludo" transport={transport} ui={ui} />);
    await act(() => vi.advanceTimersByTimeAsync(0));
    const status = () => screen.getByRole("status");
    const live = () => document.querySelector('[data-ludo-hint] [aria-live="polite"]');
    expect(status()).toHaveTextContent("Đến lượt bạn (Đỏ)");

    const roll = screen.getByRole("button", { name: "Gieo xúc xắc" });
    fireEvent.pointerDown(roll, { pointerId: 1, isPrimary: true, button: 0 });
    fireEvent.pointerUp(roll, { pointerId: 1, isPrimary: true, button: 0 });

    // The 3 is in the game (the AI's turn), not on the screen.
    const snapshot = transport.getSnapshot();
    expect(snapshot.status === "ready" && snapshot.waitingFor).toBe("ai");
    expect(status()).toHaveTextContent("Đến lượt bạn (Đỏ)");
    expect(status()).not.toHaveTextContent("Máy đang nghĩ");
    expect(live()).toHaveTextContent("");

    act(() => {
      rest.onRest?.();
    });
    await act(() => vi.advanceTimersByTimeAsync(THROW_DEADLINE_MS));

    expect(status()).toHaveTextContent("Máy đang nghĩ");
    expect(live()).toHaveTextContent("Đỏ gieo được 3. Không ngựa nào đi được, mất lượt.");
    // Máy chờ cú tung của người chơi: its roll comes after the throw, within 3 s of the number.
    expect(transport.getSnapshot()).toMatchObject({ moveCount: 1 });
    await act(() => vi.advanceTimersByTimeAsync(AI_THROW_DELAY_MS - THROW_DEADLINE_MS));
    expect(transport.getSnapshot()).toMatchObject({ moveCount: 2 });
    transport.dispose();
  });
});
