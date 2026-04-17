/**
 * Sign-In With Stellar (SIWS) — authenticates the user's Freighter wallet
 * against the backend and stores the resulting JWT access token.
 *
 * Flow:
 *  1. GET /auth/challenge  → { nonce, message }
 *  2. signMessage(message) via Freighter
 *  3. POST /auth/verify    → { accessToken, user }  (refresh token set as HttpOnly cookie)
 */
import { signMessage } from '@stellar/freighter-api';
import { authApi, setAccessToken, type AuthUser } from './api';
import { claimReferralCode } from './referral';

export interface SiwsResult {
  accessToken: string;
  user: AuthUser;
}

/**
 * Performs the full SIWS handshake.
 * Throws if Freighter rejects or the backend rejects the signature.
 */
export async function signInWithStellar(walletAddress: string): Promise<SiwsResult> {
  // 1. Get challenge nonce from backend
  const challengeRes = await authApi.challenge();
  const { nonce, message } = challengeRes.data;

  // 2. Ask Freighter to sign the message (freighter-api v6+: signMessage(string))
  const { signedMessage, error } = await signMessage(message);

  if (error) throw new Error(`Freighter signing failed: ${error}`);
  if (!signedMessage) throw new Error('Freighter returned no signature');

  // signedMessage is a string (v6+) or Uint8Array (v5); normalise to base64
  const signatureBase64 = typeof signedMessage === 'string'
    ? signedMessage
    : btoa(String.fromCharCode(...Array.from(signedMessage as unknown as Uint8Array)));

  // 3. Verify signature with backend → get JWT
  const verifyRes = await authApi.verify(walletAddress, signatureBase64, nonce);
  const { accessToken, user } = verifyRes.data;

  // Store access token in memory (never in localStorage)
  setAccessToken(accessToken);

  // Auto-claim referral code from URL query param (?ref=CODE)
  const refCode = new URLSearchParams(window.location.search).get('ref');
  if (refCode) {
    // Fire and forget — don't block login on referral claim failure
    void claimReferralCode(refCode).catch(() => undefined);
  }

  return { accessToken, user };
}

/** Clear the in-memory token and revoke the refresh cookie server-side. */
export async function signOut(): Promise<void> {
  try {
    await authApi.logout();
  } finally {
    setAccessToken(null);
  }
}
