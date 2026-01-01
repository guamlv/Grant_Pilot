
import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ScrollText, Feather, Settings, AlertTriangle, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../hooks/useStore';
import { api } from '../services/api';

// Simplified Themes
const THEMES: Record<string, any> = {
  sanctuary: { n: '249 250 251', b: '229 231 235', mid: '156 163 175', text: '17 24 39', p: '244 244 245', prim: '24 24 27' }, 
  bamboo: { n: '250 250 249', b: '231 229 228', mid: '168 162 158', text: '28 25 23', p: '236 253 245', prim: '5 150 105' }, 
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const settingsList = useStore(() => api.settings.list());
  const user = settingsList?.[0];
  const isBamboo = user?.theme === 'bamboo';

  useEffect(() => {
    const t = THEMES[user?.theme || 'sanctuary'] || THEMES.sanctuary;
    const root = document.documentElement.style;
    ['50','100'].forEach(s => root.setProperty(`--color-neutral-${s}`, t.n));
    ['200','300'].forEach(s => root.setProperty(`--color-neutral-${s}`, t.b));
    ['400','500','600'].forEach(s => root.setProperty(`--color-neutral-${s}`, t.mid));
    ['700','800','850','900','950'].forEach(s => root.setProperty(`--color-neutral-${s}`, t.text));
    ['50','100','200'].forEach(s => root.setProperty(`--color-primary-${s}`, t.p));
    ['300','400','500','600','700','800','900','950'].forEach(s => root.setProperty(`--color-primary-${s}`, t.prim));
  }, [user?.theme]);

  const navClass = (path: string) => {
    const active = useLocation().pathname === path;
    return clsx("flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all rounded-lg", 
      active ? (isBamboo ? "bg-emerald-600 text-white shadow-md" : "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200") 
             : "text-slate-500 hover:bg-slate-200/50");
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside className={clsx("w-56 flex flex-col border-r transition-colors duration-300", isBamboo ? "bg-[#fcfbf9] border-[#e7e5e4]" : "bg-slate-100 border-slate-200")}>
        <div className="p-6">
          <h1 className="text-xl font-bold flex gap-2 text-slate-900"><Feather className="text-indigo-600"/> GrantPilot</h1>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          <Link to="/" className={navClass('/')}><LayoutDashboard size={18}/><span>Dashboard</span></Link>
          <Link to="/grants" className={navClass('/grants')}><ScrollText size={18}/><span>My Grants</span></Link>
          <Link to="/settings" className={navClass('/settings')}><Settings size={18}/><span>Settings</span></Link>
        </nav>
        <div className="p-4 border-t border-slate-200 flex gap-3 items-center">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">{user?.userName?.[0] || 'U'}</div>
            <div className="text-sm font-medium text-slate-900">{user?.userName || 'User'}</div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {user?.lastBackupAt && (new Date().getTime() - new Date(user.lastBackupAt).getTime()) / 86400000 > 7 && (
            <div className="bg-amber-50 border-b border-amber-200 px-8 py-2 flex justify-between text-xs text-amber-800">
                <span className="flex gap-2"><AlertTriangle size={14}/> Backup recommended.</span>
                <Link to="/settings" className="font-bold flex gap-1">Go to Settings <ArrowRight size={12}/></Link>
            </div>
        )}
        <div className="flex-1 overflow-auto p-8">{children}</div>
      </main>
    </div>
  );
};
