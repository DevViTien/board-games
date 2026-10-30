import { useSyncExternalStore } from "react";

import type { PlaySnapshot, Transport } from "@/transport/types";

/** The transport's current snapshot, re-rendering whenever it changes. */
export function useTransportSnapshot<State, Move, Outcome>(
  transport: Transport<State, Move, Outcome>,
): PlaySnapshot<State, Move, Outcome> {
  return useSyncExternalStore(transport.subscribe, transport.getSnapshot, transport.getSnapshot);
}
