import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/auth/Login';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import AdminDashboard from './components/admin/AdminDashboard';
import EmployeeDashboard from './components/employee/EmployeeDashboard';
import ManagerDashboard from './components/manager/ManagerDashboard';
import HomePage from './components/HomePage';
import LoadingSpinner from './components/LoadingSpinner';
import ShiftManagement from './components/admin/ShiftManagement';

import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children, requiredUserType }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredUserType && user.userType !== requiredUserType) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (user) {
    if (user.userType === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (user.userType === 'manager') {
      return <Navigate to="/manager/dashboard" replace />;
    } else if (user.userType === 'employee') {
      return <Navigate to="/employee/dashboard" replace />;
    }
  }

  return children;
};

function AppContent() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/" 
            element={
              <PublicRoute>
                <HomePage />
              </PublicRoute>
            } 
          />
          <Route 
            path="/admin/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/employee/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/manager/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/admin/forgot-password" 
            element={
              <PublicRoute>
                <ForgotPassword userType="admin" />
              </PublicRoute>
            } 
          />
          <Route 
            path="/employee/forgot-password" 
            element={
              <PublicRoute>
                <ForgotPassword userType="employee" />
              </PublicRoute>
            } 
          />
          <Route 
            path="/manager/forgot-password" 
            element={
              <PublicRoute>
                <ForgotPassword userType="manager" />
              </PublicRoute>
            } 
          />
          <Route 
            path="/admin/reset-password" 
            element={
              <PublicRoute>
                <ResetPassword userType="admin" />
              </PublicRoute>
            } 
          />
          <Route 
            path="/employee/reset-password" 
            element={
              <PublicRoute>
                <ResetPassword userType="employee" />
              </PublicRoute>
            } 
          />
          <Route 
            path="/manager/reset-password" 
            element={
              <PublicRoute>
                <ResetPassword userType="manager" />
              </PublicRoute>
            } 
          />

          {/* Protected Routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute requiredUserType="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/manager/dashboard" 
            element={
              <ProtectedRoute requiredUserType="manager">
                <ManagerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/employee/dashboard" 
            element={
              <ProtectedRoute requiredUserType="employee">
                <EmployeeDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/shift-management" 
            element={
              <ProtectedRoute requiredUserType="admin">
                <ShiftManagement />
              </ProtectedRoute>
            } 
          />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <ToastContainer
          position="top-right"
          autoClose={100}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          style={{
            width: '320px',
            fontSize: '14px'
          }}
          toastStyle={{
            padding: '12px',
            minHeight: '50px'
          }}
        />
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
