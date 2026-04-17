import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPasskeyVirtualAddress, isPasskeySupported, registerPasskey, signWithPasskey } from './passkey';

describe('getPasskeyVirtualAddress', () => {
  it('returns a valid Stellar public key (starts with G)', () => {
    const address = getPasskeyVirtualAddress('test-credential-id');
    expect(address).toMatch(/^G[A-Z2-7]{55}$/);
  });

  it('returns a deterministic address for the same id', () => {
    const a1 = getPasskeyVirtualAddress('cred-abc');
    const a2 = getPasskeyVirtualAddress('cred-abc');
    expect(a1).toBe(a2);
  });

  it('returns different addresses for different ids', () => {
    const a1 = getPasskeyVirtualAddress('cred-aaa');
    const a2 = getPasskeyVirtualAddress('cred-bbb');
    expect(a1).not.toBe(a2);
  });
});

describe('isPasskeySupported', () => {
  it('returns false when PublicKeyCredential is not available', async () => {
    const original = (globalThis as any).PublicKeyCredential;
    delete (globalThis as any).PublicKeyCredential;
    const result = await isPasskeySupported();
    expect(result).toBeFalsy();
    (globalThis as any).PublicKeyCredential = original;
  });

  it('returns false when platform authenticator is not available', async () => {
    (globalThis as any).PublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(false),
    };
    const result = await isPasskeySupported();
    expect(result).toBeFalsy();
  });

  it('returns true when platform authenticator is available', async () => {
    (globalThis as any).PublicKeyCredential = {
      isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(true),
    };
    const result = await isPasskeySupported();
    expect(result).toBe(true);
  });
});

describe('registerPasskey', () => {
  it('throws when navigator.credentials.create returns null', async () => {
    Object.defineProperty(navigator, 'credentials', {
      value: { create: vi.fn().mockResolvedValue(null) },
      writable: true,
    });
    await expect(registerPasskey('Alice')).rejects.toThrow('Passkey registration failed');
  });

  it('returns a PasskeyIdentity with the given userName', async () => {
    const rawId = new Uint8Array([1, 2, 3, 4]);
    Object.defineProperty(navigator, 'credentials', {
      value: {
        create: vi.fn().mockResolvedValue({ rawId: rawId.buffer }),
      },
      writable: true,
    });
    const identity = await registerPasskey('Bob');
    expect(identity.name).toBe('Bob');
    expect(typeof identity.id).toBe('string');
    expect(identity.publicKey).toBe('MOCK_PUBLIC_KEY_R1');
  });
});

describe('signWithPasskey', () => {
  it('throws when navigator.credentials.get returns null', async () => {
    Object.defineProperty(navigator, 'credentials', {
      value: { get: vi.fn().mockResolvedValue(null) },
      writable: true,
    });
    await expect(signWithPasskey('Y3JlZA==', new Uint8Array([1]))).rejects.toThrow('Passkey signing failed');
  });

  it('returns signature, authData, and clientDataJson as base64 strings', async () => {
    const mockResponse = {
      signature: new Uint8Array([10, 20]).buffer,
      authenticatorData: new Uint8Array([30, 40]).buffer,
      clientDataJSON: new Uint8Array([50, 60]).buffer,
    };
    Object.defineProperty(navigator, 'credentials', {
      value: { get: vi.fn().mockResolvedValue({ response: mockResponse }) },
      writable: true,
    });
    const result = await signWithPasskey('Y3JlZA==', new Uint8Array([1]));
    expect(typeof result.signature).toBe('string');
    expect(typeof result.authData).toBe('string');
    expect(typeof result.clientDataJson).toBe('string');
  });
});
