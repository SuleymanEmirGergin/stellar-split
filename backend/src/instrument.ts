/**
 * Sentry instrumentation — MUST be imported as the very first side-effect in
 * `main.ts` (before NestFactory / AppModule / any business code). The Sentry
 * SDK needs to patch Node internals before they are required elsewhere.
 *
 * See: https://docs.sentry.io/platforms/javascript/guides/nestjs/#configure
 *
 * IMPORTANT: when SENTRY_DSN is not set, we DO NOT call `Sentry.init()` at
 * all. Calling it with an empty/invalid DSN was suspected of leaving the
 * Sentry SDK's HTTP instrumentation in a half-patched state — which can
 * silently break `app.listen()` such that the bind log appears but no
 * inbound requests ever land. Skipping init entirely keeps Node's HTTP
 * stack stock when there's no DSN to ship to.
 */
import * as Sentry from '@sentry/node';

const dsn = (process.env.SENTRY_DSN ?? '').trim();

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.APP_VERSION ?? process.env.RAILWAY_GIT_COMMIT_SHA ?? 'unknown',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    // Automatic IP + request header collection (OK for a testnet MVP — no PII
    // passes through the API; wallet addresses are public keys, not identities).
    sendDefaultPii: true,
  });
}

/** Capture an exception with optional extra context. No-op when DSN is unset. */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!dsn) return;
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(err);
  });
}

export { Sentry };
