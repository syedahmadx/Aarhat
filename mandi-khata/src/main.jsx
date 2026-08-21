import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import NewSale from './pages/NewSale';
import Roznamcha from './pages/Roznamcha';
import KhataList from './pages/KhataList';
import KhataDetail from './pages/KhataDetail';
import CashEntry from './pages/CashEntry';
import Reports from './pages/Reports';

// Reports is owner-only: Munshi gets bounced to the dashboard.
// This is still the mock role from AppContext, not profiles.role.
function OwnerOnly({ children }) {
  const { role } = useApp();
  if (role !== 'malik') return <Navigate to="/dashboard" replace />;
  return children;
}

// Signed-in routes share the ledger chrome: sidebar, bottom nav, header.
function AppRoute({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

// "/" is the public landing page, but a signed-in user has no use for it.
function Root() {
  const { session, loading } = useAuth();
  if (!loading && session) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Root />} />
      <Route path="/signin" element={<PublicOnlyRoute><SignIn /></PublicOnlyRoute>} />
      <Route path="/signup" element={<PublicOnlyRoute><SignUp /></PublicOnlyRoute>} />

      {/* Ledger — unchanged apart from the dashboard moving off "/" */}
      <Route path="/dashboard" element={<AppRoute><Dashboard /></AppRoute>} />
      <Route path="/new-sale" element={<AppRoute><NewSale /></AppRoute>} />
      <Route path="/roznamcha" element={<AppRoute><Roznamcha /></AppRoute>} />
      <Route path="/khatas" element={<AppRoute><KhataList /></AppRoute>} />
      <Route path="/khatas/:id" element={<AppRoute><KhataDetail /></AppRoute>} />
      <Route path="/cash-entry" element={<AppRoute><CashEntry /></AppRoute>} />
      <Route path="/reports" element={<AppRoute><OwnerOnly><Reports /></OwnerOnly></AppRoute>} />
      <Route path="/profile" element={<AppRoute><Profile /></AppRoute>} />

      {/* Unknown paths land on "/", which routes by session state. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <AppProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </AppProvider>
      </AuthProvider>
    </LanguageProvider>
  </StrictMode>
);
