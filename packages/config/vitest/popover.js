// jsdom has no `popover`. This stand-in follows the browser closely enough for component tests:
// the `popover` property (so feature detection finds it), `showPopover`/`hidePopover`/
// `togglePopover` with `beforetoggle` and `toggle` events, `:popover-open` for `matches`, a press on
// a `popovertarget` button toggles its popover, and an open popover closes on Esc or on a press
// elsewhere. A closed popover is hidden, as in a browser. The real thing (top layer, placement,
// focus) is checked in Playwright. Shared by the setup files of packages/ui and apps/web.

/** The open popovers: the stand-in's own record, never seen by the code under test. */
const open = new WeakSet();
const OPEN_SELECTOR = ":popover-open";
/** jsdom hides every `[popover]` (it knows no `:popover-open`); an open one is marked to show. */
const SHOWN = "data-test-popover-shown";

/**
 * @param {HTMLElement} popover
 * @param {boolean} next
 */
function setOpen(popover, next) {
  if (open.has(popover) === next) return;
  const states = next
    ? { newState: "open", oldState: "closed" }
    : { newState: "closed", oldState: "open" };
  popover.dispatchEvent(Object.assign(new Event("beforetoggle"), states));
  if (next) open.add(popover);
  else open.delete(popover);
  popover.toggleAttribute(SHOWN, next);
  popover.dispatchEvent(Object.assign(new Event("toggle"), states));
}

/** @returns {HTMLElement[]} */
function openPopovers() {
  return [...document.querySelectorAll("[popover]")].filter((element) =>
    open.has(/** @type {HTMLElement} */ (element)),
  );
}

/** What `installPopoverStub` added, so a test can take it away (a browser without popovers). */
const ADDED = ["popover", "showPopover", "hidePopover", "togglePopover"];

/** @type {Map<string, PropertyDescriptor>} */
const descriptors = new Map();

/** Installs the stand-in once per test file (a setup file). */
export function installPopoverStub() {
  Object.defineProperty(HTMLElement.prototype, "popover", {
    configurable: true,
    get() {
      return this.getAttribute("popover");
    },
    set(value) {
      if (value === null) this.removeAttribute("popover");
      else this.setAttribute("popover", String(value));
    },
  });
  Object.assign(HTMLElement.prototype, {
    /** @this {HTMLElement} */
    showPopover() {
      setOpen(this, true);
    },
    /** @this {HTMLElement} */
    hidePopover() {
      setOpen(this, false);
    },
    /**
     * @this {HTMLElement}
     * @param {boolean} [force]
     */
    togglePopover(force) {
      const next = force ?? !open.has(this);
      setOpen(this, next);
      return next;
    },
  });
  for (const name of ADDED) {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, name);
    if (descriptor !== undefined) descriptors.set(name, descriptor);
  }
  const matches = Element.prototype.matches;
  Element.prototype.matches = function matchesWithPopovers(selectors) {
    if (selectors === OPEN_SELECTOR) return open.has(/** @type {HTMLElement} */ (this));
    return matches.call(this, selectors);
  };

  const style = document.createElement("style");
  style.textContent = `[popover][${SHOWN}] { display: block !important; }`;
  document.head.append(style);

  document.addEventListener("click", (event) => {
    const invoker = /** @type {Element | null} */ (event.target)?.closest("[popovertarget]");
    const id = invoker?.getAttribute("popovertarget");
    if (id === null || id === undefined) return;
    const popover = document.getElementById(id);
    if (popover !== null) setOpen(popover, !open.has(popover));
  });
  document.addEventListener(
    "pointerdown",
    (event) => {
      const target = /** @type {Element | null} */ (event.target);
      for (const popover of openPopovers()) {
        const invoker = target?.closest("[popovertarget]")?.getAttribute("popovertarget");
        if (target !== null && (popover.contains(target) || invoker === popover.id)) continue;
        setOpen(popover, false);
      }
    },
    true,
  );
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    for (const popover of openPopovers()) setOpen(popover, false);
  });
}

/** Removes the stand-in's API, as in a browser without popovers; `restorePopoverStub` undoes it. */
export function removePopoverStub() {
  for (const name of ADDED) Reflect.deleteProperty(HTMLElement.prototype, name);
}

export function restorePopoverStub() {
  for (const [name, descriptor] of descriptors) {
    Object.defineProperty(HTMLElement.prototype, name, descriptor);
  }
}
