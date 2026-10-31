import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom has no showModal/close on <dialog>; this minimal stub only toggles `open` so components
// render. Focus trapping and Esc are real browser behaviour, checked in Playwright instead.
Object.assign(HTMLDialogElement.prototype, {
  showModal(this: HTMLDialogElement) {
    this.open = true;
  },
  close(this: HTMLDialogElement) {
    this.open = false;
  },
});

// Testing Library waits for React with a `setTimeout(0)`, and only advances fake timers itself when
// it finds Jest's. Without this, a test using Vitest's fake timers hangs on its first user-event
// interaction; with it, `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` just works.
Object.assign(globalThis, {
  jest: {
    advanceTimersByTime: (ms: number) => {
      vi.advanceTimersByTime(ms);
    },
  },
});

afterEach(() => {
  cleanup();
});
