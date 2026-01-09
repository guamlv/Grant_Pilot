
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { GrantList } from './pages/GrantList.tsx';
import { GrantDetail } from './pages/GrantDetail.tsx';
import { Settings } from './pages/Settings.tsx';
import { api } from './services/api.ts';
import { ToastContainer } from './components/Toast.tsx';
import { useToast } from './hooks/useToast.ts';

const App: React.FC = () => {
  const { messages, removeToast } = useToast();

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
      <ToastContainer messages={messages} remove={removeToast} />
    </Router>
  );
};

export default App;
