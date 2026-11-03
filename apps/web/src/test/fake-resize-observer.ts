import { vi } from "vitest";

/**
 * Replaces ResizeObserver (jsdom has none, and does no layout) with one that reports every
 * observed element as `width` CSS pixels wide, at once. Undo with `vi.unstubAllGlobals()`.
 */
export function observeWidthAs(width: number): void {
  class FakeResizeObserver {
    readonly #callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.#callback = callback;
    }

    observe(target: Element) {
      const entry = { target, contentRect: { width } } as unknown as ResizeObserverEntry;
      this.#callback([entry], this);
    }

    unobserve() {
      // Nothing is watched.
    }

    disconnect() {
      // Nothing is watched.
    }
  }
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
}
