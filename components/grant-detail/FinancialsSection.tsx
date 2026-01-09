
import React, { useMemo } from 'react';
import { useStore } from '../../hooks/useStore.ts';
import { api } from '../../services/api.ts';
import { calculateFinancialMetrics, formatCurrency } from '../../services/financialService.ts';
import { MetricCard } from '../MetricCard.tsx';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Grant } from '../../types.ts';
import { TrendingUp, Activity, ArrowUpRight } from 'lucide-react';

export const FinancialsSection: React.FC<{ grant: Grant }> = ({ grant }) => {
  const rawFin = useStore(() => api.financials.list(f => f.grantId === grant.id), [grant.id], 'financials');
  
  const fins = useMemo(() => {
    if (!rawFin) return [];
    return rawFin
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(s => calculateFinancialMetrics(s, grant.awardAmount));
  }, [grant, rawFin]);

  const lastFin = fins[fins.length - 1];

  // Custom Tooltip for high contrast
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black text-white p-6 rounded-[2rem] shadow-2xl border border-zinc-800 animate-in zoom-in-95 duration-200">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">{label}</p>
          <div className="space-y-2">
            <div className="flex justify-between gap-8 items-center">
              <span className="text-xs font-bold text-zinc-400">Actual Spend</span>
              <span className="text-sm font-black text-white">{formatCurrency(payload[0].value)}</span>
            </div>
            <div className="flex justify-between gap-8 items-center">
              <span className="text-xs font-bold text-zinc-400">Projection</span>
              <span className="text-sm font-black text-zinc-400">{formatCurrency(payload[1].value)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid lg:grid-cols-4 gap-12">
      <div className="lg:col-span-3 bg-white rounded-[3.5rem] border border-zinc-200 shadow-2xl shadow-zinc-200/50 overflow-hidden flex flex-col">
          <div className="px-12 pt-12 pb-6 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                   <div className="p-2 bg-black rounded-xl text-white"><TrendingUp size={20}/></div>
                   <h3 className="text-2xl font-black text-black tracking-tight">Financial Velocity</h3>
                </div>
                <p className="text-sm font-medium text-zinc-500">Comparing actual expenditure against strategic projections.</p>
              </div>
              {lastFin && (
                <div className="text-right">
                   <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Burn Velocity</div>
                   <div className="flex items-center gap-2 font-black text-2xl text-black">
                     {lastFin.burnRate.toFixed(1)}% <ArrowUpRight size={20} className="text-zinc-300"/>
                   </div>
                </div>
              )}
          </div>

          <div className="flex-1 px-8 pb-8">
            <div className="h-[450px] w-full bg-zinc-50 rounded-[2.5rem] p-8 border border-zinc-100 relative">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fins} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#000000" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#000000" stopOpacity={0.01}/>
                    </linearGradient>
                    <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#71717a" stopOpacity={0.05}/>
                      <stop offset="95%" stopColor="#71717a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#a1a1aa" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                    tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis 
                    stroke="#a1a1aa" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(v) => `$${v/1000}k`} 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="actualSpend" 
                    stroke="#000000" 
                    fillOpacity={1} 
                    fill="url(#colorActual)" 
                    strokeWidth={4} 
                    name="Actual Spent" 
                    activeDot={{ r: 8, fill: '#000', stroke: '#fff', strokeWidth: 4 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="projectedSpend" 
                    stroke="#d1d5db" 
                    strokeDasharray="8 8" 
                    fill="url(#colorProjected)" 
                    name="Projection" 
                    strokeWidth={2} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
      </div>
      <div className="space-y-8">
          <MetricCard label="Remaining Liquidity" value={lastFin ? formatCurrency(lastFin.remainingBudget) : 'N/A'} variant="dark" />
          <MetricCard label="Current Variance" value={lastFin ? formatCurrency(lastFin.variance) : 'N/A'} status={lastFin?.variance < 0 ? 'danger' : 'success'} subValue={lastFin?.variance < 0 ? 'Exceeding projected budget' : 'Under projected budget'} />
          <div className="p-8 bg-zinc-100 rounded-[2.5rem] border border-zinc-200">
             <div className="flex items-center gap-3 mb-4">
               <Activity size={18} className="text-black"/>
               <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Status Brief</h4>
             </div>
             <p className="text-sm font-bold text-black leading-relaxed">
               Current spend is {lastFin && lastFin.variance < 0 ? 'exceeding' : 'tracking within'} defined thresholds. 
               The portfolio efficiency score remains nominal at {lastFin ? (100 - lastFin.burnRate).toFixed(0) : '0'}%.
             </p>
          </div>
      </div>
    </div>
  );
};
