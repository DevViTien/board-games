import { type RejectionCode, ROOM_ERROR } from "@board-games/protocol";

// Plain values, not in RoomError.tsx: a "use client" module only hands a server component
// references to its exports, so `ROOM_PROBLEM.NotFound` read there was undefined.

/** Why a room cannot be entered, as the player is told (design of `add-online-play`, §6). */
export const ROOM_PROBLEM = {
  NotFound: "notFound",
  Full: "full",
  /** The app is older than the server: only a reload helps. */
  Outdated: "outdated",
  /** The room's data cannot be turned into a game of this app. */
  Broken: "broken",
} as const;

export type RoomProblem = (typeof ROOM_PROBLEM)[keyof typeof ROOM_PROBLEM];

/** The page for a connection that gave up with `code`. */
export function roomProblemOf(code: RejectionCode | null): RoomProblem {
  switch (code) {
    case ROOM_ERROR.RoomNotFound: {
      return ROOM_PROBLEM.NotFound;
    }
    case ROOM_ERROR.RoomFull: {
      return ROOM_PROBLEM.Full;
    }
    case ROOM_ERROR.OutdatedClient: {
      return ROOM_PROBLEM.Outdated;
    }
    default: {
      return ROOM_PROBLEM.Broken;
    }
  }
}
