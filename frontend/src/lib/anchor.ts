import { NETWORK_PASSPHRASE } from './stellar';

/** 
 * MoneyGram Access Configuration (Testnet)
 * Domain: extstellar.moneygram.com
 */
export const ANCHOR_DOMAIN = 'extstellar.moneygram.com';
export const ANCHOR_URL = `https://${ANCHOR_DOMAIN}`;
export const USDC_ASSET_CODE = 'USDC';
export const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'; // Testnet

export interface AnchorSession {
  token: string;
  expires: number;
}

/**
 * SEP-10 Authentication Flow
 */
export async function authenticateAnchor(userAddress: string, isDemo?: boolean): Promise<string> {
  if (isDemo) return "demo_jwt_token";
  // 1. Get Challenge from Anchor
  const challengeRes = await fetch(`${ANCHOR_URL}/auth?account=${userAddress}&client_domain=${window.location.hostname}`);
  const challengeData = await challengeRes.json();
  
  if (!challengeData.transaction) {
    throw new Error('Failed to get challenge from anchor');
  }

  // 2. Sign Challenge with Freighter
  const { signTransaction } = await import('@stellar/freighter-api');
  const signResult = await signTransaction(challengeData.transaction, {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  if (signResult.error) {
    throw new Error('User declined challenge signing');
  }

  // 3. Submit signed challenge to get JWT
  const tokenRes = await fetch(`${ANCHOR_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: signResult.signedTxXdr })
  });
  
  const tokenData = await tokenRes.json();
  if (!tokenData.token) {
    throw new Error('Failed to retrieve authentication token');
  }

  return tokenData.token;
}

/**
 * SEP-24 Initiate Withdrawal
 */
export async function initiateWithdrawal(token: string, amount: string, isDemo?: boolean) {
  if (isDemo) {
    return "https://stellar.org/moneygram-demo-withdraw"; // Mock interactive URL
  }
  const params = new URLSearchParams({
    asset_code: USDC_ASSET_CODE,
    amount: amount,
    kind: 'withdrawal'
  });

  const res = await fetch(`${ANCHOR_URL}/sep24/transactions/withdraw/interactive`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  const data = await res.json();
  if (data.type !== 'interactive_customer_info_needed') {
    throw new Error('Unexpected response from anchor: ' + (data.error || 'Unknown error'));
  }

  return data.url; // Interactive webview URL
}

/**
 * SEP-24 Initiate Deposit
 */
export async function initiateDeposit(token: string, amount: string, isDemo?: boolean) {
  if (isDemo) {
    return "https://stellar.org/moneygram-demo-deposit"; // Mock interactive URL
  }
  const params = new URLSearchParams({
    asset_code: USDC_ASSET_CODE,
    amount: amount,
    kind: 'deposit'
  });

  const res = await fetch(`${ANCHOR_URL}/sep24/transactions/deposit/interactive`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  const data = await res.json();
  if (data.type !== 'interactive_customer_info_needed') {
    throw new Error('Unexpected response from anchor: ' + (data.error || 'Unknown error'));
  }

  return data.url;
}

/**
 * Poll for Transaction Status
 */
export async function pollTransactionStatus(token: string, txId: string) {
  const res = await fetch(`${ANCHOR_URL}/sep24/transaction?id=${txId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await res.json();
}
