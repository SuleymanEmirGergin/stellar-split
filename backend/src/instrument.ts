/**
 * Sentry instrumentation — MUST be imported as the very first side-effect in
 * `main.ts` (before NestFactory / AppModule / any business code). The Sentry
 * SDK needs to patch Node internals before they are required elsewhere.
 *
 * See: https://docs.sentry.io/platforms/javascript/guides/nestjs/#configure
 */
import * as Sentry from '@sentry/node';

// Production DSN for the Birik backend (stellarsplit-api). Fallback lets us
// ship errors to Sentry even before the Railway env var is set. Override via
// `SENTRY_DSN` to point at a different project (e.g. staging).
const DEFAULT_DSN =
  'https://225b39a31d0256caadbe2602d25dfbdb@o4511206376734720.ingest.de.sentry.io/4511206380404816';

const dsn = process.env.SENTRY_DSN ?? DEFAULT_DSN;

Sentry.init({
  dsn,
  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.APP_VERSION ?? process.env.RAILWAY_GIT_COMMIT_SHA ?? 'unknown',
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
  // Automatic IP + request header collection (OK for a testnet MVP — no PII
  // passes through the API; wallet addresses are public keys, not identities).
  sendDefaultPii: true,
});

/** Capture an exception with optional extra context. */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(err);
  });
}

export { Sentry };
