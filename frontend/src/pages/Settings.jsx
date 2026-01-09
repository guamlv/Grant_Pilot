import React, { useState, useRef, useEffect } from 'react';
import { getSettings, updateSettings, exportData, importData, clearAllData } from '@/services/api';
import { Download, Upload, Check, Trash2, Leaf, Box, Wind, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export const Settings = () => {
  const [user, setUser] = useState(null);
  const [data, setData] = useState({});
  const fileRef = useRef(null);
  const { addToast } = useToast();

  useEffect(() => {
    getSettings().then(res => {
      setUser(res.data);
      setData(res.data);
    }).catch(() => {});
  }, []);

  const save = async (update) => {
    const newData = { ...data, ...update };
    setData(newData);
    await updateSettings(update);
  };

  const handleExport = async () => {
    try {
      const res = await exportData();
      const blob = new Blob([JSON.stringify(res.data)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `GrantPilot_Secure_Vault_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      save({ last_backup_at: new Date().toISOString() });
      addToast({ type: 'success', title: 'Vault Exported', message: 'Your data is securely archived in the download folder.' });
    } catch (e) {
      addToast({ type: 'error', title: 'Export Failed', message: 'Could not export data.' });
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
       try {
           const importedData = JSON.parse(ev.target?.result);
           await importData(importedData);
           addToast({ type: 'success', title: 'Vault Restored', message: 'The application will now refresh to apply data.' });
           setTimeout(() => window.location.reload(), 1500);
       } catch (err) { 
           addToast({ type: 'error', title: 'Restore Failed', message: 'The archive file is corrupted or incompatible.' });
       }
    };
    reader.readAsText(file);
  };

  const handleClearAll = async () => {
      if (!window.confirm('Are you absolutely sure you want to wipe all records? This cannot be undone.')) {
        return;
      }
      
      try {
        await clearAllData();
        addToast({ type: 'success', title: 'Factory Reset Complete', message: 'All data has been purged.' });
        setTimeout(() => window.location.reload(), 1500);
      } catch (e) {
        addToast({ type: 'error', title: 'Reset Failed', message: 'Could not clear data.' });
      }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-12 animate-in fade-in pb-32" data-testid="settings-page">
      <div className="space-y-4">
        <h1 className="text-5xl font-black text-black tracking-tighter">System Console</h1>
        <p className="text-zinc-500 font-medium">Manage your cryptographic data vault and visual environment.</p>
      </div>

      <section className="bg-white p-10 rounded-[3rem] border border-zinc-200 space-y-8 shadow-sm">
        <h3 className="font-black text-black text-2xl tracking-tight">Vault Identity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Operator Name</label>
                <input 
                  className="w-full border border-zinc-100 bg-zinc-50 p-5 rounded-2xl text-black font-bold focus:bg-white focus:ring-2 focus:ring-black outline-none transition-all" 
                  value={data.user_name || ''} 
                  onChange={e => save({ user_name: e.target.value })} 
                  placeholder="Enter name"
                  data-testid="user-name-input"
                />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Core Institution</label>
                <input 
                  className="w-full border border-zinc-100 bg-zinc-50 p-5 rounded-2xl text-black font-bold focus:bg-white focus:ring-2 focus:ring-black outline-none transition-all" 
                  value={data.organization_name || ''} 
                  onChange={e => save({ organization_name: e.target.value })} 
                  placeholder="Organization name"
                  data-testid="org-name-input"
                />
            </div>
        </div>
      </section>

      <section className="bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm">
        <h3 className="font-black text-black text-2xl tracking-tight mb-8">Environment Theme</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[
             {id: 'zen', label: 'Zen', icon: Wind, desc: 'Carbon & Zinc'},
             {id: 'sanctuary', label: 'Classic', icon: Box, desc: 'Steel Clean'},
             {id: 'bamboo', label: 'Living', icon: Leaf, desc: 'Organic Mint'}
           ].map(t => (
             <button 
               key={t.id} 
               onClick={() => save({ theme: t.id })} 
               className={`p-8 rounded-[2rem] border text-left transition-all group ${data.theme === t.id ? 'border-black bg-zinc-50 ring-2 ring-black shadow-xl scale-[1.05]' : 'border-zinc-100 hover:border-zinc-300'}`}
               data-testid={`theme-${t.id}`}
             >
                <div className="flex justify-between mb-6">
                   <t.icon className={data.theme === t.id ? 'text-black' : 'text-zinc-300 group-hover:text-zinc-500'} size={28} />
                   {data.theme === t.id && <Check size={20} className="text-black"/>}
                </div>
                <div className="font-black text-lg text-black tracking-tight">{t.label}</div>
                <div className="text-[10px] font-bold text-zinc-400 uppercase mt-2 tracking-widest">{t.desc}</div>
             </button>
           ))}
        </div>
      </section>

      <section className="bg-black p-10 rounded-[3.5rem] shadow-2xl text-white space-y-8">
        <div className="flex justify-between items-center">
           <div className="flex items-center gap-4">
             <div className="p-3 bg-zinc-800 rounded-2xl text-emerald-400"><ShieldCheck size={24}/></div>
             <div>
                <h3 className="font-black text-2xl tracking-tight leading-none">Secure Archive</h3>
                <p className="text-zinc-500 text-xs mt-2 font-bold uppercase tracking-widest">End-to-end Local Persistence</p>
             </div>
           </div>
           <span className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em] bg-zinc-900 px-4 py-2 rounded-full">
             Last: {user?.last_backup_at ? new Date(user.last_backup_at).toLocaleDateString() : 'None'}
           </span>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
           <button onClick={handleExport} className="flex-1 bg-white text-black py-5 rounded-[2rem] flex justify-center items-center gap-3 text-sm font-black transition-all hover:scale-[1.03] hover:shadow-xl active:scale-95" data-testid="export-btn">
             <Download size={20}/> Download Archive
           </button>
           <button onClick={() => fileRef.current?.click()} className="flex-1 bg-zinc-900 text-zinc-300 border border-zinc-800 py-5 rounded-[2rem] flex justify-center items-center gap-3 text-sm font-black hover:text-white transition-all" data-testid="import-btn">
             <Upload size={20}/> Restore from File
           </button>
           <input type="file" ref={fileRef} onChange={handleImport} className="hidden" accept=".json" />
        </div>
        <div className="pt-8 border-t border-zinc-900 flex justify-center">
            <button onClick={handleClearAll} className="text-zinc-600 hover:text-rose-500 text-[11px] font-black uppercase tracking-[0.25em] py-2 flex items-center gap-3 transition-colors" data-testid="clear-all-btn">
              <Trash2 size={16}/> Wipe Secure Vault Permanently
            </button>
        </div>
      </section>
    </div>
  );
};
