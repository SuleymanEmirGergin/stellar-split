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

  // 2. Ask Freighter to sign the message
  const { signedMessage, error } = await signMessage({
    message,
    address: walletAddress,
    networkPassphrase: import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE as string | undefined,
  });

  if (error) throw new Error(`Freighter signing failed: ${error}`);
  if (!signedMessage) throw new Error('Freighter returned no signature');

  // signedMessage is a Uint8Array — convert to base64 for transport
  const signatureBase64 = btoa(String.fromCharCode(...signedMessage));

  // 3. Verify signature with backend → get JWT
  const verifyRes = await authApi.verify(walletAddress, signatureBase64, nonce);
  const { accessToken, user } = verifyRes.data;

  // Store access token in memory (never in localStorage)
  setAccessToken(accessToken);

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
