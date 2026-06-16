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
import Users from './pages/Users';
import useAuthStore from './store/useAuthStore';
import useDataStore from './store/useDataStore';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn } = useAuthStore();
  return isLoggedIn ? children : <Navigate to="/login" replace />;
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
          <Route path="offers" element={<Offers />} />
          <Route path="services" element={<Services />} />
          <Route path="utility" element={<Utility />} />
          <Route path="bills" element={<Bills />} />
          <Route path="payments" element={<Payments />} />
          <Route path="tally" element={<Tally />} />
          <Route path="users" element={<Users />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;