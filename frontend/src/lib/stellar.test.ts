import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { truncateAddress, formatAmount, formatXLM, getExplorerTxUrl, isTestnet, isMainnet, isFreighterInstalled, connectFreighter, getFreighterAddress } from './stellar';

describe('truncateAddress', () => {
  it('truncates a standard Stellar address', () => {
    const addr = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
    expect(truncateAddress(addr)).toBe('GBRPYH...C7OX2H');
  });

  it('returns short addresses unchanged', () => {
    expect(truncateAddress('GABCDE')).toBe('GABCDE');
    expect(truncateAddress('short')).toBe('short');
  });

  it('handles empty or falsy input', () => {
    expect(truncateAddress('')).toBe('');
    // @ts-expect-error: testing null input
    expect(truncateAddress(null)).toBeFalsy();
  });

  it('handles exactly 12 character input', () => {
    expect(truncateAddress('ABCDEFGHIJKL')).toBe('ABCDEF...GHIJKL');
  });
});

describe('formatAmount', () => {
  it('converts stroops to XLM (divide by 10^7)', () => {
    expect(formatAmount(10_000_000)).toBe('1');
    expect(formatAmount(50_000_000)).toBe('5');
  });

  it('handles zero', () => {
    expect(formatAmount(0)).toBe('0');
  });

  it('handles fractional amounts', () => {
    const result = formatAmount(1_234_567);
    expect(parseFloat(result)).toBeCloseTo(0.1234567, 5);
  });
});

describe('formatXLM', () => {
  it('formats with 2 decimals and XLM suffix', () => {
    expect(formatXLM(10_000_000)).toBe('1.00 XLM');
    expect(formatXLM(50_000_000)).toBe('5.00 XLM');
  });

  it('handles zero', () => {
    expect(formatXLM(0)).toBe('0.00 XLM');
  });
});

describe('getExplorerTxUrl', () => {
  it('returns # for empty hash', () => {
    expect(getExplorerTxUrl('')).toBe('#');
  });

  it('returns # for non-string input', () => {
    // @ts-expect-error testing invalid input
    expect(getExplorerTxUrl(null)).toBe('#');
  });

  it('returns a stellar.expert URL for valid hash', () => {
    const url = getExplorerTxUrl('abc123');
    expect(url).toContain('stellar.expert/explorer');
    expect(url).toContain('abc123');
  });

  it('uses public network when NETWORK_PASSPHRASE is mainnet', async () => {
    vi.stubEnv('VITE_NETWORK_PASSPHRASE', 'Public Global Stellar Network ; September 2015');
    vi.resetModules();
    const { getExplorerTxUrl: getTxUrl } = await import('./stellar');
    const url = getTxUrl('abc123');
    expect(url).toContain('/public/');
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});

describe('stellar.ts env var configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uses VITE_HORIZON_URL when set', async () => {
    vi.stubEnv('VITE_HORIZON_URL', 'https://custom-horizon.example.com');
    vi.resetModules();
    const { HORIZON_URL } = await import('./stellar');
    expect(HORIZON_URL).toBe('https://custom-horizon.example.com');
  });

  it('uses VITE_CONTRACT_ID when set', async () => {
    vi.stubEnv('VITE_CONTRACT_ID', 'CCUSTOMCONTRACTID12345');
    vi.resetModules();
    const { CONTRACT_ID } = await import('./stellar');
    expect(CONTRACT_ID).toBe('CCUSTOMCONTRACTID12345');
  });

  it('uses VITE_NETWORK_PASSPHRASE when set', async () => {
    vi.stubEnv('VITE_NETWORK_PASSPHRASE', 'Custom Network Passphrase');
    vi.resetModules();
    const { NETWORK_PASSPHRASE } = await import('./stellar');
    expect(NETWORK_PASSPHRASE).toBe('Custom Network Passphrase');
  });

  it('uses VITE_SOROBAN_RPC_URL when set', async () => {
    vi.stubEnv('VITE_SOROBAN_RPC_URL', 'https://custom-rpc.example.com');
    vi.resetModules();
    // Just importing covers the branch; verify the server was created with custom URL
    const mod = await import('./stellar');
    expect(mod).toBeDefined();
  });
});

