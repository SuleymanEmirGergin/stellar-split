/**
 * Fiat On-Ramp integration via Transak.
 *
 * Set VITE_TRANSAK_API_KEY in your .env to enable the live widget.
 * Without an API key, the guide/education fallback is shown.
 */

export interface TransakConfig {
  walletAddress: string;
  /** XLM or USDC */
  currency?: 'XLM' | 'USDC';
  /** Pre-fill amount in fiat */
  fiatAmount?: number;
  /** Fiat currency code e.g. "TRY", "EUR", "USD" */
  fiatCurrency?: string;
  /** 'staging' for testnet / sandbox, 'production' for mainnet */
  environment?: 'staging' | 'production';
}

const TRANSAK_WIDGET_BASE = 'https://global.transak.com';
const TRANSAK_STAGING_BASE = 'https://global-stg.transak.com';

/** Returns true if a Transak API key is configured */
export function hasTransakApiKey(): boolean {
  return !!(import.meta.env.VITE_TRANSAK_API_KEY as string | undefined);
}

/**
 * Opens the Transak widget in a popup window.
 * Falls back to Transak's direct URL if SDK is unavailable.
 */
export function openTransakWidget(config: TransakConfig): void {
  const apiKey = (import.meta.env.VITE_TRANSAK_API_KEY as string | undefined) ?? '';
  const env = config.environment ?? 'staging';
  const baseUrl = env === 'production' ? TRANSAK_WIDGET_BASE : TRANSAK_STAGING_BASE;

  const cryptoCurrency = config.currency === 'USDC' ? 'USDC' : 'XLM';
  const network = 'stellar';

  const params = new URLSearchParams({
    apiKey,
    network,
    cryptoCurrencyCode: cryptoCurrency,
    walletAddress: config.walletAddress,
    disableWalletAddressForm: 'true',
    ...(config.fiatAmount ? { defaultFiatAmount: String(config.fiatAmount) } : {}),
    ...(config.fiatCurrency ? { defaultFiatCurrency: config.fiatCurrency } : { defaultFiatCurrency: 'TRY' }),
    themeColor: '6366f1', // indigo-500
    colorMode: 'dark',
  });

  const url = `${baseUrl}?${params.toString()}`;

  // Try to open a centered popup
  const width = 450;
  const height = 700;
  const left = Math.max(0, (window.screen.width - width) / 2);
  const top = Math.max(0, (window.screen.height - height) / 2);

  const popup = window.open(
    url,
    'transak_widget',
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
  );

  // Fallback: open in new tab if popup was blocked
  if (!popup) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/** List of popular exchanges for the fallback guide */
export const EXCHANGE_LINKS = [
  { name: 'MoneyGram (XLM)', url: 'https://moneygram.com/mgo/us/en/m/crypto/stellar', flag: '🇺🇸' },
  { name: 'Binance', url: 'https://www.binance.com/en/trade/XLM_USDT', flag: '🌍' },
  { name: 'Coinbase', url: 'https://www.coinbase.com/price/stellar', flag: '🇺🇸' },
  { name: 'Kraken', url: 'https://www.kraken.com/prices/xlm-stellar-lumens-price-chart', flag: '🌍' },
  { name: 'BTCTurk (TR)', url: 'https://www.btcturk.com/trade/XLM_TRY', flag: '🇹🇷' },
  { name: 'Paribu (TR)', url: 'https://www.paribu.com/markets/xlm-tl', flag: '🇹🇷' },
] as const;
