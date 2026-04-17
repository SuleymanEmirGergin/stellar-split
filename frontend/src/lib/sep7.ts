/**
 * SEP-0007: URI Scheme for Stellar
 * Enables deeplinking into Stellar wallets (LOBSTR, xBull, etc.)
 */

export const STELLAR_PROTOCOL = 'web+stellar:';

export interface PayParams {
  destination: string;
  amount?: string;
  memo?: string;
  memo_type?: 'MEMO_TEXT' | 'MEMO_ID' | 'MEMO_HASH' | 'MEMO_RETURN';
  msg?: string;
  network_passphrase?: string;
  origin_domain?: string;
}

export interface TxParams {
  xdr: string;
  callback?: string;
  pubkey?: string;
  msg?: string;
  network_passphrase?: string;
  origin_domain?: string;
}

/**
 * Generates a SEP-0007 'pay' URI
 */
export function generatePayURI(params: PayParams): string {
  const query = new URLSearchParams();
  query.append('destination', params.destination);
  if (params.amount) query.append('amount', params.amount);
  if (params.memo) query.append('memo', params.memo);
  if (params.memo_type) query.append('memo_type', params.memo_type);
  if (params.msg) query.append('msg', params.msg);
  if (params.network_passphrase) query.append('network_passphrase', params.network_passphrase);
  if (params.origin_domain) query.append('origin_domain', params.origin_domain);
  
  return `${STELLAR_PROTOCOL}pay?${query.toString()}`;
}

/**
 * Generates a SEP-0007 'tx' URI
 */
export function generateTxURI(params: TxParams): string {
  const query = new URLSearchParams();
  query.append('xdr', params.xdr);
  if (params.callback) query.append('callback', params.callback);
  if (params.pubkey) query.append('pubkey', params.pubkey);
  if (params.msg) query.append('msg', params.msg);
  if (params.network_passphrase) query.append('network_passphrase', params.network_passphrase);
  if (params.origin_domain) query.append('origin_domain', params.origin_domain);
  
  return `${STELLAR_PROTOCOL}tx?${query.toString()}`;
}

/**
 * Helper to open the URI (deeplink)
 */
export function openStellarDeeplink(uri: string) {
  if (typeof window !== 'undefined') {
    window.location.href = uri;
  }
}
