import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { toast } from 'react-toastify';
import './Login.css';

const ResetPassword = ({ userType = 'employee' }) => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  
  const [formData, setFormData] = useState({
    email: email || '',
    temporaryPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (formData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setLoading(true);

    try {
      let response;
      const data = {
        email: formData.email,
        temporaryPassword: formData.temporaryPassword,
        newPassword: formData.newPassword
      };

      if (userType === 'admin') {
        response = await authAPI.adminResetPassword(data);
      } else if (userType === 'manager') {
        response = await authAPI.managerResetPassword(data);
      } else {
        response = await authAPI.employeeResetPassword(data);
      }

      toast.success(response.data.message || 'Password updated successfully!');
      
      // Redirect to login page after 2 seconds
      setTimeout(() => {
        navigate(`/${userType}/login`);
      }, 2000);

    } catch (error) {
      const message = error.response?.data?.error || 'Failed to reset password. Please check your temporary password.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const getUserTypeDisplay = () => {
    return userType.charAt(0).toUpperCase() + userType.slice(1);
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: '550px', padding: '25px 45px' }}>
        <div className="login-header" style={{ marginBottom: '15px' }}>
          <h2>Reset Password</h2>
          <p>{getUserTypeDisplay()} - Set New Password</p>
        </div>

        <div style={{ 
          backgroundColor: '#e3f2fd', 
          padding: '10px', 
          borderRadius: '5px', 
          marginBottom: '15px',
          fontSize: '13px',
          color: '#1976d2'
        }}>
          <strong>📧 Check your email</strong><br />
          Enter the temporary password from your email and create a new password.
        </div>
        
        <form onSubmit={handleSubmit} className="login-form" style={{ marginBottom: '15px' }}>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
              readOnly={email ? true : false}
              style={email ? { backgroundColor: '#f5f5f5', padding: '10px' } : { padding: '10px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label htmlFor="temporaryPassword">Temporary Password</label>
            <input
              type="text"
              id="temporaryPassword"
              name="temporaryPassword"
              value={formData.temporaryPassword}
              onChange={handleChange}
              required
              placeholder="Enter temporary password from email"
              style={{ padding: '10px' }}
            />
            <small style={{ color: '#666', fontSize: '11px' }}>
              Copy the password from your email
            </small>
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              required
              placeholder="Enter new password (min 6 characters)"
              style={{ padding: '10px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Re-enter new password"
              style={{ padding: '10px' }}
            />
          </div>

          <button 
            type="submit" 
            className="login-btn"
            disabled={loading}
            style={{ padding: '10px' }}
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>

        <div className="login-footer" style={{ paddingTop: '15px' }}>
          <p>
            <Link to={`/${userType}/login`}>Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
