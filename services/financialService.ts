
import { FinancialSnapshot, FinancialMetrics } from '../types.ts';

/**
 * World-Class Project Financial Utility (EVM Core)
 * Handles Earned Value, Actual Cost, and Planned Value logic.
 */
export const calculateFinancialMetrics = (snapshot: FinancialSnapshot, totalAward: number): FinancialMetrics => {
  const { projectedSpend, actualSpend, fundsReceived } = snapshot;

  // Standard EVM Definitions:
  // PV (Planned Value) = projectedSpend
  // AC (Actual Cost) = actualSpend
  // EV (Earned Value) = fundsReceived (Value of work physically completed/funded)

  // Variances
  const costVariance = fundsReceived - actualSpend; // Positive is good (Under budget)
  const scheduleVariance = fundsReceived - projectedSpend; // Positive is good (Ahead of schedule)
  
  // Performance Indices
  const cpi = actualSpend > 0 ? fundsReceived / actualSpend : 1;
  const spi = projectedSpend > 0 ? fundsReceived / projectedSpend : 1;

  const remainingBudget = totalAward - actualSpend;
  const burnRate = totalAward > 0 ? (actualSpend / totalAward) * 100 : 0;

  return {
    ...snapshot,
    burnRate,
    remainingBudget,
    variance: costVariance, // We use CV as the primary variance for the dashboard
  };
};

export const getFinancialHealth = (metrics: FinancialMetrics) => {
  if (metrics.variance < -10000) return 'danger';
  if (metrics.variance < 0) return 'warning';
  return 'success';
};

export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    maximumFractionDigits: 0 
  }).format(val);
};
