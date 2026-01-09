import React, { useState, useEffect } from 'react';
import { getFunders, createFunder, updateFunder, deleteFunder } from '@/services/api';
import { Plus, Search, Edit2, Trash2, ExternalLink, Building, Globe, User } from 'lucide-react';

export const Funders = () => {
  const [funders, setFunders] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', website: '', portal_url: '', portal_login_notes: '',
    priorities: '', restrictions: '', typical_award_range: '',
    application_requirements: '', contact_name: '', contact_email: '', relationship_notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    getFunders()
      .then(res => setFunders(res.data || []))
      .catch(() => setFunders([]));
  };

  const filtered = funders.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.name) return;
    const data = {
      ...form,
      application_requirements: form.application_requirements.split('\n').filter(Boolean)
    };
    
    if (editing) {
      await updateFunder(editing.id, data);
    } else {
      await createFunder(data);
    }
    
    setShowModal(false);
    setEditing(null);
    setForm({ name: '', website: '', portal_url: '', portal_login_notes: '', priorities: '', restrictions: '', typical_award_range: '', application_requirements: '', contact_name: '', contact_email: '', relationship_notes: '' });
    loadData();
  };

  const handleEdit = (funder) => {
    setEditing(funder);
    setForm({
      ...funder,
      application_requirements: funder.application_requirements?.join('\n') || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this funder profile?')) {
      await deleteFunder(id);
      loadData();
    }
  };

  return (
    <div className="space-y-6" data-testid="funders">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Funder Profiles</h1>
          <p className="text-gray-500 text-sm mt-1">Track funder requirements and relationships</p>
        </div>
        <button 
          onClick={() => { setEditing(null); setForm({ name: '', website: '', portal_url: '', portal_login_notes: '', priorities: '', restrictions: '', typical_award_range: '', application_requirements: '', contact_name: '', contact_email: '', relationship_notes: '' }); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          data-testid="add-funder-btn"
        >
          <Plus size={16} /> Add Funder
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search funders..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Funders Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
            <Building size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No funders yet</p>
            <p className="text-sm text-gray-400">Add funder profiles to track requirements</p>
          </div>
        ) : (
          filtered.map(funder => (
            <div key={funder.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Building className="text-gray-400" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{funder.name}</h3>
                    {funder.typical_award_range && (
                      <p className="text-xs text-gray-500">{funder.typical_award_range}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(funder)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(funder.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              
              {funder.priorities && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{funder.priorities}</p>
              )}
              
              <div className="flex flex-wrap gap-2 text-xs">
                {funder.website && (
                  <a href={funder.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                    <Globe size={12} /> Website
                  </a>
                )}
                {funder.portal_url && (
                  <a href={funder.portal_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                    <ExternalLink size={12} /> Portal
                  </a>
                )}
                {funder.contact_name && (
                  <span className="flex items-center gap-1 text-gray-500">
                    <User size={12} /> {funder.contact_name}
                  </span>
                )}
              </div>
              
              {funder.application_requirements?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Requirements ({funder.application_requirements.length})</p>
                  <ul className="text-xs text-gray-600 space-y-0.5">
                    {funder.application_requirements.slice(0, 3).map((req, i) => (
                      <li key={i} className="truncate">• {req}</li>
                    ))}
                    {funder.application_requirements.length > 3 && (
                      <li className="text-gray-400">+{funder.application_requirements.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editing ? 'Edit Funder' : 'Add Funder'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Funder Name *</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="e.g. Robert Wood Johnson Foundation"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    value={form.website}
                    onChange={e => setForm({...form, website: e.target.value})}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Portal URL</label>
                  <input
                    type="url"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    value={form.portal_url}
                    onChange={e => setForm({...form, portal_url: e.target.value})}
                    placeholder="Application portal URL"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Portal Login Notes</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  value={form.portal_login_notes}
                  onChange={e => setForm({...form, portal_login_notes: e.target.value})}
                  placeholder="Username hints, login email used, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Funding Priorities</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 h-20"
                  value={form.priorities}
                  onChange={e => setForm({...form, priorities: e.target.value})}
                  placeholder="What does this funder prioritize?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Typical Award Range</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    value={form.typical_award_range}
                    onChange={e => setForm({...form, typical_award_range: e.target.value})}
                    placeholder="e.g. $25,000 - $100,000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Restrictions</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    value={form.restrictions}
                    onChange={e => setForm({...form, restrictions: e.target.value})}
                    placeholder="Geographic, program type, etc."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Application Requirements (one per line)</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 h-24"
                  value={form.application_requirements}
                  onChange={e => setForm({...form, application_requirements: e.target.value})}
                  placeholder="IRS determination letter\n990 from most recent year\nBoard list\n..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    value={form.contact_name}
                    onChange={e => setForm({...form, contact_name: e.target.value})}
                    placeholder="Program Officer name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    value={form.contact_email}
                    onChange={e => setForm({...form, contact_email: e.target.value})}
                    placeholder="email@foundation.org"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship Notes</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 h-20"
                  value={form.relationship_notes}
                  onChange={e => setForm({...form, relationship_notes: e.target.value})}
                  placeholder="Past interactions, meetings, history..."
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
