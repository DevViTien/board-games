"use client";

import { useEffect, useState } from "react";

/**
 * This device's `Date.now()`, read again every `everyMs` while `active`: for a clock on screen
 * only. Whatever renders it renders that often, so keep it in a small component, outside any live
 * region.
 */
export function useTickingClock(everyMs: number, active = true): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const tick = () => {
      setNow(Date.now());
    };
    tick();
    const timer = setInterval(tick, everyMs);
    return () => {
      clearInterval(timer);
    };
  }, [everyMs, active]);

  return now;
}
