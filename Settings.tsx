
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { api } from '../services/api';
import { Download, Upload, Check, Trash2, Leaf, Box } from 'lucide-react';
import { UserSettings } from '../types';

export const Settings: React.FC = () => {
  const settingsList = useStore(() => api.settings.list());
  const user = settingsList?.[0];
  const [data, setData] = useState<Partial<UserSettings>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (user) setData(user); }, [user]);

  const save = async (update: Partial<UserSettings>) => {
    setData({ ...data, ...update });
    if (user) await api.settings.update(user.id!, update);
    else await api.settings.add({ 
        userName: update.userName || 'User', 
        userTitle: update.userTitle || '', 
        organizationName: update.organizationName || '', 
        theme: update.theme || 'sanctuary' 
    });
  };

  const exportData = async () => {
    // For the mock API, we can just grab the localStorage items
    // In production (Vercel), this would call an endpoint like /api/backup
    const keys = ['gp_grants', 'gp_tasks', 'gp_financials', 'gp_risks', 'gp_checklist', 'gp_proposals', 'gp_budget', 'gp_reports', 'gp_documents', 'gp_settings'];
    const dump: any = {};
    keys.forEach(k => {
        dump[k] = localStorage.getItem(k);
    });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(dump)], {type: 'application/json'}));
    a.download = `GP_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    save({ lastBackupAt: new Date().toISOString() });
  };

  const importData = async (e: any) => {
    if(!e.target.files[0] || !confirm("Overwrite current data?")) return;
    const r = new FileReader();
    r.onload = async (ev) => {
       try {
           const d = JSON.parse(ev.target?.result as string);
           const keys = ['gp_grants', 'gp_tasks', 'gp_financials', 'gp_risks', 'gp_checklist', 'gp_proposals', 'gp_budget', 'gp_reports', 'gp_documents', 'gp_settings'];
           keys.forEach(k => {
               if(d[k]) localStorage.setItem(k, d[k]);
           });
           location.reload();
       } catch (err) {
           alert("Invalid backup file.");
       }
    };
    r.readAsText(e.target.files[0]);
  };

  const clearAll = async () => {
      if(confirm("Are you sure you want to delete all data? This cannot be undone.")) { 
          // Clear all mock stores
          await Promise.all(Object.values(api).filter((v: any) => typeof v.clear === 'function').map((v: any) => v.clear()));
          location.reload(); 
      }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in fade-in pb-20">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <section className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 shadow-sm">
        <h3 className="font-bold text-slate-900">Profile</h3>
        <div className="space-y-3">
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Your Name</label>
                <input className="w-full border border-slate-200 p-2.5 rounded-lg text-slate-900" value={data.userName || ''} onChange={e => save({userName:e.target.value})} placeholder="Name" />
            </div>
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Organization</label>
                <input className="w-full border border-slate-200 p-2.5 rounded-lg text-slate-900" value={data.organizationName || ''} onChange={e => save({organizationName:e.target.value})} placeholder="Organization" />
            </div>
        </div>
      </section>

      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-4">Appearance</h3>
        <div className="grid grid-cols-2 gap-4">
           {[
             {id: 'sanctuary', label: 'Sanctuary', icon: Box, desc: 'Clean & Minimal'},
             {id: 'bamboo', label: 'Bamboo', icon: Leaf, desc: 'Natural & Calm'}
           ].map(t => (
             <button key={t.id} onClick={() => save({theme: t.id as any})} 
               className={`p-4 rounded-xl border text-left transition-all ${data.theme === t.id ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 hover:bg-slate-50'}`}>
                <div className="flex justify-between mb-2">
                   <t.icon className={data.theme === t.id ? 'text-indigo-600' : 'text-slate-400'} size={20} />
                   {data.theme === t.id && <Check size={18} className="text-indigo-600"/>}
                </div>
                <div className="font-bold text-sm text-slate-900">{t.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{t.desc}</div>
             </button>
           ))}
        </div>
      </section>

      <section className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 shadow-sm">
        <div className="flex justify-between items-center">
           <h3 className="font-bold text-slate-900">Data Management</h3>
           <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">Last Backup: {user?.lastBackupAt ? new Date(user.lastBackupAt).toLocaleDateString() : 'Never'}</span>
        </div>
        <div className="flex gap-3">
           <button onClick={exportData} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-lg flex justify-center items-center gap-2 text-sm font-medium transition-colors"><Download size={16}/> Backup Data</button>
           <button onClick={() => fileRef.current?.click()} className="flex-1 border border-slate-200 py-2.5 rounded-lg flex justify-center items-center gap-2 text-sm font-medium hover:bg-slate-50 text-slate-700 transition-colors"><Upload size={16}/> Restore Data</button>
           <input type="file" ref={fileRef} onChange={importData} className="hidden" />
        </div>
        <div className="pt-4 border-t border-slate-100">
            <button onClick={clearAll} className="w-full text-red-600 text-xs py-2 hover:bg-red-50 rounded-lg flex justify-center items-center gap-2 transition-colors"><Trash2 size={14}/> Reset Application & Clear All Data</button>
        </div>
      </section>
    </div>
  );
};
