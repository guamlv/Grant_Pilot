
import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import { api } from '../services/api';
import { MetricCard } from '../components/MetricCard';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, Bell, AlertCircle, Calendar, CalendarPlus } from 'lucide-react';
import { generateICSFile } from '../services/calendarService';

export const Dashboard: React.FC = () => {
  const grants = useStore(() => api.grants.list());
  const tasks = useStore(() => api.tasks.list());
  
  const [stats, setStats] = useState({
    totalAwarded: 0,
    activeGrants: 0,
    pendingTasks: 0,
    winRate: 0
  });

  useEffect(() => {
    if (grants && tasks) {
      const awarded = grants.filter(g => g.status === 'Awarded');
      const declined = grants.filter(g => g.status === 'Declined');
      const totalClosed = awarded.length + declined.length;

      setStats({
        totalAwarded: awarded.reduce((acc, g) => acc + g.awardAmount, 0),
        activeGrants: awarded.length,
        pendingTasks: tasks.filter(t => !t.isCompleted).length,
        winRate: totalClosed > 0 ? Math.round((awarded.length / totalClosed) * 100) : 0
      });
    }
  }, [grants, tasks]);

  // Notification Logic
  const notifications = useMemo(() => {
    if (!grants || !tasks) return [];
    
    const alerts: Array<{
      id: string;
      type: 'grant' | 'task';
      title: string;
      subtitle: string;
      date: string;
      daysLeft: number;
      priority: 'high' | 'medium';
      link: string;
    }> = [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // 1. Check Grant Deadlines (Next 30 days)
    grants.forEach(g => {
      if (g.status === 'Closed' || g.status === 'Declined' || !g.deadline) return;
      
      const d = new Date(g.deadline);
      d.setHours(0, 0, 0, 0);
      const diffTime = d.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= 30) {
        alerts.push({
          id: `g-${g.id}`,
          type: 'grant',
          title: g.title,
          subtitle: g.status === 'Awarded' ? 'Grant Renewal / End Date' : 'Application Deadline',
          date: g.deadline,
          daysLeft: diffDays,
          priority: diffDays <= 7 ? 'high' : 'medium',
          link: `/grants/${g.id}`
        });
      }
    });

    // 2. Check Task Due Dates (Next 14 days)
    tasks.forEach(t => {
      if (t.isCompleted || !t.dueDate) return;
      
      const d = new Date(t.dueDate);
      d.setHours(0, 0, 0, 0);
      const diffTime = d.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= 14) {
        const grant = grants.find(g => g.id === t.grantId);
        alerts.push({
          id: `t-${t.id}`,
          type: 'task',
          title: t.description,
          subtitle: grant ? `Task for: ${grant.title}` : 'General Task',
          date: t.dueDate,
          daysLeft: diffDays,
          priority: diffDays <= 3 ? 'high' : 'medium',
          link: grant ? `/grants/${grant.id}` : '#'
        });
      }
    });

    return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [grants, tasks]);

  const handleSyncCalendar = () => {
    if(!notifications || notifications.length === 0) return;
    
    const events = notifications.map(n => ({
        title: n.title,
        description: n.subtitle,
        date: n.date,
        type: n.type === 'grant' ? 'Deadline' as const : 'Task' as const
    }));

    generateICSFile(events);
  };

  if (!grants) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Grant Portfolio</h1>
        <p className="text-slate-500">Overview of funding, applications, and compliance tasks.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard 
          label="Total Awarded" 
          value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(stats.totalAwarded)}
          status="success"
        />
        <MetricCard 
          label="Active Grants" 
          value={stats.activeGrants}
          subValue="Currently Managing"
          status="neutral"
        />
        <MetricCard 
          label="Pending Tasks" 
          value={stats.pendingTasks}
          status={stats.pendingTasks > 5 ? 'danger' : 'warning'}
        />
         <MetricCard 
          label="Win Rate" 
          value={`${stats.winRate}%`}
          subValue="Awarded / Total Closed"
          status="neutral"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notifications Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
            <Bell className="text-indigo-600" size={20} />
            <h3 className="font-semibold text-slate-800">Upcoming Deadlines</h3>
            <span className="ml-auto flex items-center gap-2">
                <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  {notifications.length} Alert{notifications.length !== 1 ? 's' : ''}
                </span>
                {notifications.length > 0 && (
                   <button onClick={handleSyncCalendar} className="text-slate-400 hover:text-indigo-600" title="Sync to Calendar">
                      <CalendarPlus size={18} />
                   </button>
                )}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px] p-2 space-y-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                <CheckCircle2 size={32} className="mb-2 text-slate-300" />
                <p className="text-sm">No upcoming deadlines.</p>
              </div>
            ) : (
              notifications.map(alert => (
                <Link 
                  to={alert.link} 
                  key={alert.id} 
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    alert.priority === 'high' 
                      ? 'bg-red-50 text-red-600' 
                      : 'bg-amber-50 text-amber-600'
                  }`}>
                    {alert.priority === 'high' ? <AlertCircle size={20} /> : <Clock size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className={`text-sm font-semibold truncate pr-2 ${alert.priority === 'high' ? 'text-red-700' : 'text-slate-800'}`}>
                        {alert.title}
                      </h4>
                      <span className={`text-xs font-bold whitespace-nowrap ${
                         alert.priority === 'high' ? 'text-red-600' : 'text-amber-600'
                      }`}>
                        {alert.daysLeft === 0 ? 'Today' : `${alert.daysLeft} day${alert.daysLeft === 1 ? '' : 's'}`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{alert.subtitle}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar size={10} className="text-slate-400" />
                      <span className="text-xs text-slate-400">{new Date(alert.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all" />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Grants Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-semibold text-slate-800">Recent Grants</h3>
            <Link to="/grants" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View All <ArrowRight size={16} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[400px]">
            {grants.slice(0, 5).map(grant => (
              <div key={grant.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                    {grant.title.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 line-clamp-1">{grant.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-1">Funder: {grant.funder}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs text-slate-400">Amount</div>
                    <div className="font-mono text-sm font-medium">
                      ${(grant.awardAmount / 1000).toFixed(0)}k
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                    grant.status === 'Awarded' ? 'bg-green-100 text-green-700' : 
                    grant.status === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {grant.status}
                  </span>
                  <Link 
                    to={`/grants/${grant.id}`} 
                    className="p-2 text-slate-400 hover:text-indigo-600"
                  >
                    <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
