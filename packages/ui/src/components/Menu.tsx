"use client";

import {
  type ComponentProps,
  createContext,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  use,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { CheckIcon } from "../icons";
import { cn } from "../lib/cn";

/** Room kept between the menu and the edges of the screen. */
const SCREEN_MARGIN = 16;
/** Room between the button and the menu below it. */
const GAP = 6;
/** How long a press that closed the menu may take to end in its click. */
const DISMISS_CLICK_MS = 1000;

/** Which item takes the focus when the menu opens: the chosen one, or the last (↑ on the button). */
type OpenFocus = "checked" | "last";

interface MenuContextValue {
  readonly buttonId: string;
  readonly menuId: string;
  readonly open: boolean;
  /** Whether the browser has `popover` (Baseline 2024): otherwise React state opens the menu. */
  readonly native: boolean;
  readonly buttonRef: RefObject<HTMLButtonElement | null>;
  readonly menuRef: RefObject<HTMLDivElement | null>;
  readonly openFocusRef: RefObject<OpenFocus>;
  /** Set as the menu closes from inside it (Esc, a choice): the focus then goes back to the button. */
  readonly closingFromInsideRef: RefObject<boolean>;
  readonly setOpen: (open: boolean) => void;
  readonly show: () => void;
  readonly hide: () => void;
}

const MenuContext = createContext<MenuContextValue | null>(null);

function useMenu(): MenuContextValue {
  const menu = use(MenuContext);
  if (menu === null) throw new Error("A menu's parts belong inside <Menu>.");
  return menu;
}

function items(menu: HTMLElement | null): HTMLElement[] {
  return menu === null ? [] : [...menu.querySelectorAll<HTMLElement>('[role="menuitemradio"]')];
}

function supportsPopover(): boolean {
  return (
    typeof HTMLElement.prototype.showPopover === "function" && "popover" in HTMLElement.prototype
  );
}

function noSubscription(): () => void {
  return () => undefined;
}

/** Whether the browser has `popover`; the server's HTML assumes it has (then hides the menu by CSS). */
function useNativePopover(): boolean {
  return useSyncExternalStore(noSubscription, supportsPopover, () => true);
}

function isOpen(menu: HTMLElement | null): boolean {
  if (menu === null) return false;
  try {
    return menu.matches(":popover-open");
  } catch {
    return false;
  }
}

/**
 * A menu button with its menu of choices (WAI-ARIA APG "Menu Button"): the theme, the language.
 * Choosing acts at once, which is why it is a menu and not a listbox. Built on the native `popover`
 * (top layer, closed by Esc and by a press elsewhere) without a library; a browser without it
 * (Safari before 17, Firefox before 125) gets the same menu opened by React state. `MenuButton`
 * opens it, `MenuRadioGroup` is the menu, `MenuRadioItem` a choice.
 */
export function Menu({ children }: { readonly children: ReactNode }) {
  const buttonId = useId();
  const menuId = useId();
  const native = useNativePopover();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const openFocusRef = useRef<OpenFocus>("checked");
  const closingFromInsideRef = useRef(false);
  const value = useMemo(() => {
    const show = () => {
      const menu = menuRef.current;
      if (!native) setOpen(true);
      else if (menu !== null && !isOpen(menu)) menu.showPopover();
    };
    const hide = () => {
      const menu = menuRef.current;
      if (!native) setOpen(false);
      else if (isOpen(menu)) menu?.hidePopover();
    };
    return {
      buttonId,
      menuId,
      open,
      native,
      buttonRef,
      menuRef,
      openFocusRef,
      closingFromInsideRef,
      setOpen,
      show,
      hide,
    };
  }, [buttonId, menuId, open, native]);
  return <MenuContext value={value}>{children}</MenuContext>;
}

/** What the menu sets on its button itself. */
type ControlledButtonProps =
  | "type"
  | "ref"
  | "id"
  | "aria-haspopup"
  | "aria-expanded"
  | "aria-controls"
  | "aria-busy"
  | "popoverTarget"
  | "popoverTargetAction";

interface MenuButtonProps extends Omit<ComponentProps<"button">, ControlledButtonProps> {
  /**
   * Busy (the choice is being applied): told to assistive technology, and the menu does not open.
   */
  readonly busy?: boolean;
}

/**
 * The button of a menu: a press, Enter or Space toggles the menu (the browser's `popovertarget`), ↓
 * opens it on the chosen item and ↑ on the last. Its name (`aria-label`) says what is chosen. A
 * caller's `onClick` and `onKeyDown` run first.
 */
export function MenuButton({
  busy = false,
  className,
  onClick,
  onKeyDown,
  ...props
}: MenuButtonProps) {
  const { buttonId, menuId, open, native, buttonRef, openFocusRef, show, hide } = useMenu();
  return (
    <button
      {...props}
      ref={buttonRef}
      id={buttonId}
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={menuId}
      aria-busy={busy || undefined}
      // While busy the menu cannot open: no target, so a press does nothing.
      popoverTarget={native && !busy ? menuId : undefined}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || busy) return;
        openFocusRef.current = "checked";
        // Without `popover`, React state toggles it (the browser does through `popovertarget`).
        if (!native) {
          if (open) hide();
          else show();
        }
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || busy) return;
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        event.preventDefault();
        openFocusRef.current = event.key === "ArrowUp" ? "last" : "checked";
        show();
      }}
      className={cn("aria-busy:cursor-progress", className)}
    />
  );
}

