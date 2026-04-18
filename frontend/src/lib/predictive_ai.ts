export interface SettlementPrediction {
  recommendedDate: string;
  confidence: number; // 0-1
  reason: string;
  projectedLiquidity: number;
  tip: string;
}

/** Shape of an expense item actually consumed by the predictor (only `.amount` is read). */
interface PredictorExpense {
  amount: number | string;
}

/**
 * AI-driven logical analysis to predict the best time to settle debts.
 * In a production app, this would use a time-series model (e.g., Prophet or LSTM)
 * or a deep-learning agent like Gemini to analyze private banking data/history.
 */
export const predictBestSettlementTime = (
  expenses: PredictorExpense[],
  currentBalance: number,
  totalDebt: number
): SettlementPrediction => {
  // Logic: Analyze frequency and average size of expenses
  const recentExpenses = expenses.slice(-10);
  const avgExpense = recentExpenses.reduce((acc, e) => acc + (Number(e.amount) / 10_000_000), 0) / (recentExpenses.length || 1);
  
  // Simulation: We assume pay-day is upcoming or liquidity is high if balance > 3x debt
  const isHighLiquidity = currentBalance > totalDebt * 3;
  const dayOfMonth = new Date().getDate();
  const isEndOfMonth = dayOfMonth > 24;
  
  if (isHighLiquidity) {
    return {
      recommendedDate: 'Şimdi (Anında)',
      confidence: 0.95,
      reason: 'Yüksek likidite ve düşük borç oranı. Şu an ödemek en düşük fırsat maliyetini sunuyor.',
      projectedLiquidity: currentBalance - totalDebt,
      tip: 'Bakiyeniz borcunuzdan çok daha yüksek. Şimdi ödeyerek on-chain itibarınızı (Karma) %15 daha brızlı artırabilirsiniz.'
    };
  }

  if (isEndOfMonth) {
    return {
      recommendedDate: 'Gelecek Hafta (Ay Başı)',
      confidence: 0.82,
      reason: 'Ay sonu harcama yoğunluğu tespit edildi. Maaş/Gelir girişi sonrası ödeme önerilir.',
      projectedLiquidity: currentBalance + (avgExpense * 5), // Simulated incoming
      tip: 'Ay sonu nakit sıkışıklığı yaşamamak için 3-4 gün beklemeniz daha sağlıklı olabilir.'
    };
  }

  return {
    recommendedDate: '2 Gün İçinde',
    confidence: 0.75,
    reason: 'Dengeli harcama periyodu. Gelecek harcamalar öncesi masayı boşaltmak en iyisi.',
    projectedLiquidity: currentBalance - totalDebt,
    tip: 'Küçük taksitli ödemeler yerine tek seferde ödeyerek gas ücretlerinden tasarruf edebilirsiniz.'
  };
};

export const getAIPredictiveInsight = (userName: string, debt: number): string => {
  if (debt === 0) return `Harikasın ${userName}! Hiç borcun yok, tasarruf kasalarını incelemek ister misin?`;
  if (debt > 1000) return `Dikkat ${userName}, borcun yüksek seviyede. AI motorumuz en uygun ödeme planını senin için hazırlıyor.`;
  return `Borcun yönetilebilir seviyede. Ödeme zamanını optimize etmek için AI tahminlerimizi kullanabilirsin.`;
};
