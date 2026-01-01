
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { GrantList } from './pages/GrantList';
import { GrantDetail } from './pages/GrantDetail';
import { Settings } from './pages/Settings';
import { api } from './services/api';

const App: React.FC = () => {
  useEffect(() => {
    api.seed();
  }, []);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/grants" element={<GrantList />} />
          <Route path="/grants/:id" element={<GrantDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