/**
 * Places the menu under its button, its right edge on the button's, kept on screen with a margin on
 * either side. Set before it shows (`beforetoggle`), so it never appears elsewhere first.
 */
function place(menu: HTMLElement, button: HTMLElement): void {
  const anchor = button.getBoundingClientRect();
  const screenWidth = document.documentElement.clientWidth;
  const right = Math.max(SCREEN_MARGIN, screenWidth - anchor.right);
  menu.style.right = `${String(right)}px`;
  menu.style.top = `${String(anchor.bottom + GAP)}px`;
  menu.style.maxWidth = `${String(Math.max(0, screenWidth - right - SCREEN_MARGIN))}px`;
}

interface MenuRadioGroupProps {
  readonly children: ReactNode;
  readonly className?: string | undefined;
}

/**
 * The menu: its items are radios of one choice. ↑/↓ move through them (round), Home/End to the
 * ends, a letter to the next item starting with it; Enter or Space chooses; Esc closes it and gives
 * the focus back to the button; Tab closes it and moves on. A press elsewhere closes it and does
 * nothing else: the press that dismisses a menu never plays a move on the board under it.
 */
export function MenuRadioGroup({ children, className }: MenuRadioGroupProps) {
  const {
    buttonId,
    menuId,
    open,
    native,
    buttonRef,
    menuRef,
    openFocusRef,
    closingFromInsideRef,
    setOpen,
    hide,
  } = useMenu();

  // The item to focus as the menu opens: the chosen one, or the last.
  const target = useCallback(() => {
    const all = items(menuRef.current);
    return openFocusRef.current === "last"
      ? all.at(-1)
      : (all.find((item) => item.getAttribute("aria-checked") === "true") ?? all[0]);
  }, [menuRef, openFocusRef]);

  // Native: `beforetoggle` places the menu; `toggle` (once it opened or closed) mirrors its state.
  useEffect(() => {
    const menu = menuRef.current;
    if (!native || menu === null) return;
    const onBeforeToggle = (event: Event) => {
      if ((event as ToggleEvent).newState !== "open") return;
      const button = buttonRef.current;
      if (button !== null) place(menu, button);
      // The browser focuses a popover's `autofocus` item as it shows it, before any key that
      // follows: Tab pressed right after Enter leaves from inside the menu, not from its button.
      const focused = target();
      for (const item of items(menu)) item.toggleAttribute("autofocus", item === focused);
    };
    const onToggle = (event: Event) => {
      setOpen((event as ToggleEvent).newState === "open");
    };
    menu.addEventListener("beforetoggle", onBeforeToggle);
    menu.addEventListener("toggle", onToggle);
    return () => {
      menu.removeEventListener("beforetoggle", onBeforeToggle);
      menu.removeEventListener("toggle", onToggle);
    };
  }, [native, buttonRef, menuRef, setOpen, target]);

  // Without `popover`, the menu is placed once it renders open.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    const button = buttonRef.current;
    if (native || !open || menu === null || button === null) return;
    place(menu, button);
  }, [native, open, buttonRef, menuRef]);

  // Open: kept in place, focused on its item; a press elsewhere closes it (without `popover`) and
  // its click is swallowed. Closed: the focus goes back to the button only when it was closed from
  // inside (Esc, a choice); after a press elsewhere or Tab it stays where the player put it.
  const wasOpen = useRef(false);
  useEffect(() => {
    const menu = menuRef.current;
    if (!open) {
      if (wasOpen.current && closingFromInsideRef.current) buttonRef.current?.focus();
      wasOpen.current = false;
      closingFromInsideRef.current = false;
      return;
    }
    wasOpen.current = true;
    // Where the browser has not (no `popover`, no `autofocus` support).
    if (menu !== null && !menu.contains(document.activeElement)) target()?.focus();
    const reposition = () => {
      const button = buttonRef.current;
      if (menu !== null && button !== null) place(menu, button);
    };
    const onPointerDown = (event: PointerEvent) => {
      const pressed = event.target as Node | null;
      if (pressed === null || menu?.contains(pressed) || buttonRef.current?.contains(pressed)) {
        return;
      }
      if (!native) setOpen(false);
      // The click this press ends in only dismisses the menu: it must not reach what is under it
      // (a square of the board, a link). Dropped if no click follows (a drag).
      const swallow = (click: MouseEvent) => {
        click.preventDefault();
        click.stopPropagation();
        window.clearTimeout(timer);
      };
      const timer = window.setTimeout(() => {
        window.removeEventListener("click", swallow, true);
      }, DISMISS_CLICK_MS);
      window.addEventListener("click", swallow, { capture: true, once: true });
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open, native, buttonRef, menuRef, closingFromInsideRef, setOpen, target]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const all = items(menuRef.current);
      const current = all.indexOf(document.activeElement as HTMLElement);
      const focusAt = (index: number) => {
        all[(index + all.length) % all.length]?.focus();
      };
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          focusAt(current + 1);
          return;
        case "ArrowUp":
          event.preventDefault();
          focusAt(current - 1);
          return;
        case "Home":
          event.preventDefault();
          focusAt(0);
          return;
        case "End":
          event.preventDefault();
          focusAt(all.length - 1);
          return;
        case "Escape":
          // Closed here too: not every browser treats Esc as a close request (Android's take the
          // back gesture), and the focus goes back to the button.
          event.preventDefault();
          closingFromInsideRef.current = true;
          buttonRef.current?.focus();
          hide();
          return;
        case "Tab":
          // Closes, and lets the browser move the focus on from the button.
          buttonRef.current?.focus();
          hide();
          return;
        default:
      }
      if (event.key.length === 1 && /\S/u.test(event.key)) {
        const letter = event.key.toLocaleLowerCase();
        const order = [...all.slice(current + 1), ...all.slice(0, current + 1)];
        order
          .find((item) => item.textContent.trim().toLocaleLowerCase().startsWith(letter))
          ?.focus();
      }
    },
    [buttonRef, menuRef, closingFromInsideRef, hide],
  );

  return (
    <div
      ref={menuRef}
      id={menuId}
      role="menu"
      aria-labelledby={buttonId}
      // Focusable by script only (an item has the focus while it is open).
      tabIndex={-1}
      popover={native ? "auto" : undefined}
      // Without `popover`, closed is `hidden`; with it, the browser hides it while closed.
      hidden={!native && !open}
      data-open={!native && open ? "" : undefined}
      onKeyDown={onKeyDown}
      className={cn(
        // Hidden unless open, also in a browser that does not know `popover` (the server's HTML
        // carries the attribute either way). The browser centres a popover; it goes under its
        // button instead (`place`), above the page without `popover`'s top layer too.
        "fixed inset-auto z-40 m-0 hidden w-56 flex-col gap-0.5 rounded-control border border-border bg-surface p-1.5 text-fg shadow-raised open:flex data-open:flex",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface MenuRadioItemProps {
  readonly checked: boolean;
  readonly onSelect: () => void;
  /** Decorative, before the words. */
  readonly icon?: ReactNode;
  /** The language the item is written in, when not the page's ("日本語"). */
  readonly lang?: string | undefined;
  readonly children: ReactNode;
}

/** One choice of a menu, 44 px high, marked with a tick (not by colour alone) when chosen. */
export function MenuRadioItem({ checked, onSelect, icon, lang, children }: MenuRadioItemProps) {
  const { buttonRef, closingFromInsideRef, hide } = useMenu();
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      tabIndex={-1}
      lang={lang}
      onClick={() => {
        onSelect();
        closingFromInsideRef.current = true;
        buttonRef.current?.focus();
        hide();
      }}
      className={cn(
        "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-[calc(var(--radius-control)-0.25rem)] px-3 text-left text-body",
        "transition-lift hover:bg-surface-muted focus-visible:bg-surface-muted motion-reduce:transition-none",
        "focus-ring",
        checked && "font-semibold",
      )}
    >
      {icon !== undefined && <span className="flex shrink-0 [&_svg]:size-5">{icon}</span>}
      <span className="min-w-0 flex-1">{children}</span>
      <CheckIcon aria-hidden className={cn("size-5 shrink-0", !checked && "invisible")} />
    </button>
  );
}
