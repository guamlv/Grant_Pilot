import React, { useState, useEffect } from 'react';
import { getOutcomes, createOutcome, updateOutcome, deleteOutcome } from '@/services/api';
import { Plus, Search, Edit2, Trash2, Copy, BarChart3, Users, MessageSquare, TrendingUp } from 'lucide-react';

const METRIC_TYPES = [
  { id: 'output', label: 'Output', icon: BarChart3, desc: 'Numbers served, sessions held' },
  { id: 'outcome', label: 'Outcome', icon: TrendingUp, desc: 'Changes achieved, improvements' },
  { id: 'demographic', label: 'Demographic', icon: Users, desc: 'Who you serve' },
  { id: 'testimonial', label: 'Testimonial', icon: MessageSquare, desc: 'Quotes and stories' }
];

export const OutcomeBank = () => {
  const [outcomes, setOutcomes] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ program: '', metric_type: 'output', title: '', value: '', time_period: '', source: '', notes: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    getOutcomes().then(res => setOutcomes(res.data || []));
  };

  const filtered = outcomes.filter(o => {
    const matchSearch = o.title.toLowerCase().includes(search.toLowerCase()) || 
                        o.value.toLowerCase().includes(search.toLowerCase()) ||
                        o.program.toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || o.metric_type === typeFilter;
    return matchSearch && matchType;
  });

  const programs = [...new Set(outcomes.map(o => o.program).filter(Boolean))];

  const handleSave = async () => {
    if (!form.title || !form.value) return;
    
    if (editing) {
      await updateOutcome(editing.id, form);
    } else {
      await createOutcome(form);
    }
    
    setShowModal(false);
    setEditing(null);
    setForm({ program: '', metric_type: 'output', title: '', value: '', time_period: '', source: '', notes: '' });
    loadData();
  };

  const handleEdit = (outcome) => {
    setEditing(outcome);
    setForm(outcome);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this metric?')) {
      await deleteOutcome(id);
      loadData();
    }
  };

  const handleCopy = (outcome) => {
    const text = `${outcome.title}: ${outcome.value}${outcome.time_period ? ` (${outcome.time_period})` : ''}`;
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const getTypeIcon = (type) => {
    const t = METRIC_TYPES.find(m => m.id === type);
    return t ? <t.icon size={16} /> : <BarChart3 size={16} />;
  };

  return (
    <div className="space-y-6" data-testid="outcome-bank">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outcome Bank</h1>
          <p className="text-gray-500 text-sm mt-1">Store and reuse your impact metrics</p>
        </div>
        <button 
          onClick={() => { setEditing(null); setForm({ program: '', metric_type: 'output', title: '', value: '', time_period: '', source: '', notes: '' }); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          data-testid="add-outcome-btn"
        >
          <Plus size={16} /> Add Metric
        </button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search metrics..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2"
        >
          <option value="">All Types</option>
          {METRIC_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      {/* Type Summary */}
      <div className="grid grid-cols-4 gap-4">
        {METRIC_TYPES.map(type => {
          const count = outcomes.filter(o => o.metric_type === type.id).length;
          return (
            <button
              key={type.id}
              onClick={() => setTypeFilter(typeFilter === type.id ? '' : type.id)}
              className={`p-4 rounded-lg border text-left transition-all ${
                typeFilter === type.id ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <type.icon size={18} className={typeFilter === type.id ? 'text-gray-900' : 'text-gray-400'} />
                <span className="font-semibold text-gray-900">{count}</span>
              </div>
              <p className="text-sm text-gray-600">{type.label}</p>
            </button>
          );
        })}
      </div>

      {/* Metrics List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
            <BarChart3 size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No metrics yet</p>
            <p className="text-sm text-gray-400">Add your program outcomes and impact data</p>
          </div>
        ) : (
          filtered.map(outcome => (
            <div key={outcome.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                outcome.metric_type === 'output' ? 'bg-blue-100 text-blue-600' :
                outcome.metric_type === 'outcome' ? 'bg-green-100 text-green-600' :
                outcome.metric_type === 'demographic' ? 'bg-purple-100 text-purple-600' :
                'bg-amber-100 text-amber-600'
              }`}>
                {getTypeIcon(outcome.metric_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{outcome.title}</h3>
                  {outcome.program && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{outcome.program}</span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">{outcome.value}</span>
                  {outcome.time_period && <span className="text-gray-400"> ({outcome.time_period})</span>}
                </p>
                {outcome.source && <p className="text-xs text-gray-400">Source: {outcome.source}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleCopy(outcome)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                  <Copy size={16} />
                </button>
                <button onClick={() => handleEdit(outcome)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(outcome.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editing ? 'Edit Metric' : 'Add Metric'}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    value={form.metric_type}
                    onChange={e => setForm({...form, metric_type: e.target.value})}
                  >
                    {METRIC_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    value={form.program}
                    onChange={e => setForm({...form, program: e.target.value})}
                    placeholder="e.g. Youth Mentoring"
                    list="programs-list"
                  />
                  <datalist id="programs-list">
                    {programs.map(p => <option key={p} value={p} />)}
                  </datalist>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metric Title *</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="e.g. Youth served annually"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value *</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  value={form.value}
                  onChange={e => setForm({...form, value: e.target.value})}
                  placeholder="e.g. 1,500 or 85% reported improvement"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    value={form.time_period}
                    onChange={e => setForm({...form, time_period: e.target.value})}
                    placeholder="e.g. FY2024, Q1 2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    value={form.source}
                    onChange={e => setForm({...form, source: e.target.value})}
                    placeholder="e.g. Annual survey"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 h-20"
                  value={form.notes}
                  onChange={e => setForm({...form, notes: e.target.value})}
                  placeholder="Additional context..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
