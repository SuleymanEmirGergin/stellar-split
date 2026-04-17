/**
 * Unified helpers for reading fields that differ between Soroban and backend
 * expense shapes, eliminating scattered `as unknown as` casts.
 *
 * Soroban shape: { payer: string; amount: number; ... }
 * Backend shape: { paidBy: { walletAddress: string }; status: string; createdAt: string; ... }
 */

interface WithPaidBy {
  paidBy?: { walletAddress?: string };
}

interface WithPayer {
  payer?: string;
}

/** Returns the payer wallet address for both Soroban and backend expense shapes. */
export function getExpensePayer(e: WithPayer & WithPaidBy): string {
  if ('paidBy' in e && e.paidBy?.walletAddress) return e.paidBy.walletAddress;
  return e.payer ?? '';
}

/** Returns the ISO createdAt string if present (backend only), otherwise undefined. */
export function getExpenseCreatedAt(e: object): string | undefined {
  return (e as Record<string, unknown>).createdAt as string | undefined;
}

/** Returns the status string if present (backend only), otherwise undefined. */
export function getExpenseStatus(e: object): string | undefined {
  return (e as Record<string, unknown>).status as string | undefined;
}
