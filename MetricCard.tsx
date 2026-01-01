import React from 'react';
import { clsx } from 'clsx';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'success' | 'warning' | 'danger' | 'neutral';
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, subValue, status = 'neutral' }) => {
  const statusColor = {
    success: 'text-green-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
    neutral: 'text-slate-900'
  };

  const borderColor = {
    success: 'border-green-200',
    warning: 'border-amber-200',
    danger: 'border-red-200',
    neutral: 'border-slate-200'
  };

  return (
    <div className={clsx("bg-white p-5 rounded-xl border shadow-sm", borderColor[status])}>
      <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
      <h3 className={clsx("text-2xl font-bold", statusColor[status])}>{value}</h3>
      {subValue && <p className="text-xs text-slate-400 mt-2">{subValue}</p>}
    </div>
  );
};
