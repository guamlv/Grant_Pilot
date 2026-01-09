/**
 * Project Financial Utility (EVM Core)
 * Handles Earned Value, Actual Cost, and Planned Value logic.
 */
export const calculateFinancialMetrics = (snapshot, totalAward) => {
  const { projected_spend, actual_spend, funds_received } = snapshot;

  // Standard EVM Definitions:
  // PV (Planned Value) = projected_spend
  // AC (Actual Cost) = actual_spend
  // EV (Earned Value) = funds_received

  const costVariance = funds_received - actual_spend;
  const scheduleVariance = funds_received - projected_spend;
  
  const cpi = actual_spend > 0 ? funds_received / actual_spend : 1;
  const spi = projected_spend > 0 ? funds_received / projected_spend : 1;

  const remainingBudget = totalAward - actual_spend;
  const burnRate = totalAward > 0 ? (actual_spend / totalAward) * 100 : 0;

  return {
    ...snapshot,
    burnRate,
    remainingBudget,
    variance: costVariance,
    cpi,
    spi
  };
};

export const getFinancialHealth = (metrics) => {
  if (metrics.variance < -10000) return 'danger';
  if (metrics.variance < 0) return 'warning';
  return 'success';
};

export const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    maximumFractionDigits: 0 
  }).format(val);
};
