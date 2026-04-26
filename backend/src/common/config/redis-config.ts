/**
 * Shared ioredis connection options.
 *
 * Both BullMQ (in `app.module.ts`) and the Soroban event poller create
 * their own Redis connections. They used to diverge — BullMQ had
 * `maxRetriesPerRequest: null` (mandatory for blocking workers), the
 * poller had nothing — and that caused a production incident:
 *
 *   When REDIS_URL pointed at a host the container couldn't reach,
 *   ioredis would retry the connection forever with no backoff cap.
 *   The retry storm flooded the event loop hard enough that NestJS's
 *   /health/live probe timed out, and Railway's healthcheck proxy
 *   declared the deployment "service unavailable" — even though the
 *   process was technically running.
 *
 * This module centralises the connection shape with three resilience
 * tweaks beyond BullMQ's defaults:
 *
 *  1. `retryStrategy` caps reconnect attempts at 5 with linear backoff,
 *     then **stops** trying instead of looping indefinitely.
 *  2. `enableOfflineQueue: false` so commands fail fast with a clear
 *     error when Redis is down, instead of silently piling up in a
 *     buffer that grows until it exhausts memory.
 *  3. `lazyConnect: true` so app bootstrap doesn't block on the first
 *     Redis handshake — health probes can answer immediately, and
 *     the connection is established just-in-time when the first
 *     command actually fires.
 *
 * Callers must still attach an `error` event handler to the resulting
 * Redis instance — ioredis treats unhandled errors as fatal. See
 * `attachQuietErrorHandler()` below for the helper.
 */

import type { ConnectionOptions } from 'bullmq';
import type { Logger as PinoLogger } from 'pino';
import type Redis from 'ioredis';

export interface ParsedRedisUrl {
  host: string;
  port: number;
  password?: string;
  username?: string;
  /** True when the URL scheme was rediss:// (TLS). */
  tls: boolean;
}

/** Parse a `redis://` or `rediss://` URL into discrete fields. */
export function parseRedisUrl(rawUrl: string): ParsedRedisUrl {
  const u = new URL(rawUrl);
  const isRediss = u.protocol === 'rediss:';
  return {
    host: u.hostname,
    port: u.port ? parseInt(u.port, 10) : (isRediss ? 6380 : 6379),
    ...(u.password ? { password: decodeURIComponent(u.password) } : {}),
    ...(u.username && u.username !== 'default'
      ? { username: decodeURIComponent(u.username) }
      : {}),
    tls: isRediss,
  };
}

/**
 * Resilience-tuned connection options.
 *
 * @param mode 'bullmq' uses `maxRetriesPerRequest: null` (BullMQ requires
 *   this for blocking workers). 'plain' uses `maxRetriesPerRequest: 3`
 *   so transient unavailability surfaces as a normal error instead of
 *   hanging forever.
 */
export function buildRedisConnectionOptions(
  rawUrl: string,
  mode: 'bullmq' | 'plain' = 'plain',
): ConnectionOptions {
  const parsed = parseRedisUrl(rawUrl);

  return {
    host: parsed.host,
    port: parsed.port,
    ...(parsed.password ? { password: parsed.password } : {}),
    ...(parsed.username ? { username: parsed.username } : {}),
    ...(parsed.tls ? { tls: {} } : {}),

    // BullMQ requires `null` for blocking commands; everywhere else we
    // surface a normal error after 3 attempts.
    maxRetriesPerRequest: mode === 'bullmq' ? null : 3,

    // Stop reconnecting after 5 attempts. Without this cap a missing
    // Redis flood-fills the event loop with retries forever — the same
    // failure mode that caused the Railway healthcheck timeout.
    retryStrategy: (times: number) => {
      if (times > 5) return null; // stop reconnecting
      return Math.min(times * 200, 2000);
    },

    // Don't queue commands while disconnected — fail fast instead.
    enableOfflineQueue: false,

    // Don't block app bootstrap on the initial handshake.
    lazyConnect: true,
  };
}

/**
 * Attach an `error` event handler that downgrades repeated connection
 * failures from `[ioredis] Unhandled error event` (which prints a stack
 * trace per attempt) to a single rate-limited warning per minute.
 *
 * This is the difference between a clean log stream and 60 stack traces
 * per second when Redis is unreachable.
 */
export function attachQuietErrorHandler(client: Redis, logger?: PinoLogger | { warn: (...args: unknown[]) => void }): void {
  let lastWarnedAt = 0;
  const COOLDOWN_MS = 60_000;

  client.on('error', (err: Error) => {
    const now = Date.now();
    if (now - lastWarnedAt < COOLDOWN_MS) return;
    lastWarnedAt = now;
    const msg = err?.message ?? String(err);
    if (logger) {
      // pino-style logger
      if (typeof (logger as PinoLogger).warn === 'function') {
        (logger as PinoLogger).warn({ err: msg }, 'Redis connection error (rate-limited)');
        return;
      }
    }
    // eslint-disable-next-line no-console
    console.warn(`[redis] Connection error (next warning in ${COOLDOWN_MS / 1000}s): ${msg}`);
  });
}
