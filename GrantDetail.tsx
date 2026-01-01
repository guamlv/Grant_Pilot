
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { api } from '../services/api';
import { calculateFinancialMetrics, formatCurrency } from '../services/financialService';
import { generateComprehensiveReport } from '../services/geminiService';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MetricCard } from '../components/MetricCard';
import { Modal } from '../components/Modal';
import { ProposalEditor } from '../components/ProposalEditor';
import { DocumentsPanel } from '../components/DocumentsPanel';
import { BudgetPanel } from '../components/BudgetPanel';
import { Plus, Loader2, Trash2, CheckCircle2, ArrowLeft, Settings, Copy, BrainCircuit } from 'lucide-react';

const SimpleForm = ({ fields, onSubmit, btnText }: any) => {
    const [data, setData] = useState(fields.reduce((acc: any, f: any) => ({ ...acc, [f.key]: f.val || '' }), {}));
    return (
        <div className="space-y-4">
            {fields.map((f: any) => (
                <div key={f.key}>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{f.label}</label>
                    {f.type === 'select' ? <select className="w-full border border-slate-200 rounded-lg p-2.5 text-slate-900 bg-white" value={data[f.key]} onChange={e => setData({...data, [f.key]: e.target.value})}>{f.opts.map((o:any)=><option key={o} value={o}>{o}</option>)}</select> :
                     f.type === 'textarea' ? <textarea className="w-full border border-slate-200 rounded-lg p-2.5 text-slate-900" rows={3} value={data[f.key]} onChange={e => setData({...data, [f.key]: e.target.value})} /> :
                     <input type={f.type || 'text'} className="w-full border border-slate-200 rounded-lg p-2.5 text-slate-900" value={data[f.key]} onChange={e => setData({...data, [f.key]: f.type==='number' ? +e.target.value : e.target.value})} />}
                </div>
            ))}
            <button onClick={() => onSubmit(data)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-lg font-medium transition-colors">{btnText || 'Save'}</button>
        </div>
    );
};

export const GrantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const grantId = Number(id);
  const location = useLocation();
  const navigate = useNavigate();

  // Updated Data Fetching using useStore
  const grant = useStore(() => api.grants.get(grantId), [grantId]);
  const rawFin = useStore(() => api.financials.list(f => f.grantId === grantId), [grantId]);
  const risks = useStore(() => api.risks.list(r => r.grantId === grantId), [grantId]);
  const tasks = useStore(() => api.tasks.list(t => t.grantId === grantId), [grantId]);
  const reports = useStore(() => api.reports.list(r => r.grantId === grantId), [grantId]);
  const checks = useStore(() => api.checklistItems.list(c => c.grantId === grantId), [grantId]);

  const [tab, setTab] = useState<any>((location.state as any)?.tab || 'proposal');
  const [modal, setModal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Memoize Financial Calculations
  const fins = useMemo(() => {
    if (!grant || !rawFin) return [];
    return rawFin
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(s => calculateFinancialMetrics(s, grant.awardAmount));
  }, [grant, rawFin]);

  const lastFin = fins[fins.length - 1];

  const genReport = async (data: any) => {
    setLoading(true);
    try {
        const report = await generateComprehensiveReport(grant!, data.type, data.inst, lastFin, [], risks||[], tasks||[], [], []);
        await api.reports.add(report);
        setModal(null); setTab('reports');
    } finally { setLoading(false); }
  };

  const deleteGrant = async () => {
      if(confirm('Are you sure you want to delete this grant?')) {
          await api.grants.delete(grantId);
          navigate('/grants');
      }
  };

  if (!grant) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <Link to="/grants" className="flex items-center text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={16} className="mr-1"/> Back</Link>
      
      <div className="flex justify-between items-start">
         <div>
            <h1 className="text-3xl font-bold mb-2 text-slate-900">{grant.title} <span className="text-sm px-2 py-1 bg-slate-100 rounded-lg align-middle border border-slate-200">{grant.status}</span></h1>
            <div className="flex gap-6 text-sm text-slate-600">
               <span><strong>Funder:</strong> {grant.funder}</span>
               <span><strong>Amount:</strong> {formatCurrency(grant.awardAmount)}</span>
               <span><strong>Deadline:</strong> {grant.deadline}</span>
            </div>
         </div>
         <button onClick={() => setModal('settings')} className="p-2 border rounded-lg hover:bg-slate-50 text-slate-500"><Settings size={18}/></button>
      </div>

      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
         {['proposal','documents','financials','budget','compliance','reports'].map(t => 
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
         )}
      </div>

      <div className="min-h-[400px]">
        {tab === 'proposal' && <ProposalEditor grant={grant} />}
        {tab === 'documents' && <DocumentsPanel grantId={grantId} />}
        {tab === 'budget' && <BudgetPanel grant={grant} financialHistory={fins} />}
        
        {tab === 'financials' && (
             <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between mb-6 items-center">
                        <h3 className="font-bold text-slate-900">Burn Rate</h3>
                        <button onClick={() => setModal('fin')} className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">Add Data</button>
                    </div>
                    <div className="h-72"><ResponsiveContainer><LineChart data={fins}><XAxis dataKey="date"/><YAxis/><Tooltip/><Line type="monotone" dataKey="actualSpend" stroke="#ef4444" strokeWidth={2} name="Actual"/><Line type="monotone" dataKey="projectedSpend" stroke="#94a3b8" strokeDasharray="5 5" name="Projected"/></LineChart></ResponsiveContainer></div>
                </div>
                <div className="space-y-6">
                    <MetricCard label="Remaining Budget" value={lastFin ? formatCurrency(lastFin.remainingBudget) : 'N/A'} />
                    <MetricCard label="Cost Variance" value={lastFin ? formatCurrency(lastFin.variance) : 'N/A'} status={lastFin?.variance < 0 ? 'danger' : 'success'} />
                </div>
             </div>
        )}

        {tab === 'compliance' && (
            <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                     <div className="flex justify-between items-center"><h3 className="font-bold text-slate-900">Risk Register</h3><button onClick={() => setModal('risk')} className="p-1 hover:bg-slate-100 rounded-lg"><Plus size={20} className="text-indigo-600"/></button></div>
                     {risks?.map(r => <div key={r.id} className="p-4 bg-white border border-slate-200 rounded-xl flex justify-between items-start shadow-sm"><div><div className="font-bold text-sm text-slate-900">{r.summary}</div><div className="text-xs text-slate-500 mt-1">{r.level} Risk • {r.mitigationPlan}</div></div><button onClick={() => api.risks.delete(r.id!)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></div>)}
                </div>
                <div className="space-y-6">
                     <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                        <h3 className="font-bold mb-4 text-slate-900">Compliance Checklist</h3>
                        <div className="space-y-2">
                            {checks?.map(c => <div key={c.id} className="flex gap-3 items-start"><input type="checkbox" className="mt-1" checked={c.isCompleted} onChange={() => api.checklistItems.update(c.id!, {isCompleted:!c.isCompleted})} /><span className={c.isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}>{c.text}</span></div>)}
                            <input className="w-full text-sm border-b border-slate-200 mt-3 py-1 outline-none placeholder:text-slate-400" placeholder="+ Add item" onKeyDown={async e => { if(e.key==='Enter') { await api.checklistItems.add({grantId, text: (e.target as any).value, isCompleted:false}); (e.target as any).value=''; }}} />
                        </div>
                     </div>
                     <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                        <div className="flex justify-between mb-4 items-center"><h3 className="font-bold text-slate-900">Task List</h3><button onClick={() => setModal('task')} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded-lg"><Plus size={16}/></button></div>
                        {tasks?.map(t => <div key={t.id} className="flex justify-between py-2 text-sm border-b border-slate-50 last:border-0"><div className="flex gap-3"><button onClick={() => api.tasks.update(t.id!, {isCompleted:!t.isCompleted})}><CheckCircle2 size={18} className={t.isCompleted ? 'text-green-500' : 'text-slate-300 hover:text-green-500'}/></button><span className={t.isCompleted?'line-through opacity-50':''}>{t.description}</span></div><div className="text-slate-400 text-xs flex items-center">{t.dueDate}</div></div>)}
                     </div>
                </div>
            </div>
        )}

        {tab === 'reports' && (
             <div className="space-y-6">
                 <div className="flex justify-between items-center bg-slate-50 p-6 rounded-xl border border-slate-200"><div><h3 className="font-bold text-slate-900">AI Reporting Agent</h3><p className="text-sm text-slate-500">Generate progress reports and compliance audits.</p></div><button onClick={() => setModal('report')} className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg flex gap-2 font-medium hover:bg-indigo-700 transition-colors"><BrainCircuit size={18}/> Generate Report</button></div>
                 {reports?.sort((a,b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()).map(r => (
                     <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                         <div className="flex justify-between mb-3"><h4 className="font-bold text-lg text-slate-900">{r.title}</h4><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${r.statusColor==='Red'?'bg-red-100 text-red-700':r.statusColor==='Amber'?'bg-amber-100 text-amber-700':'bg-green-100 text-green-700'}`}>{r.statusColor} Flag</span></div>
                         <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{r.summaryText}</p>
                         <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                            <button className="text-xs text-indigo-600 font-medium flex gap-1.5 hover:text-indigo-800" onClick={() => navigator.clipboard.writeText(r.summaryText)}><Copy size={14}/> Copy to Clipboard</button>
                         </div>
                     </div>
                 ))}
             </div>
        )}
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal === 'report' ? 'Generate Report' : modal === 'settings' ? 'Grant Settings' : 'Update Grant'}>
         {modal === 'risk' && <SimpleForm fields={[{key:'summary',label:'Risk Summary'},{key:'mitigationPlan',label:'Mitigation Plan',type:'textarea'}]} onSubmit={async (d:any) => { await api.risks.add({grantId, ...d, probability:3, impact:3, level:'Medium'}); setModal(null); }} />}
         {modal === 'task' && <SimpleForm fields={[{key:'description',label:'Task Description'},{key:'dueDate',label:'Due Date',type:'date'}]} onSubmit={async (d:any) => { await api.tasks.add({grantId, ...d, isCompleted:false}); setModal(null); }} />}
         {modal === 'fin' && <SimpleForm fields={[{key:'date',label:'Snapshot Date',type:'date',val:new Date().toISOString().split('T')[0]},{key:'projectedSpend',label:'Projected Spend ($)',type:'number'},{key:'actualSpend',label:'Actual Spend ($)',type:'number'}]} onSubmit={async (d:any) => { await api.financials.add({grantId, ...d}); setModal(null); }} />}
         {modal === 'report' && <SimpleForm fields={[{key:'type',label:'Report Type',type:'select',opts:['Executive Summary','Financial Narrative','Compliance Audit']},{key:'inst',label:'Specific Instructions or Context',type:'textarea'}]} btnText={loading ? 'Generating Analysis...' : 'Generate with AI'} onSubmit={genReport} />}
         {modal === 'settings' && (
            <div className="space-y-4">
               <SimpleForm fields={[{key:'title',label:'Grant Title',val:grant.title},{key:'awardAmount',label:'Award Amount ($)',type:'number',val:grant.awardAmount}]} onSubmit={async (d:any) => { await api.grants.update(grantId, d); setModal(null); }} />
               <div className="pt-4 border-t border-slate-100">
                  <button onClick={deleteGrant} className="w-full text-red-600 text-xs py-2 hover:bg-red-50 rounded-lg flex justify-center items-center gap-2 transition-colors"><Trash2 size={14}/> Delete Project</button>
               </div>
            </div>
         )}
      </Modal>
    </div>
  );
};
