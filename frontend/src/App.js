import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { Dashboard } from "@/pages/Dashboard";
import { Pipeline } from "@/pages/Pipeline";
import { GrantDetail } from "@/pages/GrantDetail";
import { ContentLibrary } from "@/pages/ContentLibrary";
import { Funders } from "@/pages/Funders";
import { OutcomeBank } from "@/pages/OutcomeBank";
import { BudgetBuilder } from "@/pages/BudgetBuilder";
import { Settings } from "@/pages/Settings";
import { seedDemoData } from "@/services/api";
import { 
  LayoutDashboard, 
  GitBranch, 
  FileText, 
  Building, 
  BarChart3, 
  Calculator,
  Settings as SettingsIcon 
} from "lucide-react";
import "@/App.css";

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/pipeline', icon: GitBranch, label: 'Pipeline' },
  { path: '/content', icon: FileText, label: 'Content Library' },
  { path: '/funders', icon: Building, label: 'Funders' },
  { path: '/outcomes', icon: BarChart3, label: 'Outcome Bank' },
  { path: '/budgets', icon: Calculator, label: 'Budget Builder' },
  { path: '/settings', icon: SettingsIcon, label: 'Settings' },
];

function App() {
  // Seed demo data on first load
  useEffect(() => {
    seedDemoData().catch(() => {});
  }, []);

  return (
    <div className="App">
      <BrowserRouter>
        <div className="flex h-screen bg-gray-50">
          {/* Sidebar */}
          <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <h1 className="text-lg font-bold text-gray-900">GrantPilot</h1>
              <p className="text-xs text-gray-500">Grant Management</p>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {NAV_ITEMS.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-gray-900 text-white' 
                      : 'text-gray-600 hover:bg-gray-100'
                    }
                  `}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="p-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">For Small Nonprofits</p>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-6 max-w-6xl mx-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/pipeline" element={<Pipeline />} />
                <Route path="/grants/:id" element={<GrantDetail />} />
                <Route path="/content" element={<ContentLibrary />} />
                <Route path="/funders" element={<Funders />} />
                <Route path="/outcomes" element={<OutcomeBank />} />
                <Route path="/budgets" element={<BudgetBuilder />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </BrowserRouter>
    </div>
  );
}

export default App;
