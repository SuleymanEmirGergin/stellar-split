/**
 * Debt Simplification — greedy minimum-transfers algorithm.
 *
 * Given a list of net balances (positive = owed money, negative = owes money),
 * produces the smallest practical set of transfers that clears all debts.
 *
 * Complexity: O(n log n).  Works optimally for n ≤ ~20 (typical group size).
 *
 * Example:
 *   balances: [A: +60, B: -40, C: -20]
 *   result:   [B → A: 40, C → A: 20]  (2 transfers instead of naive O(n²))
 */

export interface NetBalance {
  userId: string;
  /** Positive = this user is owed money; negative = this user owes money. */
  balance: number;
}

export interface Transfer {
  fromUserId: string;
  toUserId: string;
  /** Amount to transfer (always positive, rounded to 7 decimal places). */
  amount: number;
}

const EPSILON = 1e-7; // below this treat as zero (handles float drift)

export function simplifyDebts(balances: NetBalance[]): Transfer[] {
  // Clone & filter near-zero balances
  const creditors: NetBalance[] = [];
  const debtors: NetBalance[] = [];

  for (const b of balances) {
    if (b.balance > EPSILON) creditors.push({ ...b });
    else if (b.balance < -EPSILON) debtors.push({ ...b });
  }

  // Sort: largest creditor first, largest debtor (most negative) first
  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => a.balance - b.balance);

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = Math.min(creditor.balance, Math.abs(debtor.balance));

    transfers.push({
      fromUserId: debtor.userId,
      toUserId: creditor.userId,
      amount: roundToStroops(amount),
    });

    creditor.balance -= amount;
    debtor.balance += amount;

    if (Math.abs(creditor.balance) < EPSILON) ci++;
    if (Math.abs(debtor.balance) < EPSILON) di++;
  }

  return transfers;
}

/** Round to 7 decimal places (XLM uses 7-decimal stroops precision). */
function roundToStroops(n: number): number {
  return Math.round(n * 1e7) / 1e7;
}
