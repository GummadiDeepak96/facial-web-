import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';

const ChangePasswordView = () => {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [syncedToManager, setSyncedToManager] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.newPassword || !formData.confirmPassword) {
      toast.error('All fields are required');
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const token = sessionStorage.getItem('token');
      
      await axios.post(
        '/api/auth/employee/change-password',
        {
          newPassword: formData.newPassword
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setSyncedToManager(response.data.syncedToManager);
      
      if (response.data.syncedToManager) {
        toast.success('✅ Password updated for both Employee and Manager accounts!');
      } else {
        toast.success('Password changed successfully! A confirmation email has been sent.');
      }
      
      // Reset form
      setFormData({
        newPassword: '',
        confirmPassword: ''
      });
      
      // Clear sync status after 5 seconds
      setTimeout(() => setSyncedToManager(false), 5000);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to change password';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-view">
      <div className="change-password-card">
        <div className="change-password-header">
          <div className="header-icon">
            <Lock size={32} />
          </div>
          <h2>Change Password</h2>
          <p>Update your password to keep your account secure</p>
        </div>

        <form onSubmit={handleSubmit} className="change-password-form">
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <div className="password-input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                type={showNewPassword ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Enter new password (min 6 characters)"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {formData.newPassword && formData.newPassword.length < 6 && (
              <small className="error-text">Password must be at least 6 characters</small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <div className="password-input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter new password"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
              <small className="error-text">Passwords do not match</small>
            )}
          </div>

          {/* <div className="password-requirements">
            <h4>Password Requirements:</h4>
            <ul>
              <li className={formData.newPassword.length >= 6 ? 'met' : ''}>
                {formData.newPassword.length >= 6 ? <CheckCircle size={16} /> : <span className="bullet">•</span>}
                At least 6 characters
              </li>
              <li className={formData.newPassword !== formData.currentPassword && formData.newPassword ? 'met' : ''}>
                {formData.newPassword !== formData.currentPassword && formData.newPassword ? <CheckCircle size={16} /> : <span className="bullet">•</span>}
                Different from current password
              </li>
              <li className={formData.newPassword === formData.confirmPassword && formData.confirmPassword ? 'met' : ''}>
                {formData.newPassword === formData.confirmPassword && formData.confirmPassword ? <CheckCircle size={16} /> : <span className="bullet">•</span>}
                Passwords match
              </li>
            </ul>
          </div> */}

          <button
            type="submit"
            className="change-password-btn"
            disabled={loading || !formData.newPassword || !formData.confirmPassword || formData.newPassword !== formData.confirmPassword || formData.newPassword.length < 6}
          >
            {loading ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>

        {/* <div className="security-note">
          <p><strong>Security Tips:</strong></p>
          <ul>
            <li>Use a strong, unique password</li>
            <li>Don't share your password with anyone</li>
            <li>Change your password regularly</li>
            <li>You'll receive a confirmation email after changing your password</li>
          </ul>
        </div> */}
      </div>

      <style>{`
        .change-password-view {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }

        .change-password-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        .change-password-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }

        .header-icon {
          display: inline-block;
          background: rgba(255,255,255,0.2);
          padding: 15px;
          border-radius: 50%;
          margin-bottom: 15px;
        }

        .change-password-header h2 {
          margin: 10px 0;
          font-size: 24px;
        }

        .change-password-header p {
          margin: 5px 0 0;
          opacity: 0.9;
          font-size: 14px;
        }

        .change-password-form {
          padding: 30px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #333;
        }

        .password-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 12px;
          color: #999;
        }

        .password-input-wrapper input {
          width: 100%;
          padding: 12px 45px 12px 40px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.3s;
        }

        .password-input-wrapper input:focus {
          outline: none;
          border-color: #667eea;
        }

        .toggle-password {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          color: #999;
          padding: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .toggle-password:hover {
          color: #667eea;
        }

        .error-text {
          color: #f44336;
          font-size: 12px;
          margin-top: 5px;
          display: block;
        }

        .password-requirements {
          background: #f5f5f5;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
        }

        .password-requirements h4 {
          margin: 0 0 10px;
          font-size: 14px;
          color: #333;
        }

        .password-requirements ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .password-requirements li {
          padding: 5px 0;
          font-size: 13px;
          color: #666;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .password-requirements li.met {
          color: #4caf50;
        }

        .password-requirements li .bullet {
          width: 16px;
          text-align: center;
        }

        .change-password-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .change-password-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .change-password-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .security-note {
          background: #e3f2fd;
          border-left: 4px solid #2196f3;
          padding: 15px 20px;
          margin: 20px 30px 30px;
          border-radius: 4px;
        }

        .security-note p {
          margin: 0 0 10px;
          font-weight: 600;
          color: #1976d2;
        }

        .security-note ul {
          margin: 0;
          padding-left: 20px;
          color: #555;
        }

        .security-note li {
          margin: 5px 0;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
};

export default ChangePasswordView;
