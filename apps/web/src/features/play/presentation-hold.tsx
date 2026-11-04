"use client";

import { createContext, useContext, useMemo, useState } from "react";

// Holding what the play screen shows (design of redesign-ludo-play §4): while a board plays out a
// moment of its own (Ludo's throw of the 3D die), the play screen keeps showing its turn line, its
// players, the turn's clock and the game's buttons as they were when the board asked, so the
// result is neither shown nor read before the board shows it. Only the showing waits: the
// transport goes on, and the board receives every new snapshot. Boards that never ask change
// nothing.

/** What a board may ask of the play screen. */
export interface PresentationHold {
  /** Keeps the screen around the board as it is now, until `release`. */
  readonly hold: () => void;
  /** Shows the latest state again. */
  readonly release: () => void;
}

const NO_HOLD: PresentationHold = {
  hold: () => undefined,
  release: () => undefined,
};

const PresentationHoldContext = createContext<PresentationHold>(NO_HOLD);

/** The play screen's hold, for a board; one that does nothing outside a play screen (tests). */
export function usePresentationHold(): PresentationHold {
  return useContext(PresentationHoldContext);
}

export const PresentationHoldProvider = PresentationHoldContext.Provider;

/**
 * The play screen's side: what to show (`live`, or what was live when the board asked to hold),
 * and the hold to give its board. `read` gives what is live right now: the board asks just before
 * it sends its move, which may change the snapshot in the same event.
 */
export function useHeldPresentation<Value>(
  live: Value,
  read: () => Value,
): { readonly shown: Value; readonly control: PresentationHold; readonly held: boolean } {
  const [held, setHeld] = useState<{ readonly value: Value } | null>(null);
  const control = useMemo<PresentationHold>(
    () => ({
      hold: () => {
        const value = read();
        setHeld((current) => current ?? { value });
      },
      release: () => {
        setHeld(null);
      },
    }),
    [read],
  );
  return { shown: held === null ? live : held.value, control, held: held !== null };
}
