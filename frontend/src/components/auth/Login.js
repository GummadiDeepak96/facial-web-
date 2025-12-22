import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { toast } from 'react-toastify';
import './Login.css';

const Login = () => {
  const [userType, setUserType] = useState('employee'); // employee, manager, admin
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleUserTypeChange = (type) => {
    setUserType(type);
    // Clear form data when switching roles
    setFormData({
      email: '',
      password: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      console.log(`🔵 ${userType} login attempt:`, formData.email);

      if (userType === 'admin') {
        response = await authAPI.adminLogin(formData);
      } else if (userType === 'manager') {
        response = await authAPI.managerLogin(formData);
      } else {
        response = await authAPI.employeeLogin(formData);
      }

      console.log('✅ Login response received:', response.data);
      const { user, token } = response.data;
      
      console.log('🔵 Calling login with user:', user);
      login(user, token);
      toast.success('Login successful!');
      
      const dashboardPath = userType === 'admin' ? '/admin/dashboard' : 
                           userType === 'manager' ? '/manager/dashboard' : 
                           '/employee/dashboard';
      
      console.log(`🔵 Navigating to ${dashboardPath}`);
      navigate(dashboardPath, { replace: true });
    } catch (error) {
      console.error('❌ Login error:', error);
      const message = error.response?.data?.error || 'Login failed. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Login</h2>
          <p>Welcome back! Please login to your account</p>
        </div>

        {/* User Type Selection */}
        <div className="user-type-selector">
          <label className="user-type-label">LOGIN AS</label>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="userType"
                value="employee"
                checked={userType === 'employee'}
                onChange={() => handleUserTypeChange('employee')}
              />
              <span>EMPLOYEE</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="userType"
                value="manager"
                checked={userType === 'manager'}
                onChange={() => handleUserTypeChange('manager')}
              />
              <span>MANAGER</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="userType"
                value="admin"
                checked={userType === 'admin'}
                onChange={() => handleUserTypeChange('admin')}
              />
              <span>ADMIN</span>
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">EMAIL ADDRESS <span className="required">*</span></label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email address"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">PASSWORD <span className="required">*</span></label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>

          <button 
            type="submit" 
            className="login-btn"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <div>
            <Link to={`/${userType}/forgot-password`} className="forgot-password-link">
              Forgot Password?
            </Link>
          </div>
          {/* {userType === 'employee' && (
            <div>
              Don't have an account? <Link to="/register">Register as Candidate</Link>
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
};

export default Login;
