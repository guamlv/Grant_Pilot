import React, { useState, useRef, useEffect } from 'react';
import { getDocuments, createDocument, deleteDocument, analyzeRisks, createRisk } from '@/services/api';
import { Loader2, CheckCircle2, AlertTriangle, Upload, File, FileText, FileImage, FileSpreadsheet, Download, Trash2, ScanLine, Info } from 'lucide-react';

export const DocumentsPanel = ({ grantId }) => {
  const [documents, setDocuments] = useState([]);
  const fileInput = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [scanningId, setScanningId] = useState(null);

  useEffect(() => {
    if (grantId) {
      getDocuments(grantId).then(res => setDocuments(res.data)).catch(() => {});
    }
  }, [grantId]);

  useEffect(() => {
    if (uploadStatus?.type === 'success' || uploadStatus?.type === 'error') {
        const timer = setTimeout(() => setUploadStatus(null), 4000);
        return () => clearTimeout(timer);
    }
  }, [uploadStatus]);

  const fileToBase64 = (file) => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = error => reject(error);
      });
  };

  const processFiles = async (files) => {
    setUploadStatus({ type: 'loading', message: 'Uploading files...' });
    let successCount = 0;
    let errors = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (file.name.endsWith('.zip')) {
            errors.push(`${file.name}: ZIP archives not supported.`);
            continue;
        }

        if (file.size > 5 * 1024 * 1024) { 
            errors.push(`${file.name} exceeds 5MB limit.`);
            continue;
        }
        
        try {
            const base64Data = await fileToBase64(file);
            const res = await createDocument({
                grant_id: grantId,
                file_name: file.name,
                file_type: file.type,
                file_size: file.size,
                data: base64Data
            });
            setDocuments(prev => [...prev, res.data]);
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

  const handleUpload = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
        await processFiles(e.target.files);
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  const handleDrop = async (e) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          await processFiles(e.dataTransfer.files);
      }
  };
  
  const handleDownload = (doc) => {
    const link = document.createElement('a');
    link.href = doc.data;
    link.download = doc.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleScan = async (doc) => {
      if(!doc.id) return;
      setScanningId(doc.id);
      try {
          const res = await analyzeRisks({ base64_data: doc.data, mime_type: doc.file_type });
          const risks = res.data;
          let count = 0;
          for(const r of risks) {
             await createRisk({
                 grant_id: grantId,
                 summary: r.summary,
                 level: r.level || 'Medium',
                 mitigation_plan: r.mitigationPlan || r.mitigation_plan || '',
                 probability: 3,
                 impact: 3
             });
             count++;
          }
          setUploadStatus({ type: 'success', message: `Scan complete. Added ${count} risks to register.` });
      } catch (err) {
          console.error(err);
          setUploadStatus({ type: 'error', message: err.message || 'Failed to scan document.' });
      } finally {
          setScanningId(null);
      }
  };

  const handleDelete = async (docId) => {
    await deleteDocument(docId);
    setDocuments(documents.filter(d => d.id !== docId));
  };
  
  const getIcon = (type) => {
      if(type?.includes('pdf')) return <FileText size={20} className="text-red-500" />;
      if(type?.includes('image')) return <FileImage size={20} className="text-purple-500" />;
      if(type?.includes('sheet') || type?.includes('excel') || type?.includes('csv')) return <FileSpreadsheet size={20} className="text-emerald-500" />;
      return <File size={20} className="text-slate-400" />;
  };

  const isScannable = (type) => ['application/pdf', 'text/plain'].includes(type);

  return (
    <div className="space-y-6" data-testid="documents-panel">
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
         data-testid="document-dropzone"
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
               <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Supported: PDF, TXT, XLS, Images</span>
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
                               {getIcon(doc.file_type)}
                               <span className="truncate max-w-xs group-hover:translate-x-1 transition-transform" title={doc.file_name}>{doc.file_name}</span>
                            </div>
                         </td>
                         <td className="px-12 py-6 text-zinc-500 font-medium">{(doc.file_size / 1024).toFixed(0)} KB</td>
                         <td className="px-12 py-6 text-zinc-500 font-medium">{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                         <td className="px-12 py-6 text-right flex justify-end gap-3">
                            <button 
                               onClick={() => handleScan(doc)} 
                               disabled={scanningId === doc.id || !isScannable(doc.file_type)}
                               className={`p-3 rounded-2xl transition-all flex items-center gap-2 border ${
                                  !isScannable(doc.file_type) ? 'text-zinc-200 border-zinc-50 cursor-not-allowed opacity-30' :
                                  scanningId === doc.id ? 'bg-black text-white border-black' : 'text-zinc-400 border-transparent hover:text-black hover:bg-white hover:border-zinc-200 hover:shadow-sm'
                               }`} 
                               title={isScannable(doc.file_type) ? "Intelligence Extraction" : "Type Not Supported"}
                            >
                               {scanningId === doc.id ? <Loader2 size={16} className="animate-spin" /> : <ScanLine size={16}/>}
                               <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">Extract</span>
                            </button>
                            <button onClick={() => handleDownload(doc)} className="p-3 text-zinc-400 border border-transparent hover:text-black hover:bg-white hover:border-zinc-200 hover:shadow-sm rounded-2xl transition-all" title="Retrieve">
                               <Download size={18}/>
                            </button>
                            <button onClick={() => handleDelete(doc.id)} className="p-3 text-zinc-300 border border-transparent hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 rounded-2xl transition-all" title="Purge">
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
