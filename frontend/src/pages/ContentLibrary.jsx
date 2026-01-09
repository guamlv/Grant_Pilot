import React, { useState, useEffect } from 'react';
import { getContent, createContent, updateContent, deleteContent, aiDraft } from '@/services/api';
import { Plus, Search, Edit2, Trash2, Copy, Sparkles, Loader2, FolderOpen } from 'lucide-react';

const CATEGORIES = [
  { id: 'mission', label: 'Mission & Vision' },
  { id: 'history', label: 'Organization History' },
  { id: 'leadership', label: 'Leadership & Staff' },
  { id: 'programs', label: 'Programs' },
  { id: 'financials', label: 'Financial Info' },
  { id: 'boilerplate', label: 'Boilerplate' },
  { id: 'other', label: 'Other' }
];

export const ContentLibrary = () => {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ category: 'mission', title: '', content: '', tags: '' });
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [category]);

  const loadData = () => {
    getContent(category || undefined)
      .then(res => setItems(res.data || []))
      .catch(() => setItems([]));
  };

  const filtered = items.filter(i => 
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    i.content.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.title || !form.content) return;
    const data = {
      ...form,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean)
    };
    
    if (editing) {
      await updateContent(editing.id, data);
    } else {
      await createContent(data);
    }
    
    setShowModal(false);
    setEditing(null);
    setForm({ category: 'mission', title: '', content: '', tags: '' });
    loadData();
  };

  const handleEdit = (item) => {
    setEditing(item);
    setForm({
      category: item.category,
      title: item.title,
      content: item.content,
      tags: item.tags?.join(', ') || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this content?')) {
      await deleteContent(id);
      loadData();
    }
  };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    alert('Copied to clipboard!');
  };

  const handleAiDraft = async () => {
    if (!aiPrompt) return;
    setAiLoading(true);
    try {
      const res = await aiDraft({ prompt: aiPrompt, context: 'Organizational content for grant applications' });
      setForm({ ...form, content: res.data.content });
    } catch (e) {
      alert('AI drafting failed');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="content-library">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Library</h1>
          <p className="text-gray-500 text-sm mt-1">Reusable content for your grant proposals</p>
        </div>
        <button 
          onClick={() => { setEditing(null); setForm({ category: 'mission', title: '', content: '', tags: '' }); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          data-testid="add-content-btn"
        >
          <Plus size={16} /> Add Content
        </button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search content..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      {/* Content Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
            <FolderOpen size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No content yet</p>
            <p className="text-sm text-gray-400">Add your organization's reusable content</p>
          </div>
        ) : (
          filtered.map(item => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs text-gray-400 uppercase">{CATEGORIES.find(c => c.id === item.category)?.label}</span>
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleCopy(item.content)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                    <Copy size={14} />
                  </button>
                  <button onClick={() => handleEdit(item)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 line-clamp-4">{item.content}</p>
              {item.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {item.tags.map((tag, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{zIndex: 9999}} onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editing ? 'Edit Content' : 'Add Content'}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    value={form.category}
                    onChange={e => setForm({...form, category: e.target.value})}
                  >
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    value={form.title}
                    onChange={e => setForm({...form, title: e.target.value})}
                    placeholder="e.g. Mission Statement"
                  />
                </div>
              </div>

              {/* AI Assist */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 border border-purple-200 rounded px-3 py-1.5 text-sm bg-white"
                    placeholder="Ask AI to help draft... (e.g. 'Write a 150-word mission statement for a youth mentoring nonprofit')"
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                  />
                  <button
                    onClick={handleAiDraft}
                    disabled={aiLoading}
                    className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                  >
                    {aiLoading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                    Draft
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 h-48"
                  value={form.content}
                  onChange={e => setForm({...form, content: e.target.value})}
                  placeholder="Enter your reusable content here..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  value={form.tags}
                  onChange={e => setForm({...form, tags: e.target.value})}
                  placeholder="e.g. annual report, general, 2024"
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
