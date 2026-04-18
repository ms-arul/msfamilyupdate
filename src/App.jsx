import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AddTransaction from './pages/AddTransaction';
import Transactions from './pages/Transactions';
import Loans from './pages/Loans';
import Analytics from './pages/Analytics';
import CalendarView from './pages/CalendarView';
import FamilyOverview from './pages/FamilyOverview';
import MyProofs from './pages/MyProofs';
import Notifications from './pages/Notifications';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import { usePushNotifications } from './hooks/usePushNotifications';

const PushNotificationSetup = () => {
  usePushNotifications();
  return null;
};

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <PushNotificationSetup />
          <div className="bg-animated-gradient min-h-screen">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="add" element={<AddTransaction />} />
                <Route path="loans" element={<Loans />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="calendar" element={<CalendarView />} />
                <Route path="family" element={<FamilyOverview />} />
                <Route path="proofs" element={<MyProofs />} />
                <Route path="notifications" element={<Notifications />} />
              </Route>
            </Routes>
          </div>
        </Router>
      </FinanceProvider>
    </AuthProvider>
  );
}

export default App;
