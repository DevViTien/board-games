import { ROOM_PROBLEM, RoomError } from "@/features/room/RoomError";

/** `/room/<code>` with something that cannot be a room code: no such room, as for an expired one. */
export default function RoomNotFound() {
  return <RoomError problem={ROOM_PROBLEM.NotFound} />;
}
