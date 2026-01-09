
import React, { useState, useMemo, useRef } from 'react';
import { useStore } from '../hooks/useStore.ts';
import { api } from '../services/api.ts';
import { Plus, Sparkles, TrendingUp, Compass, ChevronDown, ChevronUp, Search, Filter, Loader2, Upload, FileText, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { generatePortfolioAnalysis, generateGrantRecommendations, parseGrantDocument } from '../services/geminiService.ts';
import { Modal } from '../components/Modal.tsx';
import { useToast } from '../hooks/useToast.ts';

export const GrantList: React.FC = () => {
  const grants = useStore(() => api.grants.list()) || [];
  const settingsList = useStore(() => api.settings.list());
  const settings = settingsList?.[0];
  const { addToast } = useToast();

  const [modal, setModal] = useState<{ type: 'new' | 'task' | 'disc'; id?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [recs, setRecs] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newG, setNewG] = useState<any>({ title: '', status: 'Prospect', awardAmount: 0 });
  const [newTask, setNewTask] = useState({ description: '', dueDate: '' });

  const filtered = useMemo(() => grants.filter(g => 
    (g.title.toLowerCase().includes(search.toLowerCase()) || g.funder.toLowerCase().includes(search.toLowerCase())) &&
    (filter === 'All' || g.status === filter)
  ), [grants, search, filter]);

  const saveGrant = async () => {
    if (newG.title) {
        await api.grants.add({ ...newG, startDate: newG.startDate || new Date().toISOString().split('T')[0], description: newG.description || '', funder: newG.funder || 'Unknown', probability: newG.probability || 50 });
        setModal(null);
        setNewG({ title: '', status: 'Prospect', awardAmount: 0 });
        addToast({ type: 'success', title: 'Project Initialized', message: `"${newG.title}" added to pipeline.` });
    }
  };

  const saveTask = async () => {
      if (modal?.id && newTask.description) {
          await api.tasks.add({ grantId: modal.id, ...newTask, isCompleted: false });
          setModal(null);
          addToast({ type: 'success', title: 'Task Logged', message: 'Action item added to project register.' });
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
          setModal({ type: 'disc' });
      } finally { setLoading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.name.endsWith('.zip')) {
        addToast({ type: 'error', title: 'Format Error', message: 'ZIP files are not supported. Please upload a PDF or TXT file.' });
        return;
      }

      setUploading(true);
      try {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = async () => {
              const base64 = reader.result as string;
              try {
                const data = await parseGrantDocument(base64, file.type);
                setNewG((prev: any) => ({ ...prev, ...data }));
                addToast({ type: 'success', title: 'Intelligence Synced', message: 'Parameters extracted successfully.' });
              } catch (error: any) {
                addToast({ type: 'error', title: 'Extraction Failed', message: 'The AI could not interpret this document structure.' });
              }
          };
      } finally { setUploading(false); }
  };

  const toggleExpand = (id: number) => {
      const next = new Set(expanded);
      if (next.has(id)) next.delete(id); else next.add(id);
      setExpanded(next);
  };

  return (
    <div className="space-y-12 pb-32 max-w-7xl mx-auto">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
           <div className="space-y-2">
               <h1 className="text-5xl font-black text-black tracking-tighter">Funding Library</h1>
               <p className="text-zinc-500 font-medium">Strategic pipeline of active opportunities and awarded contracts.</p>
           </div>
           <div className="flex gap-4">
               <button onClick={runAnalysis} disabled={loading} className="px-6 py-4 bg-white border border-zinc-200 text-black rounded-[1.5rem] text-sm font-black hover:bg-zinc-50 flex items-center gap-3 transition-all shadow-sm">
                   {loading && !analysis ? <Loader2 className="animate-spin" size={18}/> : <TrendingUp size={18} className="text-zinc-400"/>} <span>Portfolio AI</span>
               </button>
               <button onClick={runDiscovery} disabled={loading} className="px-6 py-4 bg-white border border-zinc-200 text-black rounded-[1.5rem] text-sm font-black hover:bg-zinc-50 flex items-center gap-3 transition-all shadow-sm">
                   {loading && !recs ? <Loader2 className="animate-spin" size={18}/> : <Compass size={18} className="text-zinc-400"/>} <span>Discover</span>
               </button>
               <button onClick={() => setModal({type:'new'})} className="px-8 py-4 bg-black text-white rounded-[2rem] text-sm font-black hover:scale-105 transition-all shadow-2xl flex items-center gap-3">
                   <Plus size={20}/> <span>Create New</span>
               </button>
           </div>
       </div>

       {analysis && (
           <div className="bg-black text-white p-10 rounded-[3.5rem] animate-in slide-in-from-top-6 shadow-2xl border border-zinc-800">
               <div className="flex justify-between items-start mb-10">
                   <div>
                     <h3 className="text-3xl font-black text-white tracking-tighter flex gap-4 items-center"><Sparkles className="text-emerald-400" size={28}/> Intelligence Brief</h3>
                     <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Strategic Portfolio Audit</p>
                   </div>
                   <button onClick={() => setAnalysis(null)} className="text-zinc-600 hover:text-white transition-colors">Close</button>
               </div>
               <div className="grid md:grid-cols-2 gap-16">
                   <div className="space-y-6">
                       <h4 className="font-black text-[11px] uppercase tracking-[0.3em] text-zinc-500 border-b border-zinc-900 pb-4">Key Market Trends</h4>
                       <ul className="space-y-4 text-zinc-300 text-lg font-medium leading-relaxed">{analysis.trends.map((t: string, i: number) => <li key={i} className="flex gap-4"><span className="text-emerald-500">/</span> {t}</li>)}</ul>
                   </div>
                   <div className="space-y-6">
                       <h4 className="font-black text-[11px] uppercase tracking-[0.3em] text-zinc-500 border-b border-zinc-900 pb-4">Strategic Directives</h4>
                       <ul className="space-y-4 text-zinc-300 text-lg font-medium leading-relaxed">{analysis.strategy.map((s: string, i: number) => <li key={i} className="flex gap-4"><span className="text-emerald-500">/</span> {s}</li>)}</ul>
                   </div>
               </div>
           </div>
       )}

       <div className="bg-white border border-zinc-200 rounded-[3.5rem] overflow-hidden shadow-2xl shadow-zinc-200/50">
           <div className="p-8 border-b border-zinc-100 flex flex-col md:flex-row gap-6 bg-zinc-50/30">
               <div className="relative flex-1">
                   <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400" size={20}/>
                   <input className="w-full pl-14 pr-6 py-5 rounded-3xl border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-black/5 bg-white font-bold" placeholder="Search funding vault..." value={search} onChange={e => setSearch(e.target.value)} />
               </div>
               <div className="relative">
                   <Filter className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-400" size={20}/>
                   <select className="pl-14 pr-12 py-5 rounded-3xl border border-zinc-100 appearance-none bg-white focus:outline-none font-bold min-w-[180px]" value={filter} onChange={e => setFilter(e.target.value)}>
                       {['All', 'Prospect', 'Drafting', 'Submitted', 'Awarded'].map(s => <option key={s} value={s}>{s} Phase</option>)}
                   </select>
               </div>
           </div>
           
           <div className="divide-y divide-zinc-50">
               {filtered.map(g => (
                   <div key={g.id} className="group hover:bg-zinc-50/50 transition-all duration-300">
                       <div className="p-8 flex items-center gap-8 cursor-pointer" onClick={() => toggleExpand(g.id!)}>
                           <div className={`w-14 h-14 rounded-3xl flex items-center justify-center font-black text-xl shrink-0 shadow-sm border ${g.status==='Awarded'?'bg-black text-white border-black':g.status==='Submitted'?'bg-zinc-100 text-zinc-900 border-zinc-200':'bg-white text-zinc-400 border-zinc-100'}`}>
                               {g.title.charAt(0)}
                           </div>
                           <div className="flex-1 min-w-0">
                               <div className="flex justify-between items-start">
                                   <h3 className="text-xl font-black text-black tracking-tight group-hover:translate-x-1 transition-transform">{g.title}</h3>
                                   <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest hidden sm:block whitespace-nowrap bg-zinc-100/50 px-3 py-1 rounded-full">{g.deadline || 'No Deadline'}</span>
                               </div>
                               <p className="text-base text-zinc-500 font-medium mt-1">{g.funder} • <span className="text-black font-black">{formatCurrency(g.awardAmount)}</span></p>
                           </div>
                           <div className="flex items-center gap-6">
                             <Link to={`/grants/${g.id}`} onClick={e => e.stopPropagation()} className="px-6 py-3 text-xs font-black uppercase tracking-widest text-white bg-black rounded-2xl hover:scale-105 transition-all shadow-lg opacity-0 group-hover:opacity-100">
                               Manage
                             </Link>
                             <button className="text-zinc-300 group-hover:text-black transition-colors">
                               {expanded.has(g.id!) ? <ChevronUp size={24}/> : <ChevronDown size={24}/>}
                             </button>
                           </div>
                       </div>
                       
                       {expanded.has(g.id!) && (
                           <div className="bg-zinc-50/50 px-32 pb-10 animate-in slide-in-from-top-2">
                               <div className="grid grid-cols-2 gap-12 text-sm mb-8 border-t border-zinc-100 pt-8">
                                   <div>
                                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block mb-2">Confidence Level</span> 
                                     <span className="font-black text-black text-xl">{g.probability}% Win Probability</span>
                                   </div>
                                   <div>
                                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block mb-2">Project Manager</span> 
                                     <span className="font-black text-black text-xl">{g.manager || 'System Assigned'}</span>
                                   </div>
                               </div>
                               <div className="flex gap-4">
                                   <button onClick={e => { e.stopPropagation(); setModal({type:'task', id:g.id}); }} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 text-zinc-500 hover:text-black bg-white border border-zinc-200 rounded-2xl transition-all shadow-sm">
                                       <Plus size={16}/> New Milestone
                                   </button>
                               </div>
                           </div>
                       )}
                   </div>
               ))}
               {filtered.length === 0 && <div className="p-32 text-center text-zinc-400 font-bold uppercase tracking-[0.2em] text-sm">No encrypted records found.</div>}
           </div>
       </div>

       <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.type === 'new' ? 'Initialize Grant' : modal?.type === 'task' ? 'Add Quick Task' : 'Intelligent Recommendations'}>
           {modal?.type === 'new' && (
               <div className="space-y-8">
                   <div 
                      className={`border-4 border-dashed rounded-[2.5rem] p-12 text-center cursor-pointer transition-all duration-300 ${uploading ? 'bg-zinc-100 border-black' : 'border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50'}`}
                      onClick={() => fileInputRef.current?.click()}
                   >
                       <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.txt" onChange={handleFileUpload} />
                       {uploading ? (
                           <div className="flex flex-col items-center text-black">
                               <Loader2 className="animate-spin mb-4" size={40} />
                               <span className="text-sm font-black uppercase tracking-widest">Neural Parsing Active...</span>
                           </div>
                       ) : (
                           <div className="flex flex-col items-center text-zinc-400">
                               <Upload className="mb-4" size={40} />
                               <span className="text-base font-black text-black tracking-tight">AI Auto-Extraction</span>
                               <span className="text-xs font-bold uppercase tracking-widest mt-2">Drop RFP (PDF or TXT) Here</span>
                               <div className="mt-4 flex items-center gap-2 bg-zinc-100 px-3 py-1 rounded-lg">
                                  <Info size={12}/>
                                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Note: ZIP archives are not supported.</span>
                               </div>
                           </div>
                       )}
                   </div>

                   <div className="relative">
                       <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100"></div></div>
                       <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.3em]"><span className="bg-white px-6 text-zinc-300">Manual Entry</span></div>
                   </div>

                   <div className="space-y-6">
                     <div><label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Grant Identifier</label><input className="w-full border border-zinc-100 bg-zinc-50 rounded-2xl p-4 font-black focus:bg-white outline-none transition-all" value={newG.title} onChange={e => setNewG({...newG, title: e.target.value})} placeholder="Title" /></div>
                     <div><label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Funder</label><input className="w-full border border-zinc-100 bg-zinc-50 rounded-2xl p-4 font-black focus:bg-white outline-none transition-all" value={newG.funder} onChange={e => setNewG({...newG, funder: e.target.value})} placeholder="Agency" /></div>
                     <div className="grid grid-cols-2 gap-6">
                         <div><label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Value ($)</label><input type="number" className="w-full border border-zinc-100 bg-zinc-50 rounded-2xl p-4 font-black focus:bg-white outline-none transition-all" value={newG.awardAmount} onChange={e => setNewG({...newG, awardAmount: +e.target.value})} /></div>
                         <div><label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Deadline</label><input type="date" className="w-full border border-zinc-100 bg-zinc-50 rounded-2xl p-4 font-black focus:bg-white outline-none transition-all" value={newG.deadline} onChange={e => setNewG({...newG, deadline: e.target.value})} /></div>
                     </div>
                   </div>
                   <button onClick={saveGrant} className="w-full bg-black text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-2xl">Confirm Initialization</button>
               </div>
           )}
           {modal?.type === 'task' && (
               <div className="space-y-6">
                   <div><label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-2">Description</label><input className="w-full border border-zinc-100 bg-zinc-50 rounded-2xl p-4 font-black focus:bg-white outline-none transition-all" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} /></div>
                   <div><label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-2">Timeline</label><input type="date" className="w-full border border-zinc-100 bg-zinc-50 rounded-2xl p-4 font-black focus:bg-white outline-none transition-all" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} /></div>
                   <button onClick={saveTask} className="w-full bg-black text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:scale-[1.02] shadow-2xl transition-all">Add Milestone</button>
               </div>
           )}
           {modal?.type === 'disc' && recs && (
               <div className="space-y-6">
                   {recs.map((r: any, i: number) => (
                       <div key={i} className="bg-zinc-50 p-8 rounded-[2rem] border border-zinc-100 hover:shadow-xl transition-all group">
                           <div className="flex justify-between items-start mb-6">
                               <h4 className="font-black text-xl text-black tracking-tight">{r.focusArea}</h4>
                               <span className="bg-black text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">{r.matchScore}% Intelligence Score</span>
                           </div>
                           <p className="text-zinc-600 text-sm font-medium leading-relaxed mb-6">{r.rationale}</p>
                           <div className="flex flex-wrap gap-2">
                             {r.suggestedFunders.map((f:string, j:number) => <span key={j} className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border border-zinc-200 px-3 py-1 rounded-lg">{f}</span>)}
                           </div>
                       </div>
                   ))}
               </div>
           )}
       </Modal>
    </div>
  );
};

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
}
