import { type Expense } from './contract';

/**
 * Badge System — Gamifies the settlement experience by awarding achievements.
 */

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const BADGES: Badge[] = [
  {
    id: 'loyal_payer',
    name: 'Sadık Ödeyen',
    description: 'En az 5 harcama başlattınız.',
    icon: '💎',
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
  },
  {
    id: 'settle_master',
    name: 'Takas Ustası',
    description: 'Bir grubu tamamen resetlediniz.',
    icon: '⚡',
    color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
  },
  {
    id: 'frugal',
    name: 'Tutumlu',
    description: 'Ortalamadan %20 daha az harcadınız.',
    icon: '🌱',
    color: 'bg-green-500/10 text-green-500 border-green-500/20'
  },
  {
    id: 'big_spender',
    name: 'Bonkör',
    description: 'Tek sefere 500+ birim harcadınız.',
    icon: '🦁',
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/20'
  },
  {
    id: 'ai_explorer',
    name: 'AI Kaşifi',
    description: 'AI tarama özelliğini kullandınız.',
    icon: '🧠',
    color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
  }
];

export function calculateBadges(walletAddress: string, expenses: Expense[]): Badge[] {
  const userExpenses = expenses.filter(e => e.payer === walletAddress);
  const earned: Badge[] = [];

  // 1. Loyal Payer
  if (userExpenses.length >= 5) earned.push(BADGES.find(b => b.id === 'loyal_payer')!);

  // 2. Big Spender
  if (userExpenses.some(e => e.amount >= 500)) earned.push(BADGES.find(b => b.id === 'big_spender')!);

  // 3. Frugal (Simple check: spend less than average of active members)
  if (expenses.length > 0) {
    const total = expenses.reduce((acc, e) => acc + e.amount, 0);
    const userTotal = userExpenses.reduce((acc, e) => acc + e.amount, 0);
    const avg = total / 3; // Placeholder for member count if not strictly known here
    if (userTotal > 0 && userTotal < avg * 0.8) earned.push(BADGES.find(b => b.id === 'frugal')!);
  }

  // 4. AI Explorer (Checking if attachment_url exists as proxy for scanning)
  if (userExpenses.some(e => e.attachment_url)) {
    earned.push(BADGES.find(b => b.id === 'ai_explorer')!);
  }

  return earned;
}
