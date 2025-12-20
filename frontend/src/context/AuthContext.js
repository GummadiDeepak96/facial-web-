import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clean up any old localStorage tokens (migration to sessionStorage)
    if (localStorage.getItem('token') || localStorage.getItem('user')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    // Check if user is logged in on app load
    // Using sessionStorage instead of localStorage - clears on browser/tab close
    const token = sessionStorage.getItem('token');
    const userData = sessionStorage.getItem('user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Invalid user data in sessionStorage:', error);
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    console.log('🔵 AuthContext.login called with:', userData);
    // Use sessionStorage - automatically clears when browser/tab closes
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    console.log('✅ User state updated in AuthContext');
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
  };

  const isAdmin = () => {
    return user?.userType === 'admin';
  };

  const isEmployee = () => {
    return user?.userType === 'employee';
  };

  const isManager = () => {
    return user?.userType === 'manager';
  };

  const value = {
    user,
    login,
    logout,
    isAdmin,
    isEmployee,
    isManager,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};