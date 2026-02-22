/**
 * XLM/USD price from CoinGecko for "X XLM ≈ $Y" display.
 * Single source of truth: one request (price + 24h change), 5 min cache, 429 backoff.
 */
import { useState, useEffect } from 'react';

const COINGECKO_BASE = typeof import.meta !== 'undefined' && import.meta.env?.DEV
  ? '/api/coingecko'
  : 'https://api.coingecko.com';
const COINGECKO_URL = `${COINGECKO_BASE}/api/v3/simple/price?ids=stellar&vs_currencies=usd&include_24hr_change=true`;
const CACHE_MS = 5 * 60 * 1000;
const RATE_LIMIT_BACKOFF_MS = 2 * 60 * 1000;

let cached: { price: number; change: number | null; at: number } | null = null;
let rateLimitedUntil = 0;

export async function fetchXlmUsd(): Promise<number | null> {
  const data = await fetchXlmPriceAndChange();
  return data?.price ?? null;
}

/** Fetches price + 24h change; uses cache and respects 429. */
export async function fetchXlmPriceAndChange(): Promise<{ price: number; change: number | null } | null> {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_MS) {
    return { price: cached.price, change: cached.change };
  }
  if (now < rateLimitedUntil) {
    if (cached) return { price: cached.price, change: cached.change };
    return null;
  }
  try {
    const res = await fetch(COINGECKO_URL);
    if (res.status === 429) {
      rateLimitedUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
      if (cached) return { price: cached.price, change: cached.change };
      return null;
    }
    const data = (await res.json()) as { stellar?: { usd?: number; usd_24h_change?: number } };
    const price = data?.stellar?.usd;
    const change = data?.stellar?.usd_24h_change ?? null;
    if (typeof price === 'number' && price > 0) {
      cached = { price, change, at: Date.now() };
      return { price, change };
    }
  } catch {
    if (cached) return { price: cached.price, change: cached.change };
  }
  return null;
}

/** Format: "12.50 XLM ≈ $2.34" or just "12.50 XLM" if no price. */
export function formatXlmWithUsd(xlmAmount: number, usdPerXlm: number | null): string {
  const xlmStr = xlmAmount.toFixed(2);
  if (usdPerXlm == null || usdPerXlm <= 0) return `${xlmStr} XLM`;
  const usd = xlmAmount * usdPerXlm;
  const usdStr = usd >= 1 ? usd.toFixed(2) : usd.toFixed(4);
  return `${xlmStr} XLM ≈ $${usdStr}`;
}

/** Stroops to XLM, then format with optional USD. */
export function formatStroopsWithUsd(stroops: number, usdPerXlm: number | null): string {
  const xlm = stroops / 10_000_000;
  return formatXlmWithUsd(xlm, usdPerXlm);
}

/** Hook: XLM/USD price (null until loaded). Refreshes every 5 min. */
export function useXlmUsd(): number | null {
  const [price, setPrice] = useState<number | null>(cached?.price ?? null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchXlmPriceAndChange();
      if (!cancelled && data?.price != null) setPrice(data.price);
    })();
    const interval = setInterval(async () => {
      const data = await fetchXlmPriceAndChange();
      if (!cancelled && data?.price != null) setPrice(data.price);
    }, CACHE_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);
  return price;
}

/** Hook: price + 24h change for header. Same cache as useXlmUsd, one CoinGecko request. */
export function useXlmPriceWithChange(): { price: number | null; change: number | null } {
  const [price, setPrice] = useState<number | null>(cached?.price ?? null);
  const [change, setChange] = useState<number | null>(cached?.change ?? null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchXlmPriceAndChange();
      if (!cancelled && data) {
        setPrice(data.price);
        setChange(data.change);
      }
    })();
    const interval = setInterval(async () => {
      const data = await fetchXlmPriceAndChange();
      if (!cancelled && data) {
        setPrice(data.price);
        setChange(data.change);
      }
    }, CACHE_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);
  return { price, change };
}