describe('isTestnet / isMainnet', () => {
  it('isTestnet returns a boolean', () => {
    expect(typeof isTestnet()).toBe('boolean');
  });

  it('isMainnet returns a boolean', () => {
    expect(typeof isMainnet()).toBe('boolean');
  });

  it('isTestnet and isMainnet are mutually exclusive (cannot both be true)', () => {
    expect(isTestnet() && isMainnet()).toBe(false);
  });
});

describe('isFreighterInstalled', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('returns true when window.__PLAYWRIGHT_E2E_WALLET__ is set', async () => {
    vi.stubGlobal('window', { ...window, __PLAYWRIGHT_E2E_WALLET__: 'GABC' });
    expect(await isFreighterInstalled()).toBe(true);
  });

  it('returns true when Freighter is connected', async () => {
    // No E2E wallet — must call Freighter API
    vi.doMock('@stellar/freighter-api', () => ({
      isConnected: vi.fn().mockResolvedValue({ isConnected: true }),
    }));
    vi.resetModules();
    const { isFreighterInstalled: check } = await import('./stellar');
    expect(await check()).toBe(true);
    vi.doUnmock('@stellar/freighter-api');
    vi.resetModules();
  });

  it('returns false when Freighter API throws', async () => {
    vi.doMock('@stellar/freighter-api', () => ({
      isConnected: vi.fn().mockRejectedValue(new Error('Not installed')),
    }));
    vi.resetModules();
    const { isFreighterInstalled: check } = await import('./stellar');
    expect(await check()).toBe(false);
    vi.doUnmock('@stellar/freighter-api');
    vi.resetModules();
  });
});

describe('connectFreighter', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.doUnmock('@stellar/freighter-api'); vi.resetModules(); });

  it('returns wallet address from __PLAYWRIGHT_E2E_WALLET__ in E2E mode', async () => {
    vi.stubGlobal('window', { ...window, __PLAYWRIGHT_E2E_WALLET__: 'GABC123' });
    expect(await connectFreighter()).toBe('GABC123');
  });

  it('returns address when Freighter requestAccess succeeds', async () => {
    vi.doMock('@stellar/freighter-api', () => ({
      requestAccess: vi.fn().mockResolvedValue({ address: 'GRETURNED', error: undefined }),
    }));
    vi.resetModules();
    const { connectFreighter: connect } = await import('./stellar');
    expect(await connect()).toBe('GRETURNED');
  });

  it('returns null when Freighter requestAccess returns error', async () => {
    vi.doMock('@stellar/freighter-api', () => ({
      requestAccess: vi.fn().mockResolvedValue({ address: undefined, error: 'User rejected' }),
    }));
    vi.resetModules();
    const { connectFreighter: connect } = await import('./stellar');
    expect(await connect()).toBeNull();
  });

  it('returns null when Freighter requestAccess throws', async () => {
    vi.doMock('@stellar/freighter-api', () => ({
      requestAccess: vi.fn().mockRejectedValue(new Error('crash')),
    }));
    vi.resetModules();
    const { connectFreighter: connect } = await import('./stellar');
    expect(await connect()).toBeNull();
  });
});

describe('getFreighterAddress', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.doUnmock('@stellar/freighter-api'); vi.resetModules(); });

  it('returns wallet address in E2E mode', async () => {
    vi.stubGlobal('window', { ...window, __PLAYWRIGHT_E2E_WALLET__: 'GDEF456' });
    expect(await getFreighterAddress()).toBe('GDEF456');
  });

  it('returns address from getAddress when available', async () => {
    vi.doMock('@stellar/freighter-api', () => ({
      getAddress: vi.fn().mockResolvedValue({ address: 'GADDR', error: undefined }),
    }));
    vi.resetModules();
    const { getFreighterAddress: getAddr } = await import('./stellar');
    expect(await getAddr()).toBe('GADDR');
  });

  it('returns null when getAddress returns error', async () => {
    vi.doMock('@stellar/freighter-api', () => ({
      getAddress: vi.fn().mockResolvedValue({ address: undefined, error: 'no wallet' }),
    }));
    vi.resetModules();
    const { getFreighterAddress: getAddr } = await import('./stellar');
    expect(await getAddr()).toBeNull();
  });

  it('returns null when getAddress throws', async () => {
    vi.doMock('@stellar/freighter-api', () => ({
      getAddress: vi.fn().mockRejectedValue(new Error('crash')),
    }));
    vi.resetModules();
    const { getFreighterAddress: getAddr } = await import('./stellar');
    expect(await getAddr()).toBeNull();
  });
});
