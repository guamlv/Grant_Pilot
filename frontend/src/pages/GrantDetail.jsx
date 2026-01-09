import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  getGrant, updateGrant, deleteGrant,
  getReporting, createReporting, updateReporting, deleteReporting,
  getCompliance, createCompliance, updateCompliance, deleteCompliance,
  extractAward
} from '@/services/api';
import { 
  ArrowLeft, Upload, FileText, AlertCircle, CheckCircle, Clock, Trash2, Plus,
  Calendar, DollarSign, Building, Loader2
} from 'lucide-react';

const REPORT_TYPES = ['financial', 'narrative', 'progress', 'final', 'audit', 'other'];
const FREQUENCIES = ['one-time', 'monthly', 'quarterly', 'semi-annual', 'annual'];

export const GrantDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [grant, setGrant] = useState(null);
  const [reports, setReports] = useState([]);
  const [compliance, setCompliance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [tab, setTab] = useState('overview');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [reportForm, setReportForm] = useState({ report_type: 'financial', title: '', due_date: '', frequency: 'one-time', description: '' });
  const [complianceForm, setComplianceForm] = useState({ requirement: '', category: 'other', deadline: '' });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [grantRes, reportsRes, compRes] = await Promise.all([
        getGrant(id),
        getReporting(id),
        getCompliance(id)
      ]);
      setGrant(grantRes.data);
      setReports(reportsRes.data || []);
      setCompliance(compRes.data || []);
    } catch (e) {
      navigate('/pipeline');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGrant = async (field, value) => {
    await updateGrant(id, { [field]: value });
    setGrant({ ...grant, [field]: value });
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this grant and all associated data?')) {
      await deleteGrant(id);
      navigate('/pipeline');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtracting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result;
        const res = await extractAward({
          grant_id: id,
          base64_data: base64,
          mime_type: file.type,
          filename: file.name
        });
        
        alert(`Extracted ${res.data.created_reports} reporting requirements and ${res.data.created_compliance} compliance items`);
        loadData();
      };
      reader.readAsDataURL(file);
    } catch (e) {
      alert('Failed to extract: ' + e.message);
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleAddReport = async () => {
    if (!reportForm.title || !reportForm.due_date) return;
    await createReporting({ ...reportForm, grant_id: id });
    setShowReportModal(false);
    setReportForm({ report_type: 'financial', title: '', due_date: '', frequency: 'one-time', description: '' });
    loadData();
  };

  const handleAddCompliance = async () => {
    if (!complianceForm.requirement) return;
    await createCompliance({ ...complianceForm, grant_id: id });
    setShowComplianceModal(false);
    setComplianceForm({ requirement: '', category: 'other', deadline: '' });
    loadData();
  };

  const handleReportStatus = async (report, status) => {
    const submitted = status === 'submitted' ? new Date().toISOString().split('T')[0] : '';
    await updateReporting(report.id, status, submitted);
    loadData();
  };

  const handleComplianceToggle = async (item) => {
    await updateCompliance(item.id, !item.is_completed);
    loadData();
  };

  if (loading || !grant) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" size={24} /></div>;
  }

  const upcomingReports = reports.filter(r => r.status === 'upcoming' || r.status === 'in-progress');
  const pendingCompliance = compliance.filter(c => !c.is_completed);

  return (
    <div className="space-y-6" data-testid="grant-detail">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/pipeline" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
            <ArrowLeft size={14} /> Back to Pipeline
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{grant.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            {grant.funder_name && <span className="flex items-center gap-1"><Building size={14} /> {grant.funder_name}</span>}
            {grant.amount_awarded > 0 && <span className="flex items-center gap-1 text-green-600 font-medium"><DollarSign size={14} /> ${grant.amount_awarded.toLocaleString()} awarded</span>}
            {grant.deadline && <span className="flex items-center gap-1"><Calendar size={14} /> Deadline: {grant.deadline}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={grant.stage}
            onChange={(e) => handleUpdateGrant('stage', e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium"
          >
            {['researching', 'writing', 'submitted', 'pending', 'awarded', 'declined', 'closed'].map(s => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>
          <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Upload Award Document */}
      {grant.stage === 'awarded' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="text-blue-500" size={20} />
              <div>
                <p className="font-medium text-blue-900">Upload Award Document</p>
                <p className="text-sm text-blue-700">AI will extract reporting requirements and compliance deadlines</p>
              </div>
            </div>
            <div>
              <input type="file" ref={fileRef} onChange={handleFileUpload} accept=".pdf,.txt,.doc,.docx" className="hidden" />
              <button 
                onClick={() => fileRef.current?.click()} 
                disabled={extracting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                data-testid="upload-award-btn"
              >
                {extracting ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                {extracting ? 'Extracting...' : 'Upload & Extract'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {['overview', 'reporting', 'compliance'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                tab === t ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              data-testid={`tab-${t}`}
            >
              {t}
              {t === 'reporting' && upcomingReports.length > 0 && (
                <span className="ml-2 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">{upcomingReports.length}</span>
              )}
              {t === 'compliance' && pendingCompliance.length > 0 && (
                <span className="ml-2 bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full">{pendingCompliance.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">Grant Details</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Amount Requested</label>
                <input
                  type="number"
                  value={grant.amount_requested || ''}
                  onChange={(e) => handleUpdateGrant('amount_requested', parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Amount Awarded</label>
                <input
                  type="number"
                  value={grant.amount_awarded || ''}
                  onChange={(e) => handleUpdateGrant('amount_awarded', parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Grant Period Start</label>
                  <input
                    type="date"
                    value={grant.grant_period_start || ''}
                    onChange={(e) => handleUpdateGrant('grant_period_start', e.target.value)}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Grant Period End</label>
                  <input
                    type="date"
                    value={grant.grant_period_end || ''}
                    onChange={(e) => handleUpdateGrant('grant_period_end', e.target.value)}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Notes</label>
                <textarea
                  value={grant.notes || ''}
                  onChange={(e) => handleUpdateGrant('notes', e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm h-24"
                  placeholder="Add notes about this grant..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{reports.length}</p>
                  <p className="text-xs text-gray-500">Reports Required</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{compliance.length}</p>
                  <p className="text-xs text-gray-500">Compliance Items</p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">{upcomingReports.length}</p>
                  <p className="text-xs text-gray-500">Reports Pending</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{pendingCompliance.length}</p>
                  <p className="text-xs text-gray-500">Compliance Pending</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reporting Tab */}
      {tab === 'reporting' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{reports.length} reporting requirements</p>
            <button 
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
              data-testid="add-report-btn"
            >
              <Plus size={14} /> Add Report
            </button>
          </div>

          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
                <FileText size={32} className="mx-auto mb-2 text-gray-300" />
                <p>No reporting requirements yet</p>
                <p className="text-sm">Upload an award document or add manually</p>
              </div>
            ) : (
              reports.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')).map(r => (
                <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      r.status === 'submitted' || r.status === 'approved' ? 'bg-green-100' :
                      r.status === 'in-progress' ? 'bg-amber-100' : 'bg-gray-100'
                    }`}>
                      {r.status === 'submitted' || r.status === 'approved' ? <CheckCircle className="text-green-600" size={18} /> :
                       r.status === 'in-progress' ? <Clock className="text-amber-600" size={18} /> :
                       <FileText className="text-gray-400" size={18} />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{r.title}</p>
                      <p className="text-sm text-gray-500">
                        {r.report_type} • {r.frequency} {r.due_date && `• Due: ${r.due_date}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={r.status}
                      onChange={(e) => handleReportStatus(r, e.target.value)}
                      className="border border-gray-200 rounded px-2 py-1 text-sm"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="in-progress">In Progress</option>
                      <option value="submitted">Submitted</option>
                      <option value="approved">Approved</option>
                    </select>
                    <button onClick={() => deleteReporting(r.id).then(loadData)} className="p-1 text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Compliance Tab */}
      {tab === 'compliance' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{compliance.length} compliance items</p>
            <button 
              onClick={() => setShowComplianceModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
              data-testid="add-compliance-btn"
            >
              <Plus size={14} /> Add Item
            </button>
          </div>

          <div className="space-y-2">
            {compliance.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
                <AlertCircle size={32} className="mx-auto mb-2 text-gray-300" />
                <p>No compliance items yet</p>
                <p className="text-sm">Upload an award document or add manually</p>
              </div>
            ) : (
              compliance.map(c => (
                <div key={c.id} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={c.is_completed}
                    onChange={() => handleComplianceToggle(c)}
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <p className={`text-sm ${c.is_completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>{c.requirement}</p>
                    <p className="text-xs text-gray-500">
                      {c.category} {c.deadline && `• Due: ${c.deadline}`}
                    </p>
                  </div>
                  <button onClick={() => deleteCompliance(c.id).then(loadData)} className="p-1 text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowReportModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add Reporting Requirement</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Title *</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  value={reportForm.title}
                  onChange={e => setReportForm({...reportForm, title: e.target.value})}
                  placeholder="e.g. Q1 Financial Report"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    value={reportForm.report_type}
                    onChange={e => setReportForm({...reportForm, report_type: e.target.value})}
                  >
                    {REPORT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    value={reportForm.frequency}
                    onChange={e => setReportForm({...reportForm, frequency: e.target.value})}
                  >
                    {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  value={reportForm.due_date}
                  onChange={e => setReportForm({...reportForm, due_date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 h-20"
                  value={reportForm.description}
                  onChange={e => setReportForm({...reportForm, description: e.target.value})}
                  placeholder="What needs to be included?"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowReportModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddReport} className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800">Add Report</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Compliance Modal */}
      {showComplianceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowComplianceModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add Compliance Item</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requirement *</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 h-20"
                  value={complianceForm.requirement}
                  onChange={e => setComplianceForm({...complianceForm, requirement: e.target.value})}
                  placeholder="e.g. Submit receipts for all purchases over $500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    value={complianceForm.category}
                    onChange={e => setComplianceForm({...complianceForm, category: e.target.value})}
                  >
                    {['spending', 'documentation', 'programmatic', 'audit', 'other'].map(c => (
                      <option key={c} value={c} className="capitalize">{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    value={complianceForm.deadline}
                    onChange={e => setComplianceForm({...complianceForm, deadline: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowComplianceModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddCompliance} className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800">Add Item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
