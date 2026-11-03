import { z } from "zod";

/** Where the realtime server listens on a developer's machine (`pnpm dev`, E2E). */
const DEFAULT_REALTIME_PORT = 3001;

/** An unset variable often arrives as an empty string (`.env` files, `vercel env pull`). */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

const envSchema = z.object({
  REDIS_URL: optional(
    z.string().regex(/^rediss?:\/\/\S+$/u, "must be a redis:// or rediss:// URL"),
  ),
  /** Set to "1" by Vercel, on deployments and under `vercel dev`. */
  VERCEL: optional(z.string()),
  VERCEL_ENV: optional(z.string()),
  REALTIME_PORT: optional(z.coerce.number().int().min(1).max(65_535)),
});

export class ServerConfigError extends Error {
  override readonly name = "ServerConfigError";
}

export type RoomStoreConfig =
  | { readonly kind: "memory" }
  | { readonly kind: "redis"; readonly url: string; readonly keyPrefix: string };

export interface ServerEnv {
  readonly store: RoomStoreConfig;
  readonly realtimePort: number;
}

/**
 * Production and Preview share one Upstash database; their rooms must never meet. Anything else
 * (a developer's machine, `vercel dev`) is `dev:`.
 */
function keyPrefixOf(vercelEnv: string | undefined): string {
  return vercelEnv === "production" || vercelEnv === "preview" ? `${vercelEnv}:` : "dev:";
}

/**
 * Reads the server's environment. Throws `ServerConfigError` on an invalid value, and on Vercel
 * without `REDIS_URL`: every instance would keep its own rooms in memory and two players would
 * never see each other.
 */
export function readServerEnv(env: Readonly<Record<string, string | undefined>>): ServerEnv {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new ServerConfigError(`Invalid server environment: ${z.prettifyError(parsed.error)}`);
  }
  const { REDIS_URL, VERCEL, VERCEL_ENV, REALTIME_PORT } = parsed.data;
  if (REDIS_URL === undefined && VERCEL === "1") {
    throw new ServerConfigError("REDIS_URL is missing: online rooms need Redis on Vercel");
  }
  return {
    store:
      REDIS_URL === undefined
        ? { kind: "memory" }
        : { kind: "redis", url: REDIS_URL, keyPrefix: keyPrefixOf(VERCEL_ENV) },
    realtimePort: REALTIME_PORT ?? DEFAULT_REALTIME_PORT,
  };
}

let cached: ServerEnv | undefined;

/**
 * The environment of this process, read on first use rather than when the module loads, so
 * `next build` never needs the server's variables.
 */
export function serverEnv(): ServerEnv {
  cached ??= readServerEnv(process.env);
  return cached;
}
