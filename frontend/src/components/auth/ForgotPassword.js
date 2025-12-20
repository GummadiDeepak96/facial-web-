import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { toast } from 'react-toastify';
import './Login.css';

const ForgotPassword = ({ userType = 'employee' }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      if (userType === 'admin') {
        response = await authAPI.adminForgotPassword({ email });
      } else if (userType === 'manager') {
        response = await authAPI.managerForgotPassword({ email });
      } else {
        response = await authAPI.employeeForgotPassword({ email });
      }

      setEmailSent(true);
      toast.success(response.data.message || 'Password reset email sent successfully!');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate(`/${userType}/login`);
      }, 3000);

    } catch (error) {
      const message = error.response?.data?.error || 'Failed to send reset email. Please try again.';
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
      <div className="login-card">
        <div className="login-header">
          <h2>Forgot Password</h2>
          <p>{getUserTypeDisplay()} Password Reset</p>
        </div>

        {!emailSent ? (
          <>
            <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>
              Enter your email address and we'll send you a new password.
            </p>
            
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your registered email"
                />
              </div>

              <button 
                type="submit" 
                className="login-btn"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Reset Password'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '48px', color: '#4CAF50', marginBottom: '20px' }}>
              ✓
            </div>
            <h3 style={{ color: '#4CAF50', marginBottom: '15px' }}>Email Sent Successfully!</h3>
            <p style={{ color: '#666', marginBottom: '10px' }}>
              We've sent a new password to <strong>{email}</strong>
            </p>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Please check your inbox and use the new password to login.
            </p>
            <p style={{ color: '#999', fontSize: '12px', marginTop: '20px' }}>
              Redirecting to login page...
            </p>
          </div>
        )}

        <div className="login-footer">
          <p>
            Remember your password? <Link to={`/${userType}/login`}>Back to Login</Link>
          </p>
          <p>
            <Link to="/">Back to Home</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
