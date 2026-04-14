import { signInWithStellar, signOut } from './siws';

vi.mock('@stellar/freighter-api', () => ({
  signMessage: vi.fn(),
}));

vi.mock('./api', () => ({
  authApi: {
    challenge: vi.fn(),
    verify: vi.fn(),
    logout: vi.fn(),
  },
  setAccessToken: vi.fn(),
}));

import { signMessage } from '@stellar/freighter-api';
import { authApi, setAccessToken } from './api';

const mockSignMessage = vi.mocked(signMessage);
const mockChallenge = vi.mocked(authApi.challenge);
const mockVerify = vi.mocked(authApi.verify);
const mockLogout = vi.mocked(authApi.logout);
const mockSetToken = vi.mocked(setAccessToken);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('signOut', () => {
  it('calls authApi.logout and clears token', async () => {
    mockLogout.mockResolvedValue(undefined as never);
    await signOut();
    expect(mockLogout).toHaveBeenCalled();
    expect(mockSetToken).toHaveBeenCalledWith(null);
  });

  it('still clears token even when logout throws (try/finally re-throws)', async () => {
    mockLogout.mockRejectedValue(new Error('network'));
    await expect(signOut()).rejects.toThrow('network');
    expect(mockSetToken).toHaveBeenCalledWith(null);
  });
});

describe('signInWithStellar', () => {
  const wallet = 'GABC123';

  beforeEach(() => {
    mockChallenge.mockResolvedValue({
      data: { nonce: 'abc123', message: 'sign this message' },
    } as never);
    mockSignMessage.mockResolvedValue({
      signedMessage: 'base64signature',
      error: undefined,
    } as never);
    mockVerify.mockResolvedValue({
      data: { accessToken: 'tok_xyz', user: { id: 'u1', walletAddress: wallet } },
    } as never);
  });

  it('returns accessToken and user on success', async () => {
    const result = await signInWithStellar(wallet);
    expect(result.accessToken).toBe('tok_xyz');
    expect(result.user.walletAddress).toBe(wallet);
  });

  it('stores access token via setAccessToken', async () => {
    await signInWithStellar(wallet);
    expect(mockSetToken).toHaveBeenCalledWith('tok_xyz');
  });

  it('throws when Freighter returns an error', async () => {
    mockSignMessage.mockResolvedValue({ signedMessage: undefined, error: 'User rejected' } as never);
    await expect(signInWithStellar(wallet)).rejects.toThrow('Freighter signing failed');
  });

  it('throws when Freighter returns no signedMessage', async () => {
    mockSignMessage.mockResolvedValue({ signedMessage: undefined, error: undefined } as never);
    await expect(signInWithStellar(wallet)).rejects.toThrow('no signature');
  });

  it('passes nonce and signature to authApi.verify', async () => {
    await signInWithStellar(wallet);
    expect(mockVerify).toHaveBeenCalledWith(wallet, 'base64signature', 'abc123');
  });
});
