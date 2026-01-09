import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ScrollText, Settings, AlertTriangle, ArrowRight, Wind } from 'lucide-react';
import clsx from 'clsx';
import { getSettings } from '@/services/api';

const THEMES = {
  sanctuary: { n: '249 250 251', b: '229 231 235', mid: '156 163 175', text: '17 24 39', p: '244 244 245', prim: '24 24 27' }, 
  bamboo: { n: '250 250 249', b: '231 229 228', mid: '168 162 158', text: '28 25 23', p: '236 253 245', prim: '5 150 105' }, 
  zen: { n: '244 244 245', b: '212 212 216', mid: '113 113 122', text: '9 9 11', p: '9 9 11', prim: '255 255 255' },
};

export const Layout = ({ children }) => {
  const [user, setUser] = useState(null);
  const location = useLocation();
  const currentTheme = user?.theme || 'zen';
  const isZen = currentTheme === 'zen';

  useEffect(() => {
    getSettings().then(res => setUser(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = THEMES[currentTheme] || THEMES.zen;
    const root = document.documentElement.style;
    
    root.setProperty('--color-neutral-50', t.n);
    root.setProperty('--color-neutral-100', t.n);
    root.setProperty('--color-neutral-200', t.b);
    root.setProperty('--color-neutral-300', t.b);
    root.setProperty('--color-neutral-400', t.mid);
    root.setProperty('--color-neutral-500', t.mid);
    root.setProperty('--color-neutral-900', t.text);
    root.setProperty('--color-primary-500', t.prim);
    root.setProperty('--color-primary-900', t.p);
  }, [currentTheme]);

  const navClass = (path) => {
    const active = location.pathname === path;
    return clsx(
      "flex items-center gap-3 px-5 py-3.5 text-sm font-bold transition-all rounded-2xl", 
      active 
        ? (isZen ? "bg-black text-white shadow-xl scale-[1.02]" : "bg-white text-slate-900 shadow-sm border border-slate-200") 
        : "text-zinc-500 hover:bg-zinc-200/50"
    );
  };

  return (
    <div className={clsx("flex h-screen overflow-hidden", isZen ? "bg-[#f4f4f5]" : "bg-slate-50")}>
      <aside className={clsx(
        "w-64 flex flex-col border-r transition-all duration-500 shrink-0", 
        isZen ? "bg-[#f4f4f5] border-zinc-200" : "bg-slate-100 border-slate-200"
      )}>
        <div className="p-8">
          <h1 className="text-xl font-black flex gap-2 text-black items-center">
            <div className="p-1.5 bg-black rounded-lg text-white"><Wind size={18}/></div> 
            GrantPilot
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <Link to="/" className={navClass('/')} data-testid="nav-dashboard"><LayoutDashboard size={18}/><span>Dashboard</span></Link>
          <Link to="/grants" className={navClass('/grants')} data-testid="nav-grants"><ScrollText size={18}/><span>My Portfolio</span></Link>
          <Link to="/settings" className={navClass('/settings')} data-testid="nav-settings"><Settings size={18}/><span>Preferences</span></Link>
        </nav>
        <div className="p-6 border-t border-zinc-200 flex gap-3 items-center">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-black text-sm">
              {user?.user_name?.[0] || 'U'}
            </div>
            <div className="flex flex-col">
              <div className="text-sm font-black text-black leading-none">{user?.user_name || 'User'}</div>
              <div className="text-[10px] uppercase font-bold text-zinc-400 mt-1">Administrator</div>
            </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {user?.last_backup_at && (new Date().getTime() - new Date(user.last_backup_at).getTime()) / 86400000 > 7 && (
            <div className="bg-black text-white px-8 py-3 flex justify-between text-xs shrink-0 items-center">
                <span className="flex items-center gap-2 font-bold uppercase tracking-widest"><AlertTriangle size={14} className="text-amber-400"/> System: Backup Recommended</span>
                <Link to="/settings" className="font-black underline flex items-center gap-1">Configure <ArrowRight size={12}/></Link>
            </div>
        )}
        <div className="flex-1 overflow-auto p-6 md:p-12">{children}</div>
      </main>
    </div>
  );
};
