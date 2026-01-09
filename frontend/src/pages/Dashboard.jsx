import React, { useState, useEffect, useMemo } from 'react';
import { getGrants, getTasks, getSettings, seedData } from '@/services/api';
import { MetricCard } from '@/components/MetricCard';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  Bell, 
  CalendarPlus, 
  BarChart3, 
  Wind
} from 'lucide-react';
import { generateICSFile } from '@/services/calendarService';

export const Dashboard = () => {
  const [grants, setGrants] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Try to seed data first (will only seed if empty)
        await seedData();
        
        const [grantsRes, tasksRes, settingsRes] = await Promise.all([
          getGrants(),
          getTasks(),
          getSettings()
        ]);
        setGrants(grantsRes.data || []);
        setTasks(tasksRes.data || []);
        setUser(settingsRes.data);
      } catch (e) {
        console.error('Failed to load dashboard data:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const isZen = user?.theme === 'zen';
  
  const stats = useMemo(() => {
    const active = grants.filter(g => g.status === 'Awarded');
    const totalAwarded = active.reduce((acc, g) => acc + g.award_amount, 0);
    const pendingTasks = tasks.filter(t => !t.is_completed).length;
    const closed = grants.filter(g => ['Awarded', 'Declined', 'Closed'].includes(g.status));
    const winRate = closed.length > 0 ? Math.round((grants.filter(g => g.status === 'Awarded').length / closed.length) * 100) : 0;

    return { totalAwarded, activeCount: active.length, pendingTasks, winRate };
  }, [grants, tasks]);

  const notifications = useMemo(() => {
    const alerts = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    grants.forEach(g => {
      if (!g.deadline || ['Closed', 'Declined'].includes(g.status)) return;
      const diff = Math.ceil((new Date(g.deadline).getTime() - now.getTime()) / 86400000);
      if (diff >= 0 && diff <= 30) {
        alerts.push({ id: `g-${g.id}`, title: g.title, subtitle: 'Deadline approaching', daysLeft: diff, priority: diff <= 7 ? 'high' : 'medium', link: `/grants/${g.id}` });
      }
    });

    return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [grants]);

  const handleSyncSchedule = () => {
    const events = grants
      .filter(g => g.deadline && !['Closed', 'Declined'].includes(g.status))
      .map(g => ({
        title: g.title,
        description: `Grant deadline for ${g.funder}`,
        date: g.deadline,
        type: 'Deadline'
      }));
    generateICSFile(events);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700" data-testid="dashboard">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tighter">Zen Overview</h1>
          <p className="text-zinc-500 mt-2 font-medium">Harmonizing your funding landscape.</p>
        </div>
        <button onClick={handleSyncSchedule} className="px-6 py-3 bg-black text-white rounded-2xl text-sm font-black hover:scale-105 transition-all shadow-xl flex items-center gap-3" data-testid="sync-schedule-btn">
          <CalendarPlus size={18} /> <span>Sync Schedule</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <MetricCard label="Total Awarded" value={`$${(stats.totalAwarded / 1000000).toFixed(1)}M`} variant="dark" />
        <MetricCard label="Active Portfolio" value={stats.activeCount} />
        <MetricCard label="Open Actions" value={stats.pendingTasks} status={stats.pendingTasks > 5 ? 'warning' : 'neutral'} />
        <MetricCard label="Efficiency" value={`${stats.winRate}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-zinc-200/50 border border-zinc-200 overflow-hidden">
            <div className="px-10 py-8 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="font-black text-xl text-black flex items-center gap-3">
                <BarChart3 size={24} className="text-zinc-400" />
                Active Grants
              </h3>
              <Link to="/grants" className="text-xs font-black text-zinc-400 uppercase tracking-widest hover:text-black transition-colors">Full Library</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-zinc-400 uppercase font-black tracking-widest border-b border-zinc-50">
                  <tr>
                    <th className="px-10 py-5">Grant Title</th>
                    <th className="px-10 py-5">Funder</th>
                    <th className="px-10 py-5 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {grants.slice(0, 5).map(g => (
                    <tr key={g.id} className="hover:bg-zinc-50/50 transition-colors group">
                      <td className="px-10 py-6 font-black text-black">
                        <Link to={`/grants/${g.id}`} className="group-hover:translate-x-1 inline-block transition-transform">{g.title}</Link>
                      </td>
                      <td className="px-10 py-6 text-zinc-500 font-medium">{g.funder}</td>
                      <td className="px-10 py-6 font-black text-right">${(g.award_amount / 1000).toFixed(0)}k</td>
                    </tr>
                  ))}
                  {grants.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-10 py-12 text-center text-zinc-400 font-bold">
                        No grants yet. <Link to="/grants" className="text-black underline">Create your first grant</Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-black rounded-[2.5rem] shadow-2xl border border-zinc-800 overflow-hidden h-full flex flex-col">
            <div className="px-8 py-8 border-b border-zinc-800 flex items-center gap-3">
              <div className="p-2 bg-zinc-800 rounded-xl text-white"><Bell size={20} /></div>
              <h3 className="font-black text-xl text-white">System Alerts</h3>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[400px] flex-1">
              {notifications.length === 0 ? (
                <div className="py-20 text-center">
                  <CheckCircle2 size={48} className="mx-auto text-zinc-800 mb-4" />
                  <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Everything is balanced.</p>
                </div>
              ) : (
                notifications.map(n => (
                  <Link key={n.id} to={n.link} className="block p-5 rounded-3xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-black text-white truncate pr-2">{n.title}</h4>
                      <span className="text-[10px] font-black uppercase text-zinc-500 whitespace-nowrap">
                        {n.daysLeft}d
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 font-medium">{n.subtitle}</p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
