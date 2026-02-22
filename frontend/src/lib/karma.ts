import { type Expense } from './contract';

export interface KarmaStats {
  score: number;
  level: string;
  color: string;
  icon: string;
}

/**
 * Calculates a 'Trust Score' (Karma) for a user based on their activity in the group.
 */
export function calculateKarma(userAddress: string, expenses: Expense[], isGuardian: boolean): KarmaStats {
  let score = 50; // Starting base score

  // 1. Activity: More expenses paid = Higher karma
  const paidCount = expenses.filter(e => e.payer === userAddress).length;
  score += paidCount * 5;

  // 2. Volume: Large payments indicate trust
  const totalPaid = expenses
    .filter(e => e.payer === userAddress)
    .reduce((sum, e) => sum + e.amount, 0);
  
  score += Math.floor(totalPaid / 100);

  // 3. Responsibility: Being a guardian is a huge trust signal
  if (isGuardian) {
    score += 30;
  }

  // 4. Caps
  if (score > 100) score = 100;
  if (score < 0) score = 0;

  // Determine Level
  if (score >= 90) return { score, level: 'Legend', color: 'text-indigo-400', icon: '🌌' };
  if (score >= 75) return { score, level: 'Diamond', color: 'text-blue-400', icon: '💎' };
  if (score >= 50) return { score, level: 'Active', color: 'text-emerald-400', icon: '⚡' };
  if (score >= 25) return { score, level: 'Member', color: 'text-slate-400', icon: '👤' };
  
  return { score, level: 'Newbie', color: 'text-rose-400', icon: '🥚' };
}
