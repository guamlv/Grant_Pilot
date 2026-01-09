import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getGrant, deleteGrant, getFinancials } from '@/services/api';
import { formatCurrency, calculateFinancialMetrics } from '@/services/financialService';
import { useToast } from '@/hooks/useToast';
import { Modal } from '@/components/Modal';
import { ProposalEditor } from '@/components/ProposalEditor';
import { DocumentsPanel } from '@/components/DocumentsPanel';
import { BudgetPanel } from '@/components/BudgetPanel';
import { FinancialsSection } from '@/components/grant-detail/FinancialsSection';
import { ComplianceSection } from '@/components/grant-detail/ComplianceSection';
import { ReportsSection } from '@/components/grant-detail/ReportsSection';
import { 
  Loader2, 
  ArrowLeft, 
  Settings, 
  BrainCircuit, 
  Activity, 
  Clock,
  Archive
} from 'lucide-react';

export const GrantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [grant, setGrant] = useState(null);
  const [financialHistory, setFinancialHistory] = useState([]);
  const [tab, setTab] = useState('proposal');
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGrant = async () => {
      try {
        const res = await getGrant(id);
        setGrant(res.data);
        
        // Load financial history for budget panel
        const finRes = await getFinancials(id);
        const fins = (finRes.data || []).map(f => calculateFinancialMetrics(f, res.data.award_amount));
        setFinancialHistory(fins);
      } catch (e) {
        console.error('Failed to load grant:', e);
        navigate('/grants');
      } finally {
        setLoading(false);
      }
    };
    loadGrant();
  }, [id, navigate]);

  const handleArchive = async () => {
    if (!grant) return;
    const backup = { ...grant };
    
    navigate('/grants');
    await deleteGrant(id);
    
    addToast({
      type: 'info',
      title: 'Grant Archived',
      message: `"${backup.title}" has been moved to archives.`
    });
  };

  if (loading || !grant) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-100">
        <Loader2 className="animate-spin text-zinc-300" size={64} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-40 animate-in fade-in duration-700" data-testid="grant-detail">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
        <div className="space-y-4">
          <Link to="/grants" className="inline-flex items-center text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-black transition-colors">
            <ArrowLeft size={14} className="mr-2"/> Portfolio Library
          </Link>
          <h1 className="text-5xl md:text-6xl font-black text-black tracking-tighter leading-none flex flex-wrap items-center gap-6">
            {grant.title}
            <span className={`text-[11px] uppercase px-5 py-2.5 rounded-[1.25rem] font-black border tracking-[0.15em] ${
              grant.status === 'Awarded' ? 'bg-black text-white border-black' : 'bg-white border-zinc-300 text-zinc-600 shadow-sm'
            }`}>{grant.status}</span>
          </h1>
          <div className="flex flex-wrap gap-x-12 gap-y-3 text-sm text-zinc-600 font-bold">
             <span className="flex items-center gap-3"><Activity size={18} className="text-black"/> {grant.funder}</span>
             <span className="flex items-center gap-3"><Clock size={18} className="text-black"/> Deadline: {grant.deadline || 'Not set'}</span>
             <span className="text-black font-black text-2xl tracking-tighter">{formatCurrency(grant.award_amount)}</span>
          </div>
        </div>
        <div className="flex gap-4">
           <button onClick={() => setModal('report')} className="px-10 py-5 bg-black text-white rounded-[2.5rem] text-sm font-black shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 ring-4 ring-black/5" data-testid="intelligence-btn">
             <BrainCircuit size={20}/> Intelligence
           </button>
           <button onClick={() => setModal('settings')} className="p-5 bg-white border border-zinc-200 rounded-[1.5rem] hover:bg-zinc-50 text-zinc-400 shadow-sm transition-all" data-testid="settings-btn"><Settings size={22}/></button>
        </div>
      </div>

      <div className="flex gap-2 p-2 bg-zinc-200/50 rounded-[2.5rem] w-fit border border-zinc-200/60 overflow-x-auto no-scrollbar shadow-inner">
         {['proposal','documents','financials','budget','compliance','reports'].map(t => 
            <button 
              key={t} 
              onClick={() => setTab(t)} 
              className={`px-10 py-4 text-[11px] font-black uppercase tracking-[0.12em] rounded-[2rem] transition-all whitespace-nowrap ${tab === t ? 'bg-black text-white shadow-xl scale-[1.03]' : 'text-zinc-500 hover:text-black'}`}
              data-testid={`tab-${t}`}
            >
              {t}
            </button>
         )}
      </div>

      <div className="grid gap-16 py-4">
        {tab === 'proposal' && <ProposalEditor grant={grant} />}
        {tab === 'documents' && <DocumentsPanel grantId={id} />}
        {tab === 'financials' && <FinancialsSection grant={grant} />}
        {tab === 'budget' && <BudgetPanel grant={grant} financialHistory={financialHistory} />}
        {tab === 'compliance' && <ComplianceSection grantId={id} />}
        {tab === 'reports' && <ReportsSection grant={grant} />}
      </div>

      <Modal isOpen={modal === 'settings'} onClose={() => setModal(null)} title="Grant Parameters" maxWidth="sm">
         <div className="space-y-4">
            <p className="text-zinc-500 text-sm font-medium leading-relaxed">System-level controls for this grant record. Changes are synchronized across your secure vault.</p>
            <button 
              onClick={() => { setModal(null); handleArchive(); }} 
              className="w-full bg-rose-50 text-rose-600 font-black uppercase tracking-widest py-5 rounded-[2rem] transition-all hover:bg-rose-100 flex items-center justify-center gap-3"
              data-testid="archive-btn"
            >
              <Archive size={18}/> Archive Project
            </button>
         </div>
      </Modal>

      <Modal isOpen={modal === 'report'} onClose={() => setModal(null)} title="Intelligence Center" maxWidth="lg">
         <div className="space-y-6">
            <p className="text-zinc-500 text-sm font-medium leading-relaxed">Navigate to the Reports tab to generate AI-powered intelligence reports for this grant.</p>
            <button 
              onClick={() => { setModal(null); setTab('reports'); }} 
              className="w-full bg-black text-white font-black uppercase tracking-widest py-5 rounded-[2rem] transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
            >
              <BrainCircuit size={18}/> Go to Reports
            </button>
         </div>
      </Modal>
    </div>
  );
};
