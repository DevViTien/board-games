import type { KeyboardEvent } from "react";

/** An Enter or Esc that belongs to the IME (`keyCode` 229 is Safari's order of events). */
export function isImeKey(event: KeyboardEvent): boolean {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- the only way to tell in Safari, whose compositionend comes before this keydown
  return event.nativeEvent.isComposing || event.keyCode === 229;
}
