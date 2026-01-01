
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { api } from '../services/api';
import { GrantDocument } from '../types';
import { Loader2, CheckCircle2, AlertTriangle, Upload, File, FileText, FileImage, FileSpreadsheet, Download, Trash2 } from 'lucide-react';

export const DocumentsPanel: React.FC<{ grantId: number }> = ({ grantId }) => {
  const documents = useStore(() => api.documents.list(d => d.grantId === grantId), [grantId]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | 'loading'; message: string } | null>(null);

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
        if (file.size > 5 * 1024 * 1024) { // 5MB Limit for localStorage mock
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
        setUploadStatus({ type: 'error', message: `Uploaded ${successCount}. Errors: ${errors.join(', ')}` });
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
    // For Base64 strings (localStorage mock)
    const link = document.createElement('a');
    link.href = doc.data as string;
    link.download = doc.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const getIcon = (type: string) => {
      if(type.includes('pdf')) return <FileText size={20} className="text-red-500" />;
      if(type.includes('image')) return <FileImage size={20} className="text-purple-500" />;
      if(type.includes('sheet') || type.includes('excel') || type.includes('csv')) return <FileSpreadsheet size={20} className="text-emerald-500" />;
      return <File size={20} className="text-slate-400" />;
  }

  return (
    <div className="space-y-6">
       {/* Status Banner */}
       {uploadStatus && (
           <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
               uploadStatus.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 
               uploadStatus.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 
               'bg-blue-50 border-blue-200 text-blue-700'
           }`}>
               {uploadStatus.type === 'loading' ? <Loader2 className="animate-spin" size={20} /> : 
                uploadStatus.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
               <span className="font-medium text-sm">{uploadStatus.message}</span>
           </div>
       )}

       {/* Drag Drop Area */}
       <div 
         className={`bg-white p-10 rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer ${
            isDragOver ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
         }`}
         onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
         onDragLeave={() => setIsDragOver(false)}
         onDrop={handleDrop}
         onClick={() => fileInput.current?.click()}
       >
         <input type="file" ref={fileInput} className="hidden" multiple onChange={handleUpload} />
         <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragOver ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
            <Upload size={32} />
         </div>
         <h3 className={`text-lg font-bold mb-1 transition-colors ${isDragOver ? 'text-indigo-700' : 'text-slate-800'}`}>
            {isDragOver ? 'Drop files to upload' : 'Click or Drag files here'}
         </h3>
         <p className="text-sm text-slate-500 max-w-sm">
            Upload PDFs, Spreadsheets, or Images related to this grant.
         </p>
         <p className="text-xs text-slate-400 mt-2 font-medium bg-slate-100 px-2 py-1 rounded">Max 5MB per file (Mock Mode)</p>
       </div>

       {/* File List */}
       <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
             <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <File size={18} className="text-slate-500"/> Stored Files
             </h3>
             <span className="text-xs font-medium text-slate-500">{documents?.length || 0} files</span>
          </div>
          
          {documents?.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">No documents attached to this grant yet.</div>
          ) : (
            <table className="w-full text-sm text-left">
               <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">File Name</th>
                    <th className="px-6 py-3 w-32">Size</th>
                    <th className="px-6 py-3 w-40">Uploaded</th>
                    <th className="px-6 py-3 text-right w-24">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {documents?.map(doc => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                       <td className="px-6 py-3 font-medium text-slate-700">
                          <div className="flex items-center gap-3">
                             {getIcon(doc.fileType)}
                             <span className="truncate max-w-xs" title={doc.fileName}>{doc.fileName}</span>
                          </div>
                       </td>
                       <td className="px-6 py-3 text-slate-500">{(doc.fileSize / 1024).toFixed(0)} KB</td>
                       <td className="px-6 py-3 text-slate-500">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                       <td className="px-6 py-3 text-right flex justify-end gap-2">
                          <button onClick={() => handleDownload(doc)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Download">
                             <Download size={16}/>
                          </button>
                          <button onClick={() => api.documents.delete(doc.id!)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                             <Trash2 size={16}/>
                          </button>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
          )}
       </div>
    </div>
  );
};
