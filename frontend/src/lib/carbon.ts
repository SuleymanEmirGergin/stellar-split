/**
 * Carbon Footprint Calculator
 * Maps expense categories to approximate CO₂ emission factors.
 * Values are rough estimates in kg CO₂ per 10 USD spent.
 */

import type { Expense } from './contract';

// kg CO₂ per 10 USD equivalent spending in that category
const CO2_FACTORS: Record<string, number> = {
  food:          1.8,  // restaurant dining
  market:        1.2,  // grocery (lower than restaurant)
  transport:     4.5,  // fuel/flight-heavy
  accommodation: 3.2,  // hotel energy usage
  entertainment: 0.9,  // events/activities
  other:         1.5,  // mixed
};

const DEFAULT_FACTOR = 1.5;
const XLM_USD_FALLBACK = 0.12; // fallback if live price unavailable

export interface CarbonEntry {
  category: string;
  kgCO2: number;
  amountUsd: number;
}

export interface CarbonResult {
  totalKgCO2: number;
  byCategory: CarbonEntry[];
  byMember: { member: string; kgCO2: number }[];
  /** How many trees needed to offset for 1 year */
  treesNeeded: number;
  /** Equivalent km driven in a mid-size car */
  kmEquivalent: number;
}

function stroopsToUsd(stroops: number, xlmUsd: number): number {
  return (stroops / 10_000_000) * xlmUsd;
}

export function calcGroupCarbon(expenses: Expense[], xlmUsd = XLM_USD_FALLBACK): CarbonResult {
  const categoryMap: Record<string, { kgCO2: number; amountUsd: number }> = {};
  const memberMap: Record<string, number> = {};

  for (const exp of expenses) {
    const cat = exp.category || 'other';
    const factor = CO2_FACTORS[cat] ?? DEFAULT_FACTOR;
    const usd = stroopsToUsd(exp.amount, xlmUsd);
    // CO₂ = factor per 10 USD * (usd / 10)
    const kgCO2 = factor * (usd / 10);

    if (!categoryMap[cat]) categoryMap[cat] = { kgCO2: 0, amountUsd: 0 };
    categoryMap[cat].kgCO2 += kgCO2;
    categoryMap[cat].amountUsd += usd;

    // Per-member: attribute to payer proportionally
    if (!memberMap[exp.payer]) memberMap[exp.payer] = 0;
    memberMap[exp.payer] += kgCO2;
  }

  const totalKgCO2 = Object.values(categoryMap).reduce((s, v) => s + v.kgCO2, 0);

  const byCategory: CarbonEntry[] = Object.entries(categoryMap)
    .map(([category, v]) => ({ category, kgCO2: v.kgCO2, amountUsd: v.amountUsd }))
    .sort((a, b) => b.kgCO2 - a.kgCO2);

  const byMember = Object.entries(memberMap)
    .map(([member, kgCO2]) => ({ member, kgCO2 }))
    .sort((a, b) => b.kgCO2 - a.kgCO2);

  // 1 mature tree absorbs ~22 kg CO₂/year
  const treesNeeded = Math.ceil(totalKgCO2 / 22);
  // Average car emits ~0.12 kg CO₂/km
  const kmEquivalent = Math.round(totalKgCO2 / 0.12);

  return { totalKgCO2, byCategory, byMember, treesNeeded, kmEquivalent };
}

export function getCarbonLabel(category: string): string {
  const map: Record<string, string> = {
    food: '🍽️ Yemek',
    market: '🛒 Market',
    transport: '🚗 Ulaşım',
    accommodation: '🏨 Konaklama',
    entertainment: '🎭 Eğlence',
    other: '📦 Diğer',
  };
  return map[category] ?? category;
}
