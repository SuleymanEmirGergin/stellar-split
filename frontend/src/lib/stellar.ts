import * as StellarSdk from '@stellar/stellar-sdk';
import { rpc } from '@stellar/stellar-sdk';

// ── Environment-based configuration ──
const SOROBAN_RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = import.meta.env.VITE_NETWORK_PASSPHRASE || StellarSdk.Networks.TESTNET;
// Fallback points at the B2-hardened testnet contract deployed
// 2026-04-24 (includes emergency pause + wasm-opt profile).
// Override in deployment environments via VITE_CONTRACT_ID.
// Redeploys should bump this and keep the prior address pinned in
// docs/DEPLOYMENT.md for audit trail. See docs/MULTI_CURRENCY.md.
//
// Prior deploys:
//   - 2026-04-24 (pre-B2): CAH5AFV3ESN563TBT3OSL32SPMSWLP5W2FJZLOHGQXG4IUG63LMFQOBF
const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || 'CAUKBMO5OAWHDDWAR3WHDYBJSJDTQUAD53L3JDD53DFIYTAVPW3DDAOA';
const HORIZON_URL = import.meta.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org';

const server = new rpc.Server(SOROBAN_RPC_URL);

/** XLM native token (SAC) contract id for the current network. Used for settle_group. */
export function getNativeTokenContractId(): string {
  return StellarSdk.Asset.native().contractId(NETWORK_PASSPHRASE);
}

/** USDC (or other token) contract id when settling in non-XLM. Set via VITE_USDC_CONTRACT_ID. */
export const USDC_CONTRACT_ID = import.meta.env.VITE_USDC_CONTRACT_ID || '';

export { server, NETWORK_PASSPHRASE, CONTRACT_ID, HORIZON_URL };

// ── Freighter wallet helpers ──
// E2E: Playwright sets window.__PLAYWRIGHT_E2E_WALLET__ and stellarsplit_demo_mode so tests run without Freighter.
declare global {
  interface Window {
    __PLAYWRIGHT_E2E_WALLET__?: string;
  }
}

export async function isFreighterInstalled(): Promise<boolean> {
  if (typeof window !== 'undefined' && window.__PLAYWRIGHT_E2E_WALLET__) return true;
  try {
    const { isConnected } = await import('@stellar/freighter-api');
    const result = await isConnected();
    return result.isConnected;
  } catch {
    return false;
  }
}

export async function connectFreighter(): Promise<string | null> {
  if (typeof window !== 'undefined' && window.__PLAYWRIGHT_E2E_WALLET__) return window.__PLAYWRIGHT_E2E_WALLET__;
  try {
    const { requestAccess } = await import('@stellar/freighter-api');
    const result = await requestAccess();
    if (result.error) {
      console.error('Freighter error:', result.error);
      return null;
    }
    return result.address;
  } catch (err) {
    console.error('Freighter connection error:', err);
    return null;
  }
}

export async function getFreighterAddress(): Promise<string | null> {
  if (typeof window !== 'undefined' && window.__PLAYWRIGHT_E2E_WALLET__) return window.__PLAYWRIGHT_E2E_WALLET__;
  try {
    const { getAddress } = await import('@stellar/freighter-api');
    const result = await getAddress();
    if (result.error) return null;
    return result.address;
  } catch {
    return null;
  }
}

// ── Utilities ──

