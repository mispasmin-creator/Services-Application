import React, { useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Login from './components/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import useAuthStore from './store/useAuthStore';
import useDataStore from './store/useDataStore';
import { hasPageAccess } from './lib/permissions';

// ⚡ Lazy load all pages for code splitting
const Offers = React.lazy(() => import('./pages/Offers'));
const Services = React.lazy(() => import('./pages/Services'));
const Utility = React.lazy(() => import('./pages/Utility'));
const Bills = React.lazy(() => import('./pages/Bills'));
const Payments = React.lazy(() => import('./pages/Payments'));
const Tally = React.lazy(() => import('./pages/Tally'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Users = React.lazy(() => import('./pages/Users'));

// ⚡ Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <Loader2 className="animate-spin mx-auto mb-3 text-gray-400" size={32} />
      <p className="text-gray-500 text-sm">Loading page...</p>
    </div>
  </div>
);

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

          {/* ⚡ Lazy-loaded routes with Suspense fallback */}
          <Route path="offers" element={<PageGuard pageKey="Offers"><Suspense fallback={<PageLoader />}><Offers /></Suspense></PageGuard>} />
          <Route path="services" element={<PageGuard pageKey="Services"><Suspense fallback={<PageLoader />}><Services /></Suspense></PageGuard>} />
          <Route path="utility" element={<PageGuard pageKey="Utility"><Suspense fallback={<PageLoader />}><Utility /></Suspense></PageGuard>} />
          <Route path="bills" element={<PageGuard pageKey="Bills"><Suspense fallback={<PageLoader />}><Bills /></Suspense></PageGuard>} />
          <Route path="payments" element={<PageGuard pageKey="Payments"><Suspense fallback={<PageLoader />}><Payments /></Suspense></PageGuard>} />
          <Route path="tally" element={<PageGuard pageKey="Tally"><Suspense fallback={<PageLoader />}><Tally /></Suspense></PageGuard>} />
          <Route path="reports" element={<PageGuard pageKey="Reports"><Suspense fallback={<PageLoader />}><Reports /></Suspense></PageGuard>} />
          <Route path="users" element={<PageGuard pageKey="Users"><Suspense fallback={<PageLoader />}><Users /></Suspense></PageGuard>} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;