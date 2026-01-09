import React, { useState, useEffect } from 'react';
import { getBudgets, createBudget, updateBudget, deleteBudget, getBudgetTemplates, getBudgetTemplate, getGrants } from '@/services/api';
import { Plus, FileSpreadsheet, Trash2, Download, Copy, ChevronDown } from 'lucide-react';

export const BudgetBuilder = () => {
  const [budgets, setBudgets] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [grants, setGrants] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedGrant, setSelectedGrant] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [budgetsRes, templatesRes, grantsRes] = await Promise.all([
      getBudgets(),
      getBudgetTemplates(),
      getGrants()
    ]);
    setBudgets(budgetsRes.data || []);
    setTemplates(templatesRes.data || []);
    setGrants(grantsRes.data || []);
  };

  const handleCreateBudget = async () => {
    if (!newBudgetName) return;
    
    let lineItems = [];
    if (selectedTemplate) {
      const templateRes = await getBudgetTemplate(selectedTemplate);
      lineItems = templateRes.data.line_items;
    }
    
    const budget = await createBudget({
      name: newBudgetName,
      grant_id: selectedGrant || null,
      line_items: lineItems
    });
    
    setBudgets([...budgets, budget.data]);
    setSelectedBudget(budget.data);
    setShowModal(false);
    setNewBudgetName('');
    setSelectedTemplate('');
    setSelectedGrant('');
  };

  const handleUpdateLineItem = async (index, field, value) => {
    if (!selectedBudget) return;
    
    const updatedItems = [...selectedBudget.line_items];
    updatedItems[index] = { ...updatedItems[index], [field]: field === 'amount' ? parseFloat(value) || 0 : value };
    
    const total = updatedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const updatedBudget = { ...selectedBudget, line_items: updatedItems, total };
    
    setSelectedBudget(updatedBudget);
    setBudgets(budgets.map(b => b.id === selectedBudget.id ? updatedBudget : b));
    
    await updateBudget(selectedBudget.id, { name: selectedBudget.name, grant_id: selectedBudget.grant_id, line_items: updatedItems });
  };

  const handleAddLineItem = async () => {
    if (!selectedBudget) return;
    
    const newItem = { category: '', description: '', amount: 0, notes: '' };
    const updatedItems = [...selectedBudget.line_items, newItem];
    const updatedBudget = { ...selectedBudget, line_items: updatedItems };
    
    setSelectedBudget(updatedBudget);
    await updateBudget(selectedBudget.id, { name: selectedBudget.name, grant_id: selectedBudget.grant_id, line_items: updatedItems });
  };

  const handleRemoveLineItem = async (index) => {
    if (!selectedBudget) return;
    
    const updatedItems = selectedBudget.line_items.filter((_, i) => i !== index);
    const total = updatedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const updatedBudget = { ...selectedBudget, line_items: updatedItems, total };
    
    setSelectedBudget(updatedBudget);
    setBudgets(budgets.map(b => b.id === selectedBudget.id ? updatedBudget : b));
    
    await updateBudget(selectedBudget.id, { name: selectedBudget.name, grant_id: selectedBudget.grant_id, line_items: updatedItems });
  };

  const handleDeleteBudget = async (id) => {
    if (!window.confirm('Delete this budget?')) return;
    await deleteBudget(id);
    setBudgets(budgets.filter(b => b.id !== id));
    if (selectedBudget?.id === id) setSelectedBudget(null);
  };

  const handleExportCSV = () => {
    if (!selectedBudget) return;
    
    const headers = ['Category', 'Description', 'Amount', 'Notes'];
    const rows = selectedBudget.line_items.map(item => [
      item.category,
      item.description,
      item.amount,
      item.notes
    ]);
    rows.push(['', 'TOTAL', selectedBudget.total, '']);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${selectedBudget.name.replace(/\s+/g, '_')}_budget.csv`;
    a.click();
  };

  const groupedItems = selectedBudget?.line_items.reduce((acc, item, index) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ ...item, index });
    return acc;
  }, {}) || {};

  return (
    <div className="space-y-6" data-testid="budget-builder">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget Builder</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage grant budgets with templates</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          data-testid="new-budget-btn"
        >
          <Plus size={16} /> New Budget
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {/* Budget List */}
        <div className="md:col-span-1 space-y-2">
          <h3 className="text-sm font-medium text-gray-500 px-2">Your Budgets</h3>
          {budgets.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-400 text-sm">
              No budgets yet
            </div>
          ) : (
            budgets.map(budget => (
              <div 
                key={budget.id}
                onClick={() => setSelectedBudget(budget)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedBudget?.id === budget.id 
                    ? 'border-gray-900 bg-gray-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{budget.name}</p>
                    <p className="text-xs text-gray-500">${(budget.total || 0).toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteBudget(budget.id); }}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Budget Editor */}
        <div className="md:col-span-3">
          {!selectedBudget ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
              <FileSpreadsheet size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">Select a budget or create a new one</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedBudget.name}</h2>
                  {selectedBudget.grant_id && (
                    <p className="text-xs text-gray-500">
                      Linked to: {grants.find(g => g.id === selectedBudget.grant_id)?.title || 'Unknown grant'}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleExportCSV}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Download size={14} /> Export CSV
                  </button>
                </div>
              </div>

              {/* Budget Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left w-32">Category</th>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-right w-32">Amount</th>
                      <th className="px-4 py-3 text-left w-48">Notes</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedBudget.line_items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.category || ''}
                            onChange={(e) => handleUpdateLineItem(index, 'category', e.target.value)}
                            className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                            placeholder="Category"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={(e) => handleUpdateLineItem(index, 'description', e.target.value)}
                            className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                            placeholder="Description"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={item.amount || ''}
                            onChange={(e) => handleUpdateLineItem(index, 'amount', e.target.value)}
                            className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.notes || ''}
                            onChange={(e) => handleUpdateLineItem(index, 'notes', e.target.value)}
                            className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-gray-500"
                            placeholder="Notes"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <button 
                            onClick={() => handleRemoveLineItem(index)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-semibold">
                    <tr>
                      <td className="px-4 py-3" colSpan={2}>
                        <button 
                          onClick={handleAddLineItem}
                          className="text-blue-600 text-sm hover:underline flex items-center gap-1"
                        >
                          <Plus size={14} /> Add Line Item
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        ${(selectedBudget.total || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">TOTAL</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Category Summary */}
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <h3 className="text-sm font-medium text-gray-700 mb-3">By Category</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(groupedItems).map(([category, items]) => {
                    const catTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
                    const percent = selectedBudget.total > 0 ? ((catTotal / selectedBudget.total) * 100).toFixed(0) : 0;
                    return (
                      <div key={category} className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                        <p className="text-xs text-gray-500">{category}</p>
                        <p className="font-semibold text-gray-900">${catTotal.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">{percent}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Budget Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{zIndex: 9999}} onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Create New Budget</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget Name *</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  value={newBudgetName}
                  onChange={e => setNewBudgetName(e.target.value)}
                  placeholder="e.g. RWJF Grant FY2025"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start from Template</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  value={selectedTemplate}
                  onChange={e => setSelectedTemplate(e.target.value)}
                >
                  <option value="">Blank budget</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.line_items_count} items)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link to Grant (optional)</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  value={selectedGrant}
                  onChange={e => setSelectedGrant(e.target.value)}
                >
                  <option value="">No linked grant</option>
                  {grants.map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleCreateBudget} className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800">
                Create Budget
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
