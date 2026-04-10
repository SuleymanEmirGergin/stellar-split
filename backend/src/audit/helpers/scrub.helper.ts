const SENSITIVE_KEYS = new Set([
  'password', 'passwordHash', 'password_hash',
  'secret', 'token', 'accessToken', 'refreshToken',
  'tokenHash', 'apiKey', 'privateKey', 'signature',
  'stripeKey', 'totpSecret', 'vapidPrivateKey',
]);

/**
 * Removes sensitive fields from a state snapshot before storing in AuditLog.
 * Operates shallowly — nested objects are serialized but not deep-scrubbed.
 */
export function scrub(state: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(state).map(([k, v]) =>
      SENSITIVE_KEYS.has(k) ? [k, '[REDACTED]'] : [k, v],
    ),
  );
}
