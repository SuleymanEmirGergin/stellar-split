import { renderHook, waitFor } from '@testing-library/react';
import { useSecurityData } from './useSecurityData';

// Mock contract.ts — avoid Soroban RPC
vi.mock('../lib/contract', () => ({
  isDemoMode: vi.fn(() => true),
  getRecovery: vi.fn(),
  getGuardians: vi.fn(),
}));

// Mock localStorage-based recovery helpers
vi.mock('../lib/recovery', () => ({
  loadAllGuardians: vi.fn(() => ({})),
  loadRecoveryRequest: vi.fn(() => null),
}));

import { isDemoMode, getRecovery, getGuardians } from '../lib/contract';
import { loadAllGuardians, loadRecoveryRequest } from '../lib/recovery';

const mockIsDemoMode = vi.mocked(isDemoMode);
const mockLoadAllGuardians = vi.mocked(loadAllGuardians);
const mockLoadRecoveryRequest = vi.mocked(loadRecoveryRequest);
const mockGetRecovery = vi.mocked(getRecovery);
const mockGetGuardians = vi.mocked(getGuardians);

beforeEach(() => {
  vi.clearAllMocks();
  mockIsDemoMode.mockReturnValue(true);
  mockLoadAllGuardians.mockReturnValue({});
  mockLoadRecoveryRequest.mockReturnValue(null);
});

describe('useSecurityData — demo mode', () => {
  it('returns null activeRecovery and null guardianConfig when nothing saved', async () => {
    const { result } = renderHook(() => useSecurityData('GABC', 1));
    await waitFor(() => {
      expect(result.current.activeRecovery).toBeNull();
      expect(result.current.guardianConfig).toBeNull();
    });
  });

  it('loads guardianConfig from localStorage in demo mode', async () => {
    mockLoadAllGuardians.mockReturnValue({
      GABC: {
        userAddress: 'GABC',
        guardians: ['G1', 'G2'],
        threshold: 1,
      },
    });

    const { result } = renderHook(() => useSecurityData('GABC', 1));
    await waitFor(() => {
      expect(result.current.guardianConfig).toEqual({
        user: 'GABC',
        guardians: ['G1', 'G2'],
        threshold: 1,
      });
    });
  });

  it('loads pending activeRecovery when targetAddress matches walletAddress', async () => {
    mockLoadRecoveryRequest.mockReturnValue({
      targetAddress: 'GABC',
      newAddress: 'GNEW',
      approvals: ['G1'],
      status: 'pending',
    });

    const { result } = renderHook(() => useSecurityData('GABC', 1));
    await waitFor(() => {
      expect(result.current.activeRecovery).toEqual({
        target: 'GABC',
        new_address: 'GNEW',
        approvals: ['G1'],
        status: 0,
      });
    });
  });

  it('does not set activeRecovery when targetAddress does not match', async () => {
    mockLoadRecoveryRequest.mockReturnValue({
      targetAddress: 'GOTHER',
      newAddress: 'GNEW',
      approvals: [],
      status: 'pending',
    });

    const { result } = renderHook(() => useSecurityData('GABC', 1));
    await waitFor(() => {
      expect(result.current.activeRecovery).toBeNull();
    });
  });

  it('does not set activeRecovery when request is completed', async () => {
    mockLoadRecoveryRequest.mockReturnValue({
      targetAddress: 'GABC',
      newAddress: 'GNEW',
      approvals: ['G1'],
      status: 'completed',
    });

    const { result } = renderHook(() => useSecurityData('GABC', 1));
    await waitFor(() => {
      expect(result.current.activeRecovery).toBeNull();
    });
  });

  it('does nothing when walletAddress is empty', async () => {
    const { result } = renderHook(() => useSecurityData('', 1));
    await waitFor(() => {
      expect(result.current.activeRecovery).toBeNull();
      expect(result.current.guardianConfig).toBeNull();
    });
  });
});

describe('useSecurityData — contract mode', () => {
  beforeEach(() => {
    mockIsDemoMode.mockReturnValue(false);
  });

  it('calls getRecovery and getGuardians when not in demo mode', async () => {
    mockGetRecovery.mockResolvedValue(null);
    mockGetGuardians.mockResolvedValue(null);

    renderHook(() => useSecurityData('GABC', 1));
    await waitFor(() => {
      expect(mockGetRecovery).toHaveBeenCalledWith('GABC', 'GABC');
      expect(mockGetGuardians).toHaveBeenCalledWith('GABC', 'GABC');
    });
  });

  it('sets activeRecovery and guardianConfig from contract response', async () => {
    const mockRecovery = { target: 'GABC', new_address: 'GNEW', approvals: [], status: 0 };
    const mockConfig = { user: 'GABC', guardians: ['G1'], threshold: 1 };
    mockGetRecovery.mockResolvedValue(mockRecovery);
    mockGetGuardians.mockResolvedValue(mockConfig);

    const { result } = renderHook(() => useSecurityData('GABC', 1));
    await waitFor(() => {
      expect(result.current.activeRecovery).toEqual(mockRecovery);
      expect(result.current.guardianConfig).toEqual(mockConfig);
    });
  });

  it('handles contract errors gracefully', async () => {
    mockGetRecovery.mockRejectedValue(new Error('RPC offline'));
    mockGetGuardians.mockRejectedValue(new Error('RPC offline'));

    const { result } = renderHook(() => useSecurityData('GABC', 1));
    // Should not throw, just leave state as null
    await waitFor(() => {
      expect(result.current.activeRecovery).toBeNull();
    });
  });
});

describe('useSecurityData — loadSecurityData callback', () => {
  it('exposes a reloadable loadSecurityData callback', async () => {
    const { result } = renderHook(() => useSecurityData('GABC', 1));
    await waitFor(() => { expect(result.current.loadSecurityData).toBeTypeOf('function'); });
  });
});
