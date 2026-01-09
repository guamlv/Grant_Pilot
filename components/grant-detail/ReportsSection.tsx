
import React from 'react';
import { useStore } from '../../hooks/useStore.ts';
import { api } from '../../services/api.ts';
import { Grant } from '../../types.ts';

export const ReportsSection: React.FC<{ grant: Grant }> = ({ grant }) => {
  const reports = useStore(() => api.reports.list(r => r.grantId === grant.id), [grant.id], 'reports');

  return (
    <div className="max-w-4xl mx-auto space-y-16">
        <div className="bg-black p-12 rounded-[3.5rem] text-white flex justify-between items-center shadow-2xl border border-zinc-800">
           <div className="max-w-lg">
             <h3 className="text-4xl font-black tracking-tighter">AI Synthesis</h3>
             <p className="text-zinc-400 mt-4 text-xl font-medium">Distilling grant data into executive-grade intelligence.</p>
           </div>
        </div>
        <div className="space-y-12">
          {reports?.sort((a,b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()).map(r => (
              <div key={r.id} className="bg-white border border-zinc-200 rounded-[3.5rem] p-12 shadow-sm group hover:shadow-2xl transition-all duration-700">
                  <div className="flex justify-between mb-10 items-start">
                     <div>
                       <h4 className="text-3xl font-black text-black tracking-tighter">{r.title}</h4>
                       <p className="text-[10px] text-zinc-500 font-black mt-2 uppercase tracking-[0.2em]">{new Date(r.generatedAt).toLocaleDateString()} • {r.reportType}</p>
                     </div>
                  </div>
                  <div className="text-zinc-700 text-xl leading-relaxed whitespace-pre-wrap font-medium">{r.summaryText}</div>
              </div>
          ))}
        </div>
    </div>
  );
};
