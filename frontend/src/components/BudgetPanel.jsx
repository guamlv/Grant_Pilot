import React, { useState, useEffect } from 'react';
import { getBudgetItems, createBudgetItem, deleteBudgetItem, budgetForecast } from '@/services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Plus, Trash2, Calculator, Sparkles, TrendingUp, Loader2 } from 'lucide-react';

export const BudgetPanel = ({ grant, financialHistory }) => {
  const [items, setItems] = useState([]);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ category: '', allocated: 0, spent: 0, notes: '' });
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (grant?.id) {
      getBudgetItems(grant.id).then(res => setItems(res.data)).catch(() => {});
    }
  }, [grant?.id]);

  const save = async (e) => {
    e.preventDefault();
    const res = await createBudgetItem({ grant_id: grant.id, ...newItem });
    setItems([...items, res.data]);
    setNewItem({ category: '', allocated: 0, spent: 0, notes: '' });
    setAdding(false);
  };

  const handleDelete = async (id) => {
    await deleteBudgetItem(id);
    setItems(items.filter(i => i.id !== id));
  };

  const runForecast = async () => {
    setLoading(true);
    try {
      const currentSpend = items.reduce((a, b) => a + b.spent, 0);
      const budgetStr = items.map(i => `${i.category}: $${i.allocated} allocated, $${i.spent} spent`).join('; ');
      const res = await budgetForecast({
        grant_title: grant.title,
        total_award: grant.award_amount,
        current_spend: currentSpend,
        budget_items: budgetStr
      });
      setForecast(res.data);
    } finally {
      setLoading(false);
    }
  };

  const total = items?.reduce((a, b) => a + b.allocated, 0) || 0;
  const COLORS = ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8'];

  return (
     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="budget-panel">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <h3 className="font-bold mb-6 text-slate-900">Allocation Breakdown</h3>
           <div className="h-64">
              <ResponsiveContainer>
                 <PieChart>
                    <Pie data={items} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="allocated" nameKey="category">
                      {items?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Legend />
                 </PieChart>
              </ResponsiveContainer>
           </div>
           <div className="grid grid-cols-2 gap-4 text-center mt-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                 <div className="text-xs text-slate-500 font-medium uppercase mb-1">Total Allocated</div>
                 <div className="font-bold text-slate-900 text-lg">${total.toLocaleString()}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                 <div className="text-xs text-slate-500 font-medium uppercase mb-1">Unallocated</div>
                 <div className="font-bold text-slate-900 text-lg">${(grant.award_amount - total).toLocaleString()}</div>
              </div>
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900">Budget Categories</h3>
                  <button onClick={() => setAdding(true)} className="text-black hover:bg-zinc-100 p-2 rounded-lg transition-colors" data-testid="add-budget-btn"><Plus size={20}/></button>
              </div>
              
              {adding && (
                 <form onSubmit={save} className="p-4 bg-zinc-50/50 space-y-3 border-b border-zinc-100">
                    <input className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black bg-white" placeholder="Category Name" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} />
                    <div className="flex gap-3">
                       <input type="number" className="w-1/2 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black bg-white" placeholder="Allocated ($)" value={newItem.allocated || ''} onChange={e => setNewItem({...newItem, allocated: +e.target.value})} />
                       <input type="number" className="w-1/2 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black bg-white" placeholder="Spent ($)" value={newItem.spent || ''} onChange={e => setNewItem({...newItem, spent: +e.target.value})} />
                    </div>
                    <div className="flex justify-end gap-2">
                       <button type="button" onClick={() => setAdding(false)} className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-200/50">Cancel</button>
                       <button type="submit" className="text-xs bg-black text-white px-3 py-1.5 rounded-lg hover:bg-zinc-800 font-medium">Add Item</button>
                    </div>
                 </form>
              )}

              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                 {items?.map(item => (
                    <div key={item.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                       <div>
                          <div className="font-bold text-slate-900 text-sm">{item.category}</div>
                          <div className="text-xs text-slate-400 mt-0.5">Spent: ${item.spent.toLocaleString()} / ${item.allocated.toLocaleString()}</div>
                       </div>
                       <div className="flex items-center gap-4">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                             <div className={`h-full rounded-full ${item.spent > item.allocated ? 'bg-red-500' : 'bg-emerald-500'}`} style={{width: `${Math.min((item.spent/item.allocated)*100, 100)}%`}}></div>
                          </div>
                          <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={16}/></button>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           <div className="bg-black rounded-xl p-6 text-white shadow-lg ring-1 ring-white/10">
              <div className="flex justify-between items-start mb-4">
                 <div>
                    <h3 className="font-bold flex items-center gap-2 text-white"><Calculator size={18} className="text-zinc-400"/> AI Forecast</h3>
                    <p className="text-xs text-zinc-500 mt-1">Predict final spend based on burn rate.</p>
                 </div>
                 {!forecast && (
                    <button onClick={runForecast} disabled={loading} className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg flex gap-2 transition-colors" data-testid="forecast-btn">
                       {loading ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14} className="text-amber-400"/>} Forecast
                    </button>
                 )}
              </div>
              
              {forecast && (
                 <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                       <div className={`p-2 rounded-lg ${forecast.status === 'Over Budget' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                          <TrendingUp size={20} />
                       </div>
                       <div>
                          <div className="text-xs text-slate-400 uppercase font-bold">Estimated Final</div>
                          <div className="text-xl font-bold text-white">${(forecast.estimatedFinalSpend || 0).toLocaleString()}</div>
                       </div>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed border-t border-white/10 pt-3">{forecast.analysis}</p>
                    {forecast.recommendations?.length > 0 && (
                       <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                          <div className="text-xs font-bold text-amber-400 mb-2 uppercase">Recommendations</div>
                          <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">
                             {forecast.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                       </div>
                    )}
                 </div>
              )}
           </div>
        </div>
     </div>
  );
};
