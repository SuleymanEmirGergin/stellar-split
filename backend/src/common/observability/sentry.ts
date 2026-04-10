/**
 * Sentry initialization — call once at bootstrap before NestJS starts.
 * Only activates when SENTRY_DSN is set (no-op in development by default).
 */
import * as Sentry from '@sentry/node';

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.APP_VERSION ?? 'unknown',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    // Never send PII
    sendDefaultPii: false,
  });
}

/** Capture an exception explicitly (use in catch blocks for non-HTTP errors). */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (process.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (context) scope.setExtras(context);
      Sentry.captureException(err);
    });
  }
}
