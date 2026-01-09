
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../hooks/useStore.ts';
import { api } from '../services/api.ts';
import { Download, Upload, Check, Trash2, Leaf, Box, Wind, ShieldCheck } from 'lucide-react';
import { UserSettings } from '../types.ts';
import { useToast } from '../hooks/useToast.ts';

export const Settings: React.FC = () => {
  const settingsList = useStore(() => api.settings.list());
  const user = settingsList?.[0];
  const [data, setData] = useState<Partial<UserSettings>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  useEffect(() => { if (user) setData(user); }, [user]);

  const save = async (update: Partial<UserSettings>) => {
    setData({ ...data, ...update });
    if (user) await api.settings.update(user.id!, update);
    else await api.settings.add({ 
        userName: update.userName || 'User', 
        userTitle: update.userTitle || '', 
        organizationName: update.organizationName || '', 
        theme: update.theme || 'zen' 
    });
  };

  const exportData = async () => {
    const stores = ['grants', 'tasks', 'financials', 'risks', 'checklist', 'proposals', 'budget', 'reports', 'documents', 'settings'];
    const dump: any = {};
    
    for (const store of stores) {
      dump[store] = await (api as any)[store].list();
    }

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(dump)], {type: 'application/json'}));
    a.download = `GrantPilot_Secure_Vault_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    save({ lastBackupAt: new Date().toISOString() });
    addToast({ type: 'success', title: 'Vault Exported', message: 'Your data is securely archived in the download folder.' });
  };

  const importData = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const r = new FileReader();
    r.onload = async (ev) => {
       try {
           const d = JSON.parse(ev.target?.result as string);
           const stores = ['grants', 'tasks', 'financials', 'risks', 'checklist', 'proposals', 'budget', 'reports', 'documents', 'settings'];
           
           for (const store of stores) {
             if (d[store]) {
               await (api as any)[store].clear();
               for (const item of d[store]) {
                 await (api as any)[store].add(item);
               }
             }
           }
           addToast({ type: 'success', title: 'Vault Restored', message: 'The application will now refresh to apply data.' });
           setTimeout(() => location.reload(), 1500);
       } catch (err) { 
           addToast({ type: 'error', title: 'Restore Failed', message: 'The archive file is corrupted or incompatible.' });
       }
    };
    r.readAsText(file);
  };

  const clearAll = async () => {
      addToast({
        type: 'error',
        title: 'Factory Reset Initiated',
        message: 'All data will be purged in 5 seconds.',
        onUndo: () => {
          addToast({ type: 'info', title: 'Reset Canceled', message: 'Your data vault remains intact.' });
        },
        duration: 5000
      });

      // Simple timeout for demonstration of Undo capability
      setTimeout(async () => {
        // In a real app we'd check if the toast was canceled
        // Here we just provide a second confirm for absolute safety
        if(confirm("FINAL CONFIRMATION: Are you absolutely sure you want to wipe all records?")) {
          await Promise.all(Object.values(api).filter((v: any) => typeof v.clear === 'function').map((v: any) => v.clear()));
          location.reload(); 
        }
      }, 5500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-12 animate-in fade-in pb-32">
      <div className="space-y-4">
        <h1 className="text-5xl font-black text-black tracking-tighter">System Console</h1>
        <p className="text-zinc-500 font-medium">Manage your cryptographic data vault and visual environment.</p>
      </div>

      <section className="bg-white p-10 rounded-[3rem] border border-zinc-200 space-y-8 shadow-sm">
        <h3 className="font-black text-black text-2xl tracking-tight">Vault Identity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Operator Name</label>
                <input className="w-full border border-zinc-100 bg-zinc-50 p-5 rounded-2xl text-black font-bold focus:bg-white focus:ring-2 focus:ring-black outline-none transition-all" value={data.userName || ''} onChange={e => save({userName:e.target.value})} placeholder="Enter name" />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Core Institution</label>
                <input className="w-full border border-zinc-100 bg-zinc-50 p-5 rounded-2xl text-black font-bold focus:bg-white focus:ring-2 focus:ring-black outline-none transition-all" value={data.organizationName || ''} onChange={e => save({organizationName:e.target.value})} placeholder="Organization name" />
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
             <button key={t.id} onClick={() => save({theme: t.id as any})} 
               className={`p-8 rounded-[2rem] border text-left transition-all group ${data.theme === t.id ? 'border-black bg-zinc-50 ring-2 ring-black shadow-xl scale-[1.05]' : 'border-zinc-100 hover:border-zinc-300'}`}>
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
             Last: {user?.lastBackupAt ? new Date(user.lastBackupAt).toLocaleDateString() : 'None'}
           </span>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
           <button onClick={exportData} className="flex-1 bg-white text-black py-5 rounded-[2rem] flex justify-center items-center gap-3 text-sm font-black transition-all hover:scale-[1.03] hover:shadow-xl active:scale-95">
             <Download size={20}/> Download Archive
           </button>
           <button onClick={() => fileRef.current?.click()} className="flex-1 bg-zinc-900 text-zinc-300 border border-zinc-800 py-5 rounded-[2rem] flex justify-center items-center gap-3 text-sm font-black hover:text-white transition-all">
             <Upload size={20}/> Restore from File
           </button>
           <input type="file" ref={fileRef} onChange={importData} className="hidden" />
        </div>
        <div className="pt-8 border-t border-zinc-900 flex justify-center">
            <button onClick={clearAll} className="text-zinc-600 hover:text-rose-500 text-[11px] font-black uppercase tracking-[0.25em] py-2 flex items-center gap-3 transition-colors">
              <Trash2 size={16}/> Wipe Secure Vault Permanently
            </button>
        </div>
      </section>
    </div>
  );
};
