import React, { useState, useEffect } from 'react';
import { getReports, generateReport, createReport } from '@/services/api';
import { Sparkles, Loader2 } from 'lucide-react';

export const ReportsSection = ({ grant }) => {
  const [reports, setReports] = useState([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (grant?.id) {
      getReports(grant.id).then(res => setReports(res.data)).catch(() => {});
    }
  }, [grant?.id]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const aiRes = await generateReport({
        grant_title: grant.title,
        grant_status: grant.status,
        metrics: `Award: $${grant.award_amount.toLocaleString()}`,
        risks: 'See risk register',
        instructions: 'Provide strategic insights'
      });
      
      const reportData = {
        grant_id: grant.id,
        report_type: 'Executive Summary',
        title: aiRes.data.title || `${grant.title} - Executive Summary`,
        summary_text: aiRes.data.summaryText || aiRes.data.summary_text || 'Report generated',
        status_color: aiRes.data.statusColor || aiRes.data.status_color || 'Green',
        recommendations: aiRes.data.recommendations || []
      };
      
      const savedReport = await createReport(reportData);
      setReports([savedReport.data, ...reports]);
    } catch (e) {
      console.error('Report generation failed:', e);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-16" data-testid="reports-section">
        <div className="bg-black p-12 rounded-[3.5rem] text-white flex justify-between items-center shadow-2xl border border-zinc-800">
           <div className="max-w-lg">
             <h3 className="text-4xl font-black tracking-tighter">AI Synthesis</h3>
             <p className="text-zinc-400 mt-4 text-xl font-medium">Distilling grant data into executive-grade intelligence.</p>
           </div>
           <button 
             onClick={handleGenerate} 
             disabled={generating}
             className="px-8 py-4 bg-white text-black rounded-2xl font-black flex items-center gap-3 hover:scale-105 transition-all disabled:opacity-50"
             data-testid="generate-report-btn"
           >
             {generating ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20}/>}
             Generate Report
           </button>
        </div>
        <div className="space-y-12">
          {reports.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-[3.5rem] p-16 text-center">
              <p className="text-zinc-400 font-bold uppercase tracking-widest">No reports generated yet</p>
              <p className="text-zinc-500 mt-2">Click the button above to generate an AI-powered report</p>
            </div>
          ) : reports.sort((a,b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()).map(r => (
              <div key={r.id} className="bg-white border border-zinc-200 rounded-[3.5rem] p-12 shadow-sm group hover:shadow-2xl transition-all duration-700">
                  <div className="flex justify-between mb-10 items-start">
                     <div>
                       <h4 className="text-3xl font-black text-black tracking-tighter">{r.title}</h4>
                       <p className="text-[10px] text-zinc-500 font-black mt-2 uppercase tracking-[0.2em]">{new Date(r.generated_at).toLocaleDateString()} • {r.report_type}</p>
                     </div>
                     <span className={`px-4 py-2 rounded-full text-xs font-black uppercase ${
                       r.status_color === 'Green' ? 'bg-emerald-100 text-emerald-700' :
                       r.status_color === 'Amber' ? 'bg-amber-100 text-amber-700' :
                       'bg-rose-100 text-rose-700'
                     }`}>
                       {r.status_color}
                     </span>
                  </div>
                  <div className="text-zinc-700 text-lg leading-relaxed whitespace-pre-wrap font-medium">{r.summary_text}</div>
                  {r.recommendations && r.recommendations.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-zinc-100">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">Recommendations</h5>
                      <ul className="space-y-2">
                        {r.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-3 text-zinc-600">
                            <span className="text-black font-black">{i + 1}.</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
          ))}
        </div>
    </div>
  );
};
