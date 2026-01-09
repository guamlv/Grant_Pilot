import React, { useState, useEffect, useRef } from 'react';
import { getSettings, updateSettings, exportData, importData } from '@/services/api';
import { Download, Upload, Save, Building, Mail, Calendar } from 'lucide-react';

export const Settings = () => {
  const [settings, setSettings] = useState({ org_name: '', ein: '', fiscal_year_end: '', primary_contact: '', primary_email: '' });
  const [saved, setSaved] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    getSettings().then(res => setSettings(res.data || {}));
  }, []);

  const handleSave = async () => {
    await updateSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = async () => {
    const res = await exportData();
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `grantpilot_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!window.confirm('This will replace all existing data. Continue?')) {
      fileRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        await importData(data);
        alert('Data imported successfully. Refreshing...');
        window.location.reload();
      } catch (err) {
        alert('Invalid backup file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-2xl" data-testid="settings">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Organization profile and data management</p>
      </div>

      {/* Organization Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Building size={18} /> Organization Profile
        </h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2"
              value={settings.org_name || ''}
              onChange={e => setSettings({...settings, org_name: e.target.value})}
              placeholder="Your Nonprofit Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">EIN</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2"
              value={settings.ein || ''}
              onChange={e => setSettings({...settings, ein: e.target.value})}
              placeholder="XX-XXXXXXX"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fiscal Year End</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2"
              value={settings.fiscal_year_end || ''}
              onChange={e => setSettings({...settings, fiscal_year_end: e.target.value})}
              placeholder="e.g. December 31"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Contact</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2"
              value={settings.primary_contact || ''}
              onChange={e => setSettings({...settings, primary_contact: e.target.value})}
              placeholder="Your name"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Email</label>
            <input
              type="email"
              className="w-full border border-gray-200 rounded-lg px-3 py-2"
              value={settings.primary_email || ''}
              onChange={e => setSettings({...settings, primary_email: e.target.value})}
              placeholder="grants@yourorg.org"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          <Save size={16} /> {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Data Management */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Calendar size={18} /> Data Management
        </h2>
        <p className="text-sm text-gray-500">
          Export your data for backup or import from a previous backup. 
          Exports include all grants, funders, content, outcomes, and settings.
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
            data-testid="export-btn"
          >
            <Download size={16} /> Export Backup
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
            data-testid="import-btn"
          >
            <Upload size={16} /> Import Backup
          </button>
          <input type="file" ref={fileRef} onChange={handleImport} accept=".json" className="hidden" />
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Quick Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use the <strong>Content Library</strong> to store reusable proposal text</li>
          <li>• Track funder requirements in <strong>Funder Profiles</strong> so you never forget</li>
          <li>• When you get an award, upload the award letter to auto-extract reporting requirements</li>
          <li>• Export your calendar (.ics) from the Dashboard to sync deadlines with your calendar app</li>
        </ul>
      </div>
    </div>
  );
};
