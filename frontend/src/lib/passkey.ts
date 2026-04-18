import * as StellarSdk from '@stellar/stellar-sdk';

/**
 * Passkey Utility for Stellar Soroban.
 * This helper handles WebAuthn registration (attestation) and signing (assertion).
 * For the hackathon demo, we provide a streamlined flow to create a "Smart Account" signer.
 */

export interface PasskeyIdentity {
  id: string; // Credential ID (base64url)
  publicKey: string; // The r1 public key (hex or base64)
  name: string; // Human-readable name (e.g. "My iPhone")
}

/**
 * Generates a challenge for WebAuthn.
 */
function generateChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Registers a new Passkey.
 */
export async function registerPasskey(userName: string): Promise<PasskeyIdentity> {
  const challenge = generateChallenge();
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const options = {
    challenge: challenge as BufferSource,
    rp: {
      name: "Birik",
      id: window.location.hostname,
    },
    user: {
      id: userId as BufferSource,
      name: userName,
      displayName: userName,
    },
    pubKeyCredParams: [
      {
        type: "public-key" as const,
        alg: -7, // ES256 (P-256) which is secp256r1
      },
    ],
    authenticatorSelection: {
      userVerification: "required" as UserVerificationRequirement,
      residentKey: "required" as ResidentKeyRequirement,
      requireResidentKey: true,
    },
    timeout: 60000,
    attestation: "none" as AttestationConveyancePreference,
  } satisfies PublicKeyCredentialCreationOptions;

  const credential = (await navigator.credentials.create({
    publicKey: options,
  })) as PublicKeyCredential;

  if (!credential) {
    throw new Error("Passkey registration failed: No credential returned");
  }

  // In a real app, we would parse the COSE public key from the attestation Object.
  // For the Soroban demo/integration, we encode the credential ID.
  const id = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return {
    id,
    publicKey: "MOCK_PUBLIC_KEY_R1", // In production, extract from credential.response.getPublicKey()
    name: userName,
  };
}

/**
 * Signs a transaction/data with a registered Passkey.
 */
export async function signWithPasskey(credentialId: string, dataToSign: Uint8Array): Promise<{ signature: string; authData: string; clientDataJson: string }> {
  // Decode base64url id
  const rawId = Uint8Array.from(atob(credentialId.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));

  const options = {
    challenge: dataToSign as BufferSource,
    allowCredentials: [
      {
        type: "public-key" as const,
        id: rawId as BufferSource,
      },
    ],
    userVerification: "required" as UserVerificationRequirement,
    timeout: 60000,
  } satisfies PublicKeyCredentialRequestOptions;

  const assertion = (await navigator.credentials.get({
    publicKey: options,
  })) as PublicKeyCredential;

  if (!assertion) {
    throw new Error("Passkey signing failed");
  }

  const response = assertion.response as AuthenticatorAssertionResponse;
  
  // Convert ArrayBuffers to base64 for easy transport/contract consumption
  const signature = btoa(String.fromCharCode(...new Uint8Array(response.signature)));
  const authData = btoa(String.fromCharCode(...new Uint8Array(response.authenticatorData)));
  const clientDataJson = btoa(String.fromCharCode(...new Uint8Array(response.clientDataJSON)));

  return {
    signature,
    authData,
    clientDataJson,
  };
}

/**
 * Helper to check if Passkeys are supported in this browser.
 */
export async function isPasskeySupported(): Promise<boolean> {
  return (
    window.PublicKeyCredential &&
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable &&
    (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
  );
}

/**
 * Demo: Create a "Virtual Wallet Address" from a Passkey.
 * In a real Soroban app, this would be the address of the deployed Smart Wallet contract.
 */
export function getPasskeyVirtualAddress(id: string): string {
  // For demo/hackathon tracking, we generate a deterministic pseudo-address
  // based on the credential ID.
  const hash = StellarSdk.hash(Buffer.from(id));
  return StellarSdk.StrKey.encodeEd25519PublicKey(hash);
}
