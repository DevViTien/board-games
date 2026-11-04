import { act } from "@testing-library/react";
import { vi } from "vitest";

import type { ReadySnapshot, Transport, TransportEvent } from "@/transport/types";

/**
 * A transport whose snapshot the test sets and changes, telling the screen as a real one does;
 * requests are spies. It stands in for the local, AI and online transports.
 */
export function changingTransport<State, Move, Outcome = never>(
  initial: ReadySnapshot<State, Move, Outcome>,
) {
  let snapshot = initial;
  const listeners = new Set<(event: TransportEvent) => void>();
  const transport: Transport<State, Move, Outcome> = {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    submit: vi.fn(),
    requestUndo: vi.fn(),
    requestRedo: vi.fn(),
    requestNewGame: vi.fn(),
    resign: vi.fn(),
    claimAbandoned: vi.fn(),
    dispose: vi.fn(),
  };
  return {
    transport,
    change: (overrides: Partial<ReadySnapshot<State, Move, Outcome>>) => {
      snapshot = { ...snapshot, ...overrides };
      act(() => {
        for (const listener of listeners) listener({ type: "changed" });
      });
    },
    /** Tells the screen an event other than a change (a refusal). */
    emit: (event: TransportEvent) => {
      act(() => {
        for (const listener of listeners) listener(event);
      });
    },
  };
}

/** Makes `prefers-reduced-motion: reduce` match or not (undo with `vi.unstubAllGlobals`). */
export function stubReducedMotion(reduce: boolean): void {
  vi.stubGlobal("matchMedia", () => ({
    matches: reduce,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}
