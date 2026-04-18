/**
 * JWT token helpers for authenticated E2E requests.
 *
 * Usage:
 *   const token = generateTestToken({ sub: 'user-1', wallet: 'GABC...' });
 *   await request(app.getHttpServer())
 *     .get('/groups')
 *     .set('Authorization', `Bearer ${token}`)
 *     .expect(200);
 */

import * as jwt from 'jsonwebtoken';

export const TEST_JWT_SECRET = 'test-jwt-secret-for-e2e-only';

export interface TestTokenPayload {
  sub: string;
  wallet: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate a signed JWT for use in test requests.
 * Defaults to a 1-hour expiry.
 */
export function generateTestToken(
  payload: Omit<TestTokenPayload, 'iat' | 'exp'>,
  options: jwt.SignOptions = {},
): string {
  return jwt.sign(payload, TEST_JWT_SECRET, {
    expiresIn: '1h',
    ...options,
  });
}

/**
 * Generate an expired JWT for testing 401 scenarios.
 */
export function generateExpiredToken(
  payload: Omit<TestTokenPayload, 'iat' | 'exp'>,
): string {
  return jwt.sign(payload, TEST_JWT_SECRET, {
    expiresIn: '-1s',
  });
}

/**
 * Generate a JWT signed with the wrong secret for testing 401 scenarios.
 */
export function generateInvalidToken(
  payload: Omit<TestTokenPayload, 'iat' | 'exp'>,
): string {
  return jwt.sign(payload, 'wrong-secret', {
    expiresIn: '1h',
  });
}

/**
 * Default test user fixtures.
 */
export const TEST_USER_A = {
  id: 'test-user-a-uuid',
  walletAddress: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWNA',
  reputationScore: 0,
};

export const TEST_USER_B = {
  id: 'test-user-b-uuid',
  walletAddress: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPGOZ3GGMFAHJ3IRCKLR2TONBQA',
  reputationScore: 0,
};

/**
 * Generate auth token for TEST_USER_A (the default test user).
 */
export function getTestAuthHeader(userId = TEST_USER_A.id, wallet = TEST_USER_A.walletAddress): string {
  const token = generateTestToken({ sub: userId, wallet });
  return `Bearer ${token}`;
}
