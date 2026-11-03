"use client";

import { useEffect, useState } from "react";

import { CONNECTION_STATUS, type ConnectionStatus } from "@/transport/types";

/**
 * How long the connection must stay lost before it is mentioned: Vercel cuts every connection
 * about every 5 minutes and the client is back within ~0.3 s, which must not make text flicker.
 */
const LOST_DELAY_MS = 1500;

/**
 * Whether the connection has been lost (anything but online, or the idle pause, which is told at
 * once) for 1.5 s. Shared by the connection line and the players' panel, so both change together.
 * `null` (a game on this device) is never lost.
 */
export function useLostForAWhile(status: ConnectionStatus | null): boolean {
  const lost =
    status !== null && status !== CONNECTION_STATUS.Online && status !== CONNECTION_STATUS.Idle;
  const [late, setLate] = useState(false);

  // Adjusted during render: back online, the next loss starts its own delay.
  if (late && !lost) setLate(false);

  useEffect(() => {
    if (!lost) return;
    const timer = setTimeout(() => {
      setLate(true);
    }, LOST_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [lost]);

  return lost && late;
}
