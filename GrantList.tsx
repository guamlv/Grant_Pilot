
import React, { useState, useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import { api } from '../services/api';
import { Plus, Sparkles, TrendingUp, Compass, ChevronDown, ChevronUp, Search, Filter, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { generatePortfolioAnalysis, generateGrantRecommendations } from '../services/geminiService';
import { Modal } from '../components/Modal';

export const GrantList: React.FC = () => {
  const grants = useStore(() => api.grants.list()) || [];
  const settingsList = useStore(() => api.settings.list());
  const settings = settingsList?.[0];

  const [modal, setModal] = useState<{ type: 'new' | 'task' | 'disc'; id?: number }>({ type: 'new' });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [recs, setRecs] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  
  // New Grant Form State
  const [newG, setNewG] = useState<any>({ title: '', status: 'Prospect', awardAmount: 0 });
  const [newTask, setNewTask] = useState({ description: '', dueDate: '' });

  const filtered = useMemo(() => grants.filter(g => 
    (g.title.toLowerCase().includes(search.toLowerCase()) || g.funder.toLowerCase().includes(search.toLowerCase())) &&
    (filter === 'All' || g.status === filter)
  ), [grants, search, filter]);

  const saveGrant = async () => {
    if (newG.title) {
        await api.grants.add({ ...newG, startDate: newG.startDate || new Date().toISOString().split('T')[0], description: newG.description || '', funder: newG.funder || 'Unknown', probability: 50 });
        setIsOpen(false); setNewG({ title: '', status: 'Prospect', awardAmount: 0 });
    }
  };

  const saveTask = async () => {
      if (modal.id && newTask.description) {
          await api.tasks.add({ grantId: modal.id, ...newTask, isCompleted: false });
          setIsOpen(false);
      }
  };

  const runAnalysis = async () => {
      setLoading(true);
      try {
          const a = await generatePortfolioAnalysis(grants);
          setAnalysis(a);
      } finally { setLoading(false); }
  };

  const runDiscovery = async () => {
      setLoading(true);
      try {
          const r = await generateGrantRecommendations(grants, settings || null);
          setRecs(r);
          setModal({ type: 'disc' }); setIsOpen(true);
      } finally { setLoading(false); }
  };

  const toggleExpand = (id: number) => {
      const next = new Set(expanded);
      if (next.has(id)) next.delete(id); else next.add(id);
      setExpanded(next);
  };

  return (
    <div className="space-y-6 pb-20">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
               <h1 className="text-2xl font-bold text-slate-900">Grant Projects</h1>
               <p className="text-slate-500 text-sm">Manage your funding pipeline.</p>
           </div>
           <div className="flex gap-2">
               <button onClick={runAnalysis} disabled={loading} className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
                   {loading && !analysis ? <Loader2 className="animate-spin" size={16}/> : <TrendingUp size={16} className="text-indigo-600"/>} Portfolio AI
               </button>
               <button onClick={runDiscovery} disabled={loading} className="px-3 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 flex items-center gap-2">
                   {loading && !recs ? <Loader2 className="animate-spin" size={16}/> : <Compass size={16}/>} Discover
               </button>
               <button onClick={() => { setModal({type:'new'}); setIsOpen(true); }} className="px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 flex items-center gap-2">
                   <Plus size={16}/> New Project
               </button>
           </div>
       </div>

       {analysis && (
           <div className="bg-indigo-900 text-indigo-50 p-6 rounded-xl animate-in slide-in-from-top-4">
               <div className="flex justify-between items-start mb-4">
                   <h3 className="font-bold text-white flex gap-2 items-center"><Sparkles className="text-amber-400" size={18}/> Strategic Analysis</h3>
                   <button onClick={() => setAnalysis(null)} className="text-indigo-300 hover:text-white">Close</button>
               </div>
               <div className="grid md:grid-cols-2 gap-8">
                   <div>
                       <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-300 mb-2">Key Trends</h4>
                       <ul className="list-disc pl-4 space-y-1 text-sm">{analysis.trends.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>
                   </div>
                   <div>
                       <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-300 mb-2">Recommended Strategy</h4>
                       <ul className="list-disc pl-4 space-y-1 text-sm">{analysis.strategy.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                   </div>
               </div>
           </div>
       )}

       <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
           <div className="p-4 border-b border-slate-200 flex gap-4 bg-slate-50">
               <div className="relative flex-1">
                   <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                   <input className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Search grants..." value={search} onChange={e => setSearch(e.target.value)} />
               </div>
               <div className="relative">
                   <Filter className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                   <select className="pl-10 pr-8 py-2 rounded-lg border border-slate-200 appearance-none bg-white focus:outline-none" value={filter} onChange={e => setFilter(e.target.value)}>
                       {['All', 'Prospect', 'Drafting', 'Submitted', 'Awarded'].map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
               </div>
           </div>
           
           <div className="divide-y divide-slate-100">
               {filtered.map(g => (
                   <div key={g.id} className="group hover:bg-slate-50 transition-colors">
                       <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => toggleExpand(g.id!)}>
                           <div className={`w-10 h-10 rounded flex items-center justify-center font-bold text-sm shrink-0 ${g.status==='Awarded'?'bg-green-100 text-green-700':g.status==='Submitted'?'bg-blue-100 text-blue-700':'bg-slate-100 text-slate-600'}`}>
                               {g.title.charAt(0)}
                           </div>
                           <div className="flex-1 min-w-0">
                               <div className="flex justify-between">
                                   <h3 className="font-semibold text-slate-900 truncate">{g.title}</h3>
                                   <span className="text-slate-400 text-xs hidden sm:block">Deadline: {g.deadline || 'None'}</span>
                               </div>
                               <p className="text-sm text-slate-500 truncate">{g.funder} • ${g.awardAmount.toLocaleString()}</p>
                           </div>
                           <Link to={`/grants/${g.id}`} onClick={e => e.stopPropagation()} className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors">
                               View
                           </Link>
                           <button className="text-slate-400 hover:text-slate-600">
                               {expanded.has(g.id!) ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                           </button>
                       </div>
                       
                       {expanded.has(g.id!) && (
                           <div className="bg-slate-50/50 px-14 pb-4 animate-in slide-in-from-top-1">
                               <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                   <div><span className="text-slate-400">Probability:</span> <span className="font-medium text-slate-700">{g.probability}%</span></div>
                                   <div><span className="text-slate-400">Manager:</span> <span className="font-medium text-slate-700">{g.manager || 'Unassigned'}</span></div>
                               </div>
                               <div className="flex gap-2">
                                   <button onClick={e => { e.stopPropagation(); setModal({type:'task', id:g.id}); setIsOpen(true); }} className="text-xs flex items-center gap-1 text-slate-500 hover:text-indigo-600 border border-slate-200 bg-white px-2 py-1 rounded">
                                       <Plus size={14}/> Add Task
                                   </button>
                               </div>
                           </div>
                       )}
                   </div>
               ))}
               {filtered.length === 0 && <div className="p-8 text-center text-slate-500">No grants found matching your filters.</div>}
           </div>
       </div>

       <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={modal.type === 'new' ? 'New Grant Project' : modal.type === 'task' ? 'Add Quick Task' : 'Grant Recommendations'}>
           {modal.type === 'new' && (
               <div className="space-y-4">
                   <div><label className="text-xs font-bold text-slate-500 uppercase">Title</label><input className="w-full border rounded-lg p-2.5 mt-1" value={newG.title} onChange={e => setNewG({...newG, title: e.target.value})} /></div>
                   <div><label className="text-xs font-bold text-slate-500 uppercase">Funder</label><input className="w-full border rounded-lg p-2.5 mt-1" value={newG.funder} onChange={e => setNewG({...newG, funder: e.target.value})} /></div>
                   <div className="grid grid-cols-2 gap-4">
                       <div><label className="text-xs font-bold text-slate-500 uppercase">Amount ($)</label><input type="number" className="w-full border rounded-lg p-2.5 mt-1" value={newG.awardAmount} onChange={e => setNewG({...newG, awardAmount: +e.target.value})} /></div>
                       <div><label className="text-xs font-bold text-slate-500 uppercase">Deadline</label><input type="date" className="w-full border rounded-lg p-2.5 mt-1" value={newG.deadline} onChange={e => setNewG({...newG, deadline: e.target.value})} /></div>
                   </div>
                   <button onClick={saveGrant} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700">Create Project</button>
               </div>
           )}
           {modal.type === 'task' && (
               <div className="space-y-4">
                   <div><label className="text-xs font-bold text-slate-500 uppercase">Description</label><input className="w-full border rounded-lg p-2.5 mt-1" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} /></div>
                   <div><label className="text-xs font-bold text-slate-500 uppercase">Due Date</label><input type="date" className="w-full border rounded-lg p-2.5 mt-1" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} /></div>
                   <button onClick={saveTask} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700">Add Task</button>
               </div>
           )}
           {modal.type === 'disc' && recs && (
               <div className="space-y-4">
                   {recs.map((r: any, i: number) => (
                       <div key={i} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                           <div className="flex justify-between items-start mb-2">
                               <h4 className="font-bold text-slate-900">{r.focusArea}</h4>
                               <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">{r.matchScore}% Match</span>
                           </div>
                           <p className="text-sm text-slate-600 mb-2">{r.rationale}</p>
                           <div className="text-xs text-slate-500"><strong>Funders:</strong> {r.suggestedFunders.join(', ')}</div>
                       </div>
                   ))}
               </div>
           )}
       </Modal>
    </div>
  );
};
