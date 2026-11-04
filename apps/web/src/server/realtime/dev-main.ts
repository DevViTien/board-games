// Entry point of `pnpm --filter @board-games/web realtime` (and of `pnpm dev`, which runs it next
// to `next dev`): the realtime server on a developer's machine and in E2E.
import { serverEnv } from "../env";
import { openRoomStore } from "../store/open-room-store";
import { REALTIME_PATH, startRealtimeServer } from "./dev-server";

const env = serverEnv();
const store = openRoomStore(env.store);
const server = await startRealtimeServer({
  port: env.realtimePort,
  store,
  abandonAfterMs: env.abandonAfterMs,
});

console.info(
  `[realtime] ws://localhost:${String(server.port)}${REALTIME_PATH} ready, rooms in ${
    env.store.kind === "redis" ? `Redis (keys ${env.store.keyPrefix}*)` : "memory"
  }`,
);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void Promise.all([server.close(), store.close()]).finally(() => {
      process.exit(0);
    });
  });
}
