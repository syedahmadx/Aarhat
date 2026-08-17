import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { AppProvider, useApp } from './context/AppContext';
import { LanguageProvider } from './i18n/LanguageContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NewSale from './pages/NewSale';
import Roznamcha from './pages/Roznamcha';
import KhataList from './pages/KhataList';
import KhataDetail from './pages/KhataDetail';
import CashEntry from './pages/CashEntry';
import Reports from './pages/Reports';

// Reports is owner-only: Munshi gets bounced to the dashboard.
function OwnerOnly({ children }) {
  const { role } = useApp();
  if (role !== 'malik') return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new-sale" element={<NewSale />} />
        <Route path="/roznamcha" element={<Roznamcha />} />
        <Route path="/khatas" element={<KhataList />} />
        <Route path="/khatas/:id" element={<KhataDetail />} />
        <Route path="/cash-entry" element={<CashEntry />} />
        <Route path="/reports" element={<OwnerOnly><Reports /></OwnerOnly>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <AppProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </AppProvider>
    </LanguageProvider>
  </StrictMode>
);
