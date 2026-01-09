
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { api } from '../services/api';
import { GrantDocument } from '../types';
import { analyzeDocumentRisks } from '../services/geminiService';
import { Loader2, CheckCircle2, AlertTriangle, Upload, File, FileText, FileImage, FileSpreadsheet, Download, Trash2, ScanLine, Info } from 'lucide-react';

export const DocumentsPanel: React.FC<{ grantId: number }> = ({ grantId }) => {
  const documents = useStore(() => api.documents.list(d => d.grantId === grantId), [grantId]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | 'loading'; message: string } | null>(null);
  const [scanningId, setScanningId] = useState<number | null>(null);

  useEffect(() => {
    if (uploadStatus?.type === 'success' || uploadStatus?.type === 'error') {
        const timer = setTimeout(() => setUploadStatus(null), 4000);
        return () => clearTimeout(timer);
    }
  }, [uploadStatus]);

  const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
      });
  };

  const processFiles = async (files: FileList) => {
    setUploadStatus({ type: 'loading', message: 'Uploading files...' });
    let successCount = 0;
    let errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check for zip files explicitly to provide feedback
        if (file.name.endsWith('.zip')) {
            errors.push(`${file.name}: ZIP archives must be unpacked before upload.`);
            continue;
        }

        if (file.size > 5 * 1024 * 1024) { 
            errors.push(`${file.name} exceeds 5MB limit.`);
            continue;
        }
        
        try {
            const base64Data = await fileToBase64(file);
            await api.documents.add({
                grantId,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                uploadedAt: new Date().toISOString(),
                data: base64Data
            });
            successCount++;
        } catch (e) {
            errors.push(`Failed to save ${file.name}.`);
        }
    }

    if (errors.length > 0) {
        setUploadStatus({ type: 'error', message: `Uploaded ${successCount}. Note: ${errors.join(' ')}` });
    } else if (successCount > 0) {
        setUploadStatus({ type: 'success', message: `Successfully uploaded ${successCount} file(s).` });
    } else {
        setUploadStatus(null);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        await processFiles(e.target.files);
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          await processFiles(e.dataTransfer.files);
      }
  };
  
  const handleDownload = (doc: GrantDocument) => {
    const link = document.createElement('a');
    link.href = doc.data as string;
    link.download = doc.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleScan = async (doc: GrantDocument) => {
      if(!doc.id) return;
      setScanningId(doc.id);
      try {
          const risks = await analyzeDocumentRisks(doc.data as string, doc.fileType);
          let count = 0;
          for(const r of risks) {
             await api.risks.add({
                 grantId,
                 summary: r.summary,
                 level: r.level as any || 'Medium',
                 mitigationPlan: r.mitigationPlan,
                 probability: 3,
                 impact: 3
             });
             count++;
          }
          setUploadStatus({ type: 'success', message: `Scan complete. Added ${count} risks to register.` });
      } catch (err: any) {
          console.error(err);
          setUploadStatus({ type: 'error', message: err.message || 'Failed to scan document.' });
      } finally {
          setScanningId(null);
      }
  };
  
  const getIcon = (type: string) => {
      if(type.includes('pdf')) return <FileText size={20} className="text-red-500" />;
      if(type.includes('image')) return <FileImage size={20} className="text-purple-500" />;
      if(type.includes('sheet') || type.includes('excel') || type.includes('csv')) return <FileSpreadsheet size={20} className="text-emerald-500" />;
      return <File size={20} className="text-slate-400" />;
  }

  const isScannable = (type: string) => ['application/pdf', 'text/plain'].includes(type);

  return (
    <div className="space-y-6">
       {uploadStatus && (
           <div className={`p-6 rounded-[2rem] border flex items-center gap-4 animate-in fade-in slide-in-from-top-4 shadow-xl ${
               uploadStatus.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 
               uploadStatus.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-900' : 
               'bg-zinc-900 border-zinc-800 text-white'
           }`}>
               {uploadStatus.type === 'loading' ? <Loader2 className="animate-spin" size={24} /> : 
                uploadStatus.type === 'success' ? <CheckCircle2 size={24} className="text-emerald-500" /> : <AlertTriangle size={24} className="text-rose-500" />}
               <span className="font-black text-sm tracking-tight">{uploadStatus.message}</span>
           </div>
       )}

       <div 
         className={`bg-white p-16 rounded-[3.5rem] border-4 border-dashed transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer ${
            isDragOver ? 'border-black bg-zinc-50 scale-[1.02]' : 'border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50'
         }`}
         onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
         onDragLeave={() => setIsDragOver(false)}
         onDrop={handleDrop}
         onClick={() => fileInput.current?.click()}
       >
         <input type="file" ref={fileInput} className="hidden" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,image/*" onChange={handleUpload} />
         <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center mb-6 transition-all shadow-xl ${isDragOver ? 'bg-black text-white' : 'bg-white text-zinc-300 border border-zinc-100'}`}>
            <Upload size={32} />
         </div>
         <h3 className={`text-2xl font-black mb-2 transition-colors ${isDragOver ? 'text-black' : 'text-zinc-900'}`}>
            {isDragOver ? 'Release to Deposit' : 'Deposit Documentation'}
         </h3>
         <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-zinc-500 font-medium max-w-sm">
               Securely attach contracts, RFPs, or financial reports.
            </p>
            <div className="flex items-center gap-2 bg-zinc-100 px-4 py-2 rounded-full border border-zinc-200">
               <Info size={14} className="text-zinc-400"/>
               <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Supported: PDF, TXT, XLS, Images (No ZIP)</span>
            </div>
         </div>
       </div>

       <div className="bg-white rounded-[3.5rem] border border-zinc-200 overflow-hidden shadow-2xl shadow-zinc-200/50">
          <div className="px-12 py-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/30">
             <h3 className="font-black text-xl text-black flex items-center gap-3">
                <FileText size={22} className="text-zinc-400"/> Stored Assets
             </h3>
             <span className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">{documents?.length || 0} Records</span>
          </div>
          
          {documents?.length === 0 ? (
            <div className="p-24 text-center">
              <div className="inline-flex p-6 bg-zinc-50 rounded-[2rem] text-zinc-200 mb-6"><File size={40}/></div>
              <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-xs">No assets indexed in this vault.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                 <thead className="bg-zinc-50/50 text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em] border-b border-zinc-100">
                    <tr>
                      <th className="px-12 py-4">Descriptor</th>
                      <th className="px-12 py-4">Magnitude</th>
                      <th className="px-12 py-4">Timestamp</th>
                      <th className="px-12 py-4 text-right">Controls</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-zinc-50">
                    {documents?.map(doc => (
                      <tr key={doc.id} className="hover:bg-zinc-50/50 transition-colors group">
                         <td className="px-12 py-6 font-bold text-black">
                            <div className="flex items-center gap-4">
                               {getIcon(doc.fileType)}
                               <span className="truncate max-w-xs group-hover:translate-x-1 transition-transform" title={doc.fileName}>{doc.fileName}</span>
                            </div>
                         </td>
                         <td className="px-12 py-6 text-zinc-500 font-medium">{(doc.fileSize / 1024).toFixed(0)} KB</td>
                         <td className="px-12 py-6 text-zinc-500 font-medium">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                         <td className="px-12 py-6 text-right flex justify-end gap-3">
                            <button 
                               onClick={() => handleScan(doc)} 
                               disabled={scanningId === doc.id || !isScannable(doc.fileType)}
                               className={`p-3 rounded-2xl transition-all flex items-center gap-2 border ${
                                  !isScannable(doc.fileType) ? 'text-zinc-200 border-zinc-50 cursor-not-allowed opacity-30' :
                                  scanningId === doc.id ? 'bg-black text-white border-black' : 'text-zinc-400 border-transparent hover:text-black hover:bg-white hover:border-zinc-200 hover:shadow-sm'
                               }`} 
                               title={isScannable(doc.fileType) ? "Intelligence Extraction" : "Type Not Supported for AI Scan"}
                            >
                               {scanningId === doc.id ? <Loader2 size={16} className="animate-spin" /> : <ScanLine size={16}/>}
                               <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">Extract</span>
                            </button>
                            <button onClick={() => handleDownload(doc)} className="p-3 text-zinc-400 border border-transparent hover:text-black hover:bg-white hover:border-zinc-200 hover:shadow-sm rounded-2xl transition-all" title="Retrieve">
                               <Download size={18}/>
                            </button>
                            <button onClick={() => api.documents.delete(doc.id!)} className="p-3 text-zinc-300 border border-transparent hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 rounded-2xl transition-all" title="Purge">
                               <Trash2 size={18}/>
                            </button>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
            </div>
          )}
       </div>
    </div>
  );
};
