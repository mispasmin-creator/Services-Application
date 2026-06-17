import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Offers from './pages/Offers';
import Services from './pages/Services';
import Utility from './pages/Utility';
import Bills from './pages/Bills';
import Payments from './pages/Payments';
import Tally from './pages/Tally';
import Reports from './pages/Reports';
import Users from './pages/Users';
import useAuthStore from './store/useAuthStore';
import useDataStore from './store/useDataStore';
import { hasPageAccess } from './lib/permissions';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn } = useAuthStore();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

// Blocks access to a page the current user hasn't been assigned, redirecting home instead.
const PageGuard = ({ pageKey, children }) => {
  const { user } = useAuthStore();
  return hasPageAccess(user, pageKey) ? children : <Navigate to="/dashboard" replace />;
};

function App() {
  const { isLoggedIn, login } = useAuthStore();
  const fetchData = useDataStore(state => state.fetchData);

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }
  }, [isLoggedIn, fetchData]);

  const handleLogin = (userData) => {
    login(userData);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route 
          path="/login" 
          element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />} 
        />

        {/* Protected Dashboard Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="offers" element={<PageGuard pageKey="Offers"><Offers /></PageGuard>} />
          <Route path="services" element={<PageGuard pageKey="Services"><Services /></PageGuard>} />
          <Route path="utility" element={<PageGuard pageKey="Utility"><Utility /></PageGuard>} />
          <Route path="bills" element={<PageGuard pageKey="Bills"><Bills /></PageGuard>} />
          <Route path="payments" element={<PageGuard pageKey="Payments"><Payments /></PageGuard>} />
          <Route path="tally" element={<PageGuard pageKey="Tally"><Tally /></PageGuard>} />
          <Route path="reports" element={<PageGuard pageKey="Reports"><Reports /></PageGuard>} />
          <Route path="users" element={<PageGuard pageKey="Users"><Users /></PageGuard>} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;