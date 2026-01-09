
import React from 'react';
import { useStore } from '../../hooks/useStore.ts';
import { api } from '../../services/api.ts';
import { ShieldAlert, Plus, Trash2, FileText } from 'lucide-react';

export const ComplianceSection: React.FC<{ grantId: number }> = ({ grantId }) => {
  const risks = useStore(() => api.risks.list(r => r.grantId === grantId), [grantId], 'risks');
  const tasks = useStore(() => api.tasks.list(t => t.grantId === grantId), [grantId], 'tasks');
  const checks = useStore(() => api.checklistItems.list(c => c.grantId === grantId), [grantId], 'checklistItems');

  return (
    <div className="grid lg:grid-cols-2 gap-16">
        <div className="space-y-10">
             <div className="flex justify-between items-center px-4">
                <div>
                  <h3 className="text-2xl font-black text-black tracking-tight flex items-center gap-3"><ShieldAlert className="text-black" size={28}/> Risk Register</h3>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Hazard Mitigation</p>
                </div>
             </div>
             <div className="space-y-6">
               {risks?.map(r => (
                 <div key={r.id} className="p-8 bg-white border border-zinc-200 rounded-[2.5rem] flex justify-between items-start shadow-sm hover:shadow-2xl transition-all duration-500">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${r.level === 'High' || r.level === 'Critical' ? 'bg-rose-500' : 'bg-amber-500'}`}></span>
                        <h4 className="font-black text-black text-lg">{r.summary}</h4>
                      </div>
                      <p className="text-sm font-medium text-zinc-600 mt-3 leading-relaxed">{r.mitigationPlan}</p>
                    </div>
                    <button onClick={() => api.risks.delete(r.id!)} className="text-zinc-300 hover:text-rose-500 p-2 transition-colors"><Trash2 size={22}/></button>
                 </div>
               ))}
             </div>
        </div>
        <div className="space-y-12">
             <div className="bg-black border border-zinc-800 rounded-[3rem] p-12 shadow-2xl text-white">
                <h3 className="text-2xl font-black mb-10 tracking-tight">System Checks</h3>
                <div className="space-y-5">
                    {checks?.map(c => (
                      <div key={c.id} className="group flex gap-5 items-center p-4 rounded-3xl hover:bg-white/5 transition-all">
                        <input type="checkbox" className="w-6 h-6 rounded-lg border-zinc-800 bg-zinc-900 text-white" checked={c.isCompleted} onChange={() => api.checklistItems.update(c.id!, {isCompleted:!c.isCompleted})} />
                        <span className={`flex-1 text-base font-bold transition-all ${c.isCompleted ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>{c.text}</span>
                      </div>
                    ))}
                </div>
             </div>
        </div>
    </div>
  );
};
