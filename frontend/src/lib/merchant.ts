import { StrKey } from '@stellar/stellar-sdk';

export interface MerchantQRData {
  merchantId: string;
  merchantName: string;
  amount: string;
  currency: string;
  category: string;
  timestamp: number;
}

/**
 * Encodes merchant data into a URL string for QR code generation.
 * Format: stellarsplit://merchant-pay?data=<base64_json>
 */
export function encodeMerchantQR(data: MerchantQRData): string {
  const json = JSON.stringify(data);
  const base64 = btoa(json);
  // Using a custom protocol or just a search param for JoinPage
  return `${window.location.origin}/join/merchant?data=${encodeURIComponent(base64)}`;
}

/**
 * Decodes merchant data from a QR URL.
 */
export function decodeMerchantQR(url: string): MerchantQRData | null {
  try {
    const searchParams = new URL(url).searchParams;
    const base64 = searchParams.get('data');
    if (!base64) return null;
    const json = atob(decodeURIComponent(base64));
    return JSON.parse(json) as MerchantQRData;
  } catch (err) {
    console.error("Failed to decode merchant QR:", err);
    return null;
  }
}

/**
 * Verifies if a merchant payment has been settled.
 * In a real app, this would query Soroban events or a backend.
 */
export async function verifyMerchantPayment(merchantId: string, timestamp: number): Promise<boolean> {
  console.log(`Verifying payment for merchant ${merchantId} at ${timestamp}`);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // For demo: 70% chance of being "settled" after 5 seconds if we check repeatedly
  // In the real implementation, this would look for a specific event hash linked to the merchant
  return Math.random() > 0.3;
}

export function isValidMerchantId(id: string): boolean {
  return StrKey.isValidEd25519PublicKey(id);
}
