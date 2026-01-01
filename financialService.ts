
import { FinancialSnapshot, FinancialMetrics } from '../types';

export const calculateFinancialMetrics = (snapshot: FinancialSnapshot, totalAward: number): FinancialMetrics => {
  const { projectedSpend, actualSpend, fundsReceived } = snapshot;

  const variance = projectedSpend - actualSpend; // Positive means under budget (good), Negative means over budget (bad)
  const remainingBudget = totalAward - actualSpend;
  
  // Burn rate calculation
  const burnRate = actualSpend; 

  return {
    ...snapshot,
    variance,
    remainingBudget,
    burnRate
  };
};

export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
};
