import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { GrantList } from "@/pages/GrantList";
import { GrantDetail } from "@/pages/GrantDetail";
import { Settings } from "@/pages/Settings";
import { ToastContainer } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import "@/App.css";

function App() {
  const { messages, removeToast } = useToast();

  return (
    <div className="App">
      <BrowserRouter>
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
      </BrowserRouter>
    </div>
  );
}

export default App;
