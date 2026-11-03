import { z } from "zod";

/** Where the realtime server listens, on Vercel (the route) and on a developer's machine alike. */
const REALTIME_PATH = "/api/realtime";

/** `pnpm dev` runs the realtime server next to `next dev`, on its default port. */
const DEV_REALTIME_URL = `ws://localhost:3001${REALTIME_PATH}`;

const realtimeUrlSchema = z.url({ protocol: /^wss?$/u });

interface RealtimeEnv {
  readonly REALTIME_URL?: string | undefined;
  readonly NODE_ENV?: string | undefined;
}

/**
 * The realtime server's address as configured, read on the server at request time (not at build
 * time like a `NEXT_PUBLIC_` variable, so E2E can point a production build at its own server), or
 * `null` to use the page's own origin. Not set: in development, the server `pnpm dev` starts.
 */
export function configuredRealtimeUrl(env: RealtimeEnv): string | null {
  const configured = realtimeUrlSchema.safeParse(env.REALTIME_URL);
  if (configured.success) return configured.data;
  return env.NODE_ENV === "development" ? DEV_REALTIME_URL : null;
}

/**
 * The address the browser connects to: the configured one, or the page's own origin, as on
 * Vercel, where the route serves the WebSocket (`wss:` on an `https:` page).
 */
export function resolveRealtimeUrl(
  configured: string | null,
  location: { readonly protocol: string; readonly host: string },
): string {
  if (configured !== null) return configured;
  return `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}${REALTIME_PATH}`;
}
