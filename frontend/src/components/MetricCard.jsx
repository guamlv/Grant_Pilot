import React from 'react';
import clsx from 'clsx';

export const MetricCard = ({ 
  label, 
  value, 
  subValue, 
  variant = 'light',
  status = 'neutral' 
}) => {
  const statusColor = {
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    danger: 'text-rose-500',
    neutral: variant === 'dark' ? 'text-white' : 'text-black'
  };

  return (
    <div className={clsx(
      "p-6 rounded-[2rem] border transition-all duration-300",
      variant === 'dark' 
        ? "bg-black border-zinc-800 shadow-2xl" 
        : "bg-white border-zinc-200 shadow-sm hover:shadow-md"
    )}>
      <p className={clsx(
        "text-[10px] font-black uppercase tracking-widest mb-2",
        variant === 'dark' ? "text-zinc-500" : "text-zinc-400"
      )}>{label}</p>
      <h3 className={clsx("text-3xl font-black tracking-tight", statusColor[status])}>
        {value}
      </h3>
      {subValue && (
        <p className={clsx(
          "text-xs mt-3 font-medium",
          variant === 'dark' ? "text-zinc-400" : "text-zinc-500"
        )}>{subValue}</p>
      )}
    </div>
  );
};
