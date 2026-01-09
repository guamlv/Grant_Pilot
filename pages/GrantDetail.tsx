
import React, { useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useStore } from '../hooks/useStore.ts';
import { api } from '../services/api.ts';
import { formatCurrency } from '../services/financialService.ts';
import { useToast } from '../hooks/useToast.ts';
import { MetricCard } from '../components/MetricCard.tsx';
import { Modal } from '../components/Modal.tsx';
import { ProposalEditor } from '../components/ProposalEditor.tsx';
import { DocumentsPanel } from '../components/DocumentsPanel.tsx';
import { BudgetPanel } from '../components/BudgetPanel.tsx';
import { FinancialsSection } from '../components/grant-detail/FinancialsSection.tsx';
import { ComplianceSection } from '../components/grant-detail/ComplianceSection.tsx';
import { ReportsSection } from '../components/grant-detail/ReportsSection.tsx';
import { 
  Loader2, 
  ArrowLeft, 
  Settings, 
  BrainCircuit, 
  Activity, 
  Clock,
  Archive
} from 'lucide-react';

export const GrantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const grantId = Number(id);
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const grant = useStore(() => api.grants.get(grantId), [grantId], 'grants');
  const [tab, setTab] = useState<string>((location.state as any)?.tab || 'proposal');
  const [modal, setModal] = useState<string | null>(null);

  const handleArchive = async () => {
    if (!grant) return;
    const backup = { ...grant };
    
    // Optimistic navigation
    navigate('/grants');
    await api.grants.delete(grantId);
    
    addToast({
      type: 'info',
      title: 'Grant Archived',
      message: `"${backup.title}" has been moved to archives.`,
      onUndo: async () => {
        await api.grants.add(backup);
        navigate(`/grants/${grantId}`);
      }
    });
  };

  if (!grant) return <div className="flex h-screen items-center justify-center bg-zinc-100"><Loader2 className="animate-spin text-zinc-300" size={64} /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-40 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
        <div className="space-y-4">
          <Link to="/grants" className="inline-flex items-center text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-black transition-colors">
            <ArrowLeft size={14} className="mr-2"/> Portfolio Library
          </Link>
          <h1 className="text-6xl font-black text-black tracking-tighter leading-none flex flex-wrap items-center gap-6">
            {grant.title}
            <span className={`text-[11px] uppercase px-5 py-2.5 rounded-[1.25rem] font-black border tracking-[0.15em] ${
              grant.status === 'Awarded' ? 'bg-black text-white border-black' : 'bg-white border-zinc-300 text-zinc-600 shadow-sm'
            }`}>{grant.status}</span>
          </h1>
          <div className="flex flex-wrap gap-x-12 gap-y-3 text-sm text-zinc-600 font-bold">
             <span className="flex items-center gap-3"><Activity size={18} className="text-black"/> {grant.funder}</span>
             <span className="flex items-center gap-3"><Clock size={18} className="text-black"/> Deadline: {grant.deadline}</span>
             <span className="text-black font-black text-2xl tracking-tighter">{formatCurrency(grant.awardAmount)}</span>
          </div>
        </div>
        <div className="flex gap-4">
           <button onClick={() => setModal('report')} className="px-10 py-5 bg-black text-white rounded-[2.5rem] text-sm font-black shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 ring-4 ring-black/5">
             <BrainCircuit size={20}/> Intelligence
           </button>
           <button onClick={() => setModal('settings')} className="p-5 bg-white border border-zinc-200 rounded-[1.5rem] hover:bg-zinc-50 text-zinc-400 shadow-sm transition-all"><Settings size={22}/></button>
        </div>
      </div>

      <div className="flex gap-2 p-2 bg-zinc-200/50 rounded-[2.5rem] w-fit border border-zinc-200/60 overflow-x-auto no-scrollbar shadow-inner">
         {['proposal','documents','financials','budget','compliance','reports'].map(t => 
            <button key={t} onClick={() => setTab(t)} className={`px-10 py-4 text-[11px] font-black uppercase tracking-[0.12em] rounded-[2rem] transition-all whitespace-nowrap ${tab === t ? 'bg-black text-white shadow-xl scale-[1.03]' : 'text-zinc-500 hover:text-black'}`}>{t}</button>
         )}
      </div>

      <div className="grid gap-16 py-4">
        {tab === 'proposal' && <ProposalEditor grant={grant} />}
        {tab === 'documents' && <DocumentsPanel grantId={grantId} />}
        {tab === 'financials' && <FinancialsSection grant={grant} />}
        {tab === 'budget' && <BudgetPanel grant={grant} financialHistory={[]} />}
        {tab === 'compliance' && <ComplianceSection grantId={grantId} />}
        {tab === 'reports' && <ReportsSection grant={grant} />}
      </div>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} title="Grant Parameters" maxWidth="sm">
         <div className="space-y-4">
            <p className="text-zinc-500 text-sm font-medium leading-relaxed">System-level controls for this grant record. Changes are synchronized across your local secure vault.</p>
            <button 
              onClick={() => { setModal(null); handleArchive(); }} 
              className="w-full bg-rose-50 text-rose-600 font-black uppercase tracking-widest py-5 rounded-[2rem] transition-all hover:bg-rose-100 flex items-center justify-center gap-3"
            >
              <Archive size={18}/> Archive Project
            </button>
         </div>
      </Modal>
    </div>
  );
};
