import React, { useState, useRef, useEffect } from 'react';
import { getProposals, createProposal, updateProposal, draftProposal } from '@/services/api';
import { Plus, Edit2, Copy, Bold, Italic, Heading, List, Loader2, Sparkles } from 'lucide-react';

export const ProposalEditor = ({ grant }) => {
  const [proposals, setProposals] = useState([]);
  const [section, setSection] = useState('Abstract');
  const [ctx, setCtx] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [newSec, setNewSec] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (grant?.id) {
      getProposals(grant.id).then(res => setProposals(res.data)).catch(() => {});
    }
  }, [grant?.id]);

  const draft = proposals.find(p => p.section_name === section);
  const sections = Array.from(new Set(['Abstract', 'Needs Statement', 'Methodology', 'Budget Narrative', 'Evaluation', ...proposals.map(p => p.section_name)]));

  const save = async (content) => {
    if (draft) {
      await updateProposal(draft.id, content);
      setProposals(proposals.map(p => p.id === draft.id ? { ...p, content } : p));
    } else {
      const res = await createProposal({ grant_id: grant.id, section_name: section, content });
      setProposals([...proposals, res.data]);
    }
  };

  const aiDraft = async () => {
    setDrafting(true);
    try {
      const res = await draftProposal({ grant_title: grant.title, section, context: ctx, tone: 'Professional' });
      await save(res.data.content);
    } catch (e) {
      alert("Failed to generate draft");
    } finally {
      setDrafting(false);
    }
  };

  const fmt = (type) => {
    if (!ref.current || !draft) return;
    const { selectionStart: s, selectionEnd: e } = ref.current;
    const txt = draft.content || '';
    const wrap = (c) => txt.slice(0, s) + c + txt.slice(s, e) + c + txt.slice(e);
    const pre = (c) => txt.slice(0, s) + c + txt.slice(s);
    const val = type === 'b' ? wrap('**') : type === 'i' ? wrap('*') : type === 'h' ? pre('\n## ') : pre('\n- ');
    save(val);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]" data-testid="proposal-editor">
      <div className="w-full lg:w-56 bg-white rounded-xl border border-slate-200 p-3 h-full flex flex-col shrink-0">
        <div className="flex justify-between mb-3 px-1">
            <h3 className="font-bold text-slate-800">Sections</h3>
            <button onClick={() => { if(newSec) { setSection(newSec); setNewSec(''); } }} className="text-indigo-600"><Plus size={16}/></button>
        </div>
        <input className="w-full text-xs border rounded px-2 py-1 mb-2" placeholder="New Section..." value={newSec} onChange={e => setNewSec(e.target.value)} />
        <div className="overflow-y-auto flex-1 space-y-1">
          {sections.map(s => (
            <button key={s} onClick={() => setSection(s)} className={`w-full text-left px-3 py-2 rounded text-sm ${section === s ? 'bg-black text-white' : 'hover:bg-slate-50'}`}>{s}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden min-h-[500px]">
         <div className="flex justify-between p-3 border-b bg-slate-50">
            <h3 className="font-bold flex gap-2 items-center"><Edit2 size={16}/> {section}</h3>
            <button onClick={() => navigator.clipboard.writeText(draft?.content || '')}><Copy size={16}/></button>
         </div>
         <div className="flex gap-1 p-2 border-b">
            {[['b', Bold], ['i', Italic], ['h', Heading], ['l', List]].map(([k, I]) => 
                <button key={k} onClick={() => fmt(k)} className="p-1 hover:bg-slate-100 rounded"><I size={16}/></button>
            )}
         </div>
         <textarea ref={ref} className="flex-1 p-6 outline-none resize-none font-serif text-lg leading-relaxed" 
            placeholder="Start writing..." value={draft?.content || ''} onChange={e => save(e.target.value)} data-testid="proposal-textarea" />
         <div className="bg-slate-50 p-3 border-t flex gap-3">
            <input className="flex-1 border rounded px-3 py-2 text-sm" placeholder="AI Instructions..." value={ctx} onChange={e => setCtx(e.target.value)} />
            <button onClick={aiDraft} disabled={drafting} className="bg-black text-white px-4 rounded flex items-center gap-2 text-sm font-medium" data-testid="ai-draft-btn">
               {drafting ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>} Draft
            </button>
         </div>
      </div>
    </div>
  );
};
