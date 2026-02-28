import * as StellarSdk from '@stellar/stellar-sdk';
import { rpc } from '@stellar/stellar-sdk';

// ── Environment-based configuration ──
const SOROBAN_RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = import.meta.env.VITE_NETWORK_PASSPHRASE || StellarSdk.Networks.TESTNET;
const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || 'GBEOHD44Y2ON4HEODWMAAIP2ZCCWG5E355OFYIMVNBUKPL6T3LII25H7';
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
