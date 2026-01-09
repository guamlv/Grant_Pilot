import React, { useState, useEffect } from 'react';
import { getGrants, createGrant, updateGrant, deleteGrant, getFunders } from '@/services/api';
import { Link } from 'react-router-dom';
import { Plus, Search, Calendar, DollarSign, Building, MoreVertical, Trash2, ExternalLink } from 'lucide-react';

const STAGES = ['researching', 'writing', 'submitted', 'pending', 'awarded', 'declined', 'closed'];
const STAGE_COLORS = {
  researching: 'bg-gray-100 text-gray-700',
  writing: 'bg-yellow-100 text-yellow-700',
  submitted: 'bg-blue-100 text-blue-700',
  pending: 'bg-purple-100 text-purple-700',
  awarded: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  closed: 'bg-gray-200 text-gray-600'
};

export const Pipeline = () => {
  const [grants, setGrants] = useState([]);
  const [funders, setFunders] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', funder_name: '', amount_requested: '', deadline: '', stage: 'researching', program: '' });
  const [menuOpen, setMenuOpen] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    Promise.all([getGrants(), getFunders()]).then(([g, f]) => {
      setGrants(g.data || []);
      setFunders(f.data || []);
    });
  };

  const filtered = grants.filter(g => 
    g.title.toLowerCase().includes(search.toLowerCase()) ||
    g.funder_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!form.title) return;
    await createGrant({
      ...form,
      amount_requested: parseFloat(form.amount_requested) || 0
    });
    setShowModal(false);
    setForm({ title: '', funder_name: '', amount_requested: '', deadline: '', stage: 'researching', program: '' });
    loadData();
  };

  const handleStageChange = async (grant, newStage) => {
    await updateGrant(grant.id, { stage: newStage });
    loadData();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this grant?')) {
      await deleteGrant(id);
      loadData();
    }
    setMenuOpen(null);
  };

  const getDaysUntil = (date) => {
    if (!date) return null;
    const days = Math.ceil((new Date(date) - new Date()) / 86400000);
    return days;
  };

  return (
    <div className="space-y-6" data-testid="pipeline">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grant Pipeline</h1>
          <p className="text-gray-500 text-sm mt-1">Track all your grant opportunities</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          data-testid="add-grant-btn"
        >
          <Plus size={16} /> Add Grant
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search grants..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="search-input"
        />
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {STAGES.filter(s => s !== 'closed').map(stage => (
            <div key={stage} className="w-72 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 capitalize flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${STAGE_COLORS[stage].split(' ')[0]}`}></span>
                  {stage}
                </h3>
                <span className="text-xs text-gray-400">{filtered.filter(g => g.stage === stage).length}</span>
              </div>
              <div className="space-y-3 min-h-[200px] bg-gray-50 rounded-lg p-2">
                {filtered.filter(g => g.stage === stage).map(grant => {
                  const daysLeft = getDaysUntil(grant.deadline);
                  return (
                    <div key={grant.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <Link to={`/grants/${grant.id}`} className="font-medium text-gray-900 text-sm hover:text-blue-600 line-clamp-2">
                          {grant.title}
                        </Link>
                        <div className="relative">
                          <button onClick={() => setMenuOpen(menuOpen === grant.id ? null : grant.id)} className="text-gray-400 hover:text-gray-600 p-1">
                            <MoreVertical size={14} />
                          </button>
                          {menuOpen === grant.id && (
                            <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 w-32">
                              <Link to={`/grants/${grant.id}`} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                                <ExternalLink size={12} /> Open
                              </Link>
                              <button onClick={() => handleDelete(grant.id)} className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 w-full">
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {grant.funder_name && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                          <Building size={10} /> {grant.funder_name}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 flex items-center gap-1">
                          <DollarSign size={10} /> {grant.amount_requested?.toLocaleString() || '0'}
                        </span>
                        {daysLeft !== null && daysLeft >= 0 && (
                          <span className={`flex items-center gap-1 ${daysLeft <= 7 ? 'text-red-600 font-medium' : daysLeft <= 14 ? 'text-amber-600' : 'text-gray-500'}`}>
                            <Calendar size={10} /> {daysLeft}d
                          </span>
                        )}
                      </div>

                      {/* Stage selector */}
                      <select
                        value={grant.stage}
                        onChange={(e) => handleStageChange(grant, e.target.value)}
                        className="mt-2 w-full text-xs border border-gray-200 rounded px-2 py-1 bg-gray-50"
                      >
                        {STAGES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add New Grant</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grant Title *</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="e.g. Community Health Initiative"
                  data-testid="grant-title-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Funder</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  value={form.funder_name}
                  onChange={e => setForm({...form, funder_name: e.target.value})}
                  placeholder="e.g. Robert Wood Johnson Foundation"
                  list="funders-list"
                />
                <datalist id="funders-list">
                  {funders.map(f => <option key={f.id} value={f.name} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    value={form.amount_requested}
                    onChange={e => setForm({...form, amount_requested: e.target.value})}
                    placeholder="50000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    value={form.deadline}
                    onChange={e => setForm({...form, deadline: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  value={form.program}
                  onChange={e => setForm({...form, program: e.target.value})}
                  placeholder="Which program is this for?"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleCreate} className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800" data-testid="save-grant-btn">
                Add Grant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
