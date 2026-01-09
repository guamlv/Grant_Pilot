import React, { useState, useEffect } from 'react';
import { getRisks, deleteRisk, getChecklist, updateChecklistItem, createChecklistItem, getTasks } from '@/services/api';
import { ShieldAlert, Plus, Trash2 } from 'lucide-react';

export const ComplianceSection = ({ grantId }) => {
  const [risks, setRisks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [checks, setChecks] = useState([]);
  const [newCheck, setNewCheck] = useState('');

  useEffect(() => {
    if (grantId) {
      getRisks(grantId).then(res => setRisks(res.data)).catch(() => {});
      getTasks(grantId).then(res => setTasks(res.data)).catch(() => {});
      getChecklist(grantId).then(res => setChecks(res.data)).catch(() => {});
    }
  }, [grantId]);

  const handleDeleteRisk = async (id) => {
    await deleteRisk(id);
    setRisks(risks.filter(r => r.id !== id));
  };

  const handleToggleCheck = async (item) => {
    await updateChecklistItem(item.id, !item.is_completed);
    setChecks(checks.map(c => c.id === item.id ? { ...c, is_completed: !c.is_completed } : c));
  };

  const handleAddCheck = async () => {
    if (!newCheck.trim()) return;
    const res = await createChecklistItem({ grant_id: grantId, text: newCheck, is_completed: false });
    setChecks([...checks, res.data]);
    setNewCheck('');
  };

  return (
    <div className="grid lg:grid-cols-2 gap-16" data-testid="compliance-section">
        <div className="space-y-10">
             <div className="flex justify-between items-center px-4">
                <div>
                  <h3 className="text-2xl font-black text-black tracking-tight flex items-center gap-3"><ShieldAlert className="text-black" size={28}/> Risk Register</h3>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Hazard Mitigation</p>
                </div>
             </div>
             <div className="space-y-6">
               {risks.length === 0 ? (
                 <div className="p-8 bg-white border border-zinc-200 rounded-[2.5rem] text-center text-zinc-400 font-bold">
                   No risks identified. Upload documents to scan for risks.
                 </div>
               ) : risks.map(r => (
                 <div key={r.id} className="p-8 bg-white border border-zinc-200 rounded-[2.5rem] flex justify-between items-start shadow-sm hover:shadow-2xl transition-all duration-500">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full ${r.level === 'High' || r.level === 'Critical' ? 'bg-rose-500' : r.level === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                        <h4 className="font-black text-black text-lg">{r.summary}</h4>
                      </div>
                      <p className="text-sm font-medium text-zinc-600 mt-3 leading-relaxed">{r.mitigation_plan}</p>
                    </div>
                    <button onClick={() => handleDeleteRisk(r.id)} className="text-zinc-300 hover:text-rose-500 p-2 transition-colors"><Trash2 size={22}/></button>
                 </div>
               ))}
             </div>
        </div>
        <div className="space-y-12">
             <div className="bg-black border border-zinc-800 rounded-[3rem] p-12 shadow-2xl text-white">
                <div className="flex justify-between items-center mb-10">
                  <h3 className="text-2xl font-black tracking-tight">System Checks</h3>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newCheck} 
                      onChange={(e) => setNewCheck(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCheck()}
                      placeholder="Add check..."
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                    />
                    <button onClick={handleAddCheck} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors">
                      <Plus size={16}/>
                    </button>
                  </div>
                </div>
                <div className="space-y-5">
                    {checks.length === 0 ? (
                      <p className="text-zinc-600 text-center py-8">No checklist items yet</p>
                    ) : checks.map(c => (
                      <div key={c.id} className="group flex gap-5 items-center p-4 rounded-3xl hover:bg-white/5 transition-all">
                        <input 
                          type="checkbox" 
                          className="w-6 h-6 rounded-lg border-zinc-800 bg-zinc-900 text-white accent-white" 
                          checked={c.is_completed} 
                          onChange={() => handleToggleCheck(c)} 
                        />
                        <span className={`flex-1 text-base font-bold transition-all ${c.is_completed ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>{c.text}</span>
                      </div>
                    ))}
                </div>
             </div>
        </div>
    </div>
  );
};
