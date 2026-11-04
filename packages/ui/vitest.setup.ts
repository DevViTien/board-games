import "@testing-library/jest-dom/vitest";

import { installPopoverStub } from "@board-games/config/vitest/popover";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

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

// jsdom has no `popover`: a shared stand-in (packages/config).
installPopoverStub();

afterEach(() => {
  cleanup();
});