export function truncateAddress(address: string): string {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export function formatAmount(stroops: number): string {
  const xlm = stroops / 10_000_000;
  return xlm.toFixed(7).replace(/\.?0+$/, '');
}

export function formatXLM(stroops: number): string {
  const xlm = stroops / 10_000_000;
  return `${xlm.toFixed(2)} XLM`;
}

/** Explorer URL for a transaction hash (testnet vs mainnet from NETWORK_PASSPHRASE). */
export function getExplorerTxUrl(hash: string): string {
  if (!hash || typeof hash !== 'string') return '#';
  const base = 'https://stellar.expert/explorer';
  const network = NETWORK_PASSPHRASE === StellarSdk.Networks.TESTNET ? 'testnet' : 'public';
  return `${base}/${network}/tx/${encodeURIComponent(hash)}`;
}

/** Whether current network is testnet. */
export function isTestnet(): boolean {
  return NETWORK_PASSPHRASE === StellarSdk.Networks.TESTNET;
}

/** Whether current network is mainnet. */
export function isMainnet(): boolean {
  return NETWORK_PASSPHRASE === StellarSdk.Networks.PUBLIC;
}

// ─────────────────────────────────────────────────────────────────────────
// USDC trustline helpers — pre-flight UX for multi-currency settle
// ─────────────────────────────────────────────────────────────────────────
//
// When settle_group_flex routes through Soroswap and delivers USDC to the
// creditor, the creditor's Stellar classic account MUST have a USDC trustline
// — otherwise the pair's internal transfer fails with
// "trustline entry is missing for account". This is a one-time setup per
// recipient; we expose helpers so SettleTab can surface + offer the fix
// before the settle tx runs.

/**
 * USDC testnet asset definition. Issuer is read from the SAC contract's
 * `name()` method (returns "USDC:<issuer>"). Hard-coded here as the default
 * testnet issuer; override via VITE_USDC_ASSET_ISSUER if your deployment
 * talks to a different USDC SAC.
 */
export const USDC_ASSET_ISSUER: string =
  (import.meta.env.VITE_USDC_ASSET_ISSUER as string | undefined) ??
  'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
export const USDC_ASSET_CODE = 'USDC';

/** The classic Asset object for USDC (used to build trustline / balance queries). */
export function usdcAsset(): StellarSdk.Asset {
  return new StellarSdk.Asset(USDC_ASSET_CODE, USDC_ASSET_ISSUER);
}

/**
 * Checks whether `address` has an active USDC trustline on Horizon.
 * Returns `true` if the trustline exists (limit > 0), `false` if missing,
 * and `null` if the account was not found or Horizon errored — the caller
 * should treat `null` as "unknown, don't block the user".
 */
export async function hasUsdcTrustline(address: string): Promise<boolean | null> {
  if (typeof window !== 'undefined' && window.__PLAYWRIGHT_E2E_WALLET__) return true;
  if (!address) return null;
  try {
    const res = await fetch(`${HORIZON_URL}/accounts/${address}`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      balances?: Array<{
        asset_type?: string;
        asset_code?: string;
        asset_issuer?: string;
        limit?: string;
      }>;
    };
    const match = data.balances?.find(
      (b) =>
        b.asset_type !== 'native' &&
        b.asset_code === USDC_ASSET_CODE &&
        b.asset_issuer === USDC_ASSET_ISSUER,
    );
    if (!match) return false;
    const limit = parseFloat(match.limit ?? '0');
    return Number.isFinite(limit) && limit > 0;
  } catch {
    return null;
  }
}

/**
 * Builds + signs (via Freighter) + submits a `changeTrust` tx that adds a
 * USDC trustline to `address`. Throws on failure with a friendly message.
 * Returns the tx hash on success.
 *
 * Uses Horizon (not Soroban RPC) because `changeTrust` is a Stellar classic
 * operation — Soroban RPC does not accept classic ops directly.
 */
export async function addUsdcTrustline(address: string): Promise<string> {
  if (!address) throw new Error('No wallet address provided');

  // 1. Load the account from Horizon to get the current sequence number.
  const accountRes = await fetch(`${HORIZON_URL}/accounts/${address}`);
  if (!accountRes.ok) {
    throw new Error(
      accountRes.status === 404
        ? 'Stellar account not found on testnet — fund it first via the friendbot.'
        : `Failed to load account from Horizon (${accountRes.status}).`,
    );
  }
  const accountData = (await accountRes.json()) as { sequence: string };
  const account = new StellarSdk.Account(address, accountData.sequence);

  // 2. Build a classic tx with a single changeTrust op (default limit = max).
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(StellarSdk.Operation.changeTrust({ asset: usdcAsset() }))
    .setTimeout(180)
    .build();

  // 3. Have Freighter sign it.
  const { signTransaction } = await import('@stellar/freighter-api');
  const signed = await signTransaction(tx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
    address,
  });
  if (signed.error || !signed.signedTxXdr) {
    throw new Error(
      typeof signed.error === 'string'
        ? signed.error
        : 'Freighter declined to sign the trustline transaction.',
    );
  }

  // 4. Submit to Horizon. Horizon responds with the tx hash on success.
  const submitRes = await fetch(`${HORIZON_URL}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ tx: signed.signedTxXdr }).toString(),
  });
  const submitData = (await submitRes.json()) as {
    hash?: string;
    detail?: string;
    extras?: { result_codes?: unknown };
  };
  if (!submitRes.ok || !submitData.hash) {
    const detail = submitData.detail ?? 'Unknown Horizon error';
    throw new Error(`Trustline submit failed: ${detail}`);
  }
  return submitData.hash;
}
