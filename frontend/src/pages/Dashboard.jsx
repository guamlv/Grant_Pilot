import React, { useState, useEffect } from 'react';
import { getDashboard, getCalendarEvents, getGrants } from '@/services/api';
import { downloadICS } from '@/services/calendar';
import { Link } from 'react-router-dom';
import { 
  CalendarDays, 
  AlertTriangle, 
  TrendingUp, 
  Clock,
  FileText,
  CheckCircle,
  ArrowRight,
  Download
} from 'lucide-react';

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboard(), getGrants()])
      .then(([dashRes, grantsRes]) => {
        setData(dashRes.data);
        setGrants(grantsRes.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleExportCalendar = async () => {
    const res = await getCalendarEvents();
    downloadICS(res.data.events);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full"></div></div>;
  }

  const urgentDeadlines = data?.upcoming_deadlines?.filter(d => d.days_left <= 14) || [];
  const activeGrants = grants.filter(g => g.stage === 'awarded');

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Your grant management overview</p>
        </div>
        <button 
          onClick={handleExportCalendar}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          data-testid="export-calendar-btn"
        >
          <Download size={16} /> Export Calendar
        </button>
      </div>

      {/* Alerts */}
      {data?.overdue_count > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="text-red-500" size={20} />
          <div>
            <p className="font-medium text-red-900">{data.overdue_count} overdue item(s)</p>
            <p className="text-red-700 text-sm">Reports or compliance requirements past due</p>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
            <TrendingUp size={14} /> IN PIPELINE
          </div>
          <p className="text-2xl font-bold text-gray-900">{data?.in_progress || 0}</p>
          <p className="text-xs text-gray-500">${(data?.total_pending || 0).toLocaleString()} pending</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
            <CheckCircle size={14} /> AWARDED
          </div>
          <p className="text-2xl font-bold text-green-600">{data?.active_grants || 0}</p>
          <p className="text-xs text-gray-500">${(data?.total_awarded || 0).toLocaleString()} total</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
            <Clock size={14} /> DUE SOON
          </div>
          <p className="text-2xl font-bold text-amber-600">{urgentDeadlines.length}</p>
          <p className="text-xs text-gray-500">within 14 days</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
            <FileText size={14} /> SUCCESS RATE
          </div>
          <p className="text-2xl font-bold text-gray-900">{data?.success_rate || 0}%</p>
          <p className="text-xs text-gray-500">awarded/decided</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <CalendarDays size={18} /> Upcoming Deadlines
            </h2>
            <span className="text-xs text-gray-400">{data?.upcoming_deadlines?.length || 0} total</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {data?.upcoming_deadlines?.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No upcoming deadlines</div>
            ) : (
              data?.upcoming_deadlines?.slice(0, 8).map((d, i) => (
                <div key={i} className="p-3 hover:bg-gray-50 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${d.days_left <= 7 ? 'bg-red-500' : d.days_left <= 14 ? 'bg-amber-500' : 'bg-green-500'}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{d.title}</p>
                    <p className="text-xs text-gray-500">
                      {d.type === 'application' ? 'Application' : d.type === 'report' ? `${d.report_type} Report` : 'Compliance'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${d.days_left <= 7 ? 'text-red-600' : 'text-gray-600'}`}>
                      {d.days_left}d
                    </p>
                    <p className="text-xs text-gray-400">{d.date}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Grants */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-semibold text-gray-900">Active Grants</h2>
            <Link to="/pipeline" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {activeGrants.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No active grants yet</div>
            ) : (
              activeGrants.slice(0, 6).map(g => (
                <Link key={g.id} to={`/grants/${g.id}`} className="p-3 hover:bg-gray-50 flex items-center justify-between block">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{g.title}</p>
                    <p className="text-xs text-gray-500">{g.funder_name}</p>
                  </div>
                  <p className="text-sm font-semibold text-green-600">${(g.amount_awarded || 0).toLocaleString()}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pipeline Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="font-semibold text-gray-900 mb-4">Pipeline Summary</h2>
        <div className="flex gap-2">
          {['researching', 'writing', 'submitted', 'pending', 'awarded', 'declined'].map(stage => (
            <div key={stage} className="flex-1 text-center">
              <div className={`h-2 rounded-full mb-2 ${
                stage === 'awarded' ? 'bg-green-500' :
                stage === 'declined' ? 'bg-red-300' :
                stage === 'submitted' || stage === 'pending' ? 'bg-blue-400' :
                'bg-gray-300'
              }`} style={{opacity: data?.pipeline?.[stage] > 0 ? 1 : 0.3}}></div>
              <p className="text-lg font-bold text-gray-900">{data?.pipeline?.[stage] || 0}</p>
              <p className="text-xs text-gray-500 capitalize">{stage}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
