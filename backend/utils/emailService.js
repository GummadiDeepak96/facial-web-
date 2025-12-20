const nodemailer = require('nodemailer');
const config = require('../config');

// Create transporter
const transporter = nodemailer.createTransport(config.EMAIL_CONFIG);

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service error:', error);
  } else {
    console.log('✅ Email service is ready');
  }
});

// Generate random password
const generatePassword = () => {
  const length = 10;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

// Send password reset email
const sendPasswordResetEmail = async (email, name, newPassword, userType) => {
  try {
    const resetLink = `http://localhost:3000/${userType.toLowerCase()}/reset-password?email=${encodeURIComponent(email)}`;
    
    const mailOptions = {
      from: `"FC Employee Management" <${config.EMAIL_FROM}>`,
      to: email,
      subject: 'Password Reset - FC Employee Management System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              border: 1px solid #ddd;
              border-radius: 5px;
              background-color: #f9f9f9;
            }
            .header {
              background-color: #4CAF50;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              padding: 20px;
              background-color: white;
            }
            .password-box {
              background-color: #f0f0f0;
              padding: 15px;
              margin: 20px 0;
              border-left: 4px solid #4CAF50;
              font-size: 18px;
              font-weight: bold;
              letter-spacing: 2px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              margin: 20px 0;
              background-color: #4CAF50;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
            }
            .footer {
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 10px;
              margin: 15px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Password Reset Request</h2>
            </div>
            <div class="content">
              <p>Hello <strong>${name}</strong>,</p>
              <p>We received a request to reset your password for your <strong>${userType}</strong> account in the FC Employee Management System.</p>
              
              <p><strong>Your Temporary Password:</strong></p>
              <div class="password-box">
                ${newPassword}
              </div>
              
              <p>Please click the button below to set your new password:</p>
              
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password Now</a>
              </div>
              
              <p style="color: #666; font-size: 14px;">Or copy this link: <br><a href="${resetLink}">${resetLink}</a></p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul>
                  <li>Use the temporary password above and the reset link to create your new password</li>
                  <li>Do not share this password with anyone</li>
                  <li>If you didn't request this password reset, please contact the administrator immediately</li>
                </ul>
              </div>
              
              <p>Best regards,<br>FC Employee Management Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>&copy; 2025 FC Employee Management System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
};

// Send new employee credentials email
const sendNewEmployeeCredentials = async (email, name, tempPassword, userType) => {
  try {
    const loginLink = `http://localhost:3000/${userType.toLowerCase()}/login`;
    
    const mailOptions = {
      from: `"FC Employee Management" <${config.EMAIL_FROM}>`,
      to: email,
      subject: 'Welcome to FC Employee Management System - Your Login Credentials',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              border: 1px solid #ddd;
              border-radius: 5px;
              background-color: #f9f9f9;
            }
            .header {
              background-color: #2196F3;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              padding: 20px;
              background-color: white;
            }
            .credentials-box {
              background-color: #e3f2fd;
              padding: 20px;
              margin: 20px 0;
              border-left: 4px solid #2196F3;
              border-radius: 4px;
            }
            .credential-row {
              display: flex;
              justify-content: space-between;
              margin: 10px 0;
              padding: 8px;
              background-color: white;
              border-radius: 3px;
            }
            .credential-label {
              font-weight: bold;
              color: #555;
            }
            .credential-value {
              font-family: monospace;
              color: #2196F3;
              font-size: 16px;
              font-weight: bold;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              margin: 20px 0;
              background-color: #2196F3;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
            }
            .footer {
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            .info-box {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 15px 0;
              border-radius: 4px;
            }
            .welcome-icon {
              font-size: 48px;
              text-align: center;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="welcome-icon">👋</div>
              <h2>Welcome to FC Employee Management!</h2>
            </div>
            <div class="content">
              <p>Hello <strong>${name}</strong>,</p>
              <p>Your account has been successfully created in the FC Employee Management System. Below are your login credentials:</p>
              
              <div class="credentials-box">
                <h3 style="margin-top: 0; color: #2196F3;">Your Login Credentials</h3>
                <div class="credential-row">
                  <span class="credential-label">Email:</span>
                  <span class="credential-value">${email}</span>
                </div>
                <div class="credential-row">
                  <span class="credential-label">Temporary Password:</span>
                  <span class="credential-value">${tempPassword}</span>
                </div>
                <div class="credential-row">
                  <span class="credential-label">Role:</span>
                  <span class="credential-value">${userType}</span>
                </div>
              </div>
              
              <div style="text-align: center;">
                <a href="${loginLink}" class="button">Login to Your Account</a>
              </div>
              
              <p style="color: #666; font-size: 14px;">Or copy this link: <br><a href="${loginLink}">${loginLink}</a></p>
              
              <div class="info-box">
                <strong>📌 Important Instructions:</strong>
                <ul style="margin: 10px 0;">
                  <li>Use the credentials above to log in to your account</li>
                  <li>You will be prompted to change your password after first login</li>
                  <li>Keep your password secure and do not share it with anyone</li>
                  <li>If you have any issues logging in, please contact your administrator</li>
                </ul>
              </div>
              
              <p>We're excited to have you on board!</p>
              <p>Best regards,<br>FC Employee Management Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>&copy; 2025 FC Employee Management System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ New employee credentials email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending new employee email:', error);
    throw error;
  }
};

// Send password change confirmation email
const sendPasswordChangeConfirmation = async (email, name) => {
  try {
    const mailOptions = {
      from: `"FC Employee Management" <${config.EMAIL_FROM}>`,
      to: email,
      subject: 'Password Changed Successfully - FC Employee Management',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              border: 1px solid #ddd;
              border-radius: 5px;
              background-color: #f9f9f9;
            }
            .header {
              background-color: #4CAF50;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              padding: 20px;
              background-color: white;
            }
            .success-icon {
              text-align: center;
              font-size: 48px;
              color: #4CAF50;
              margin: 20px 0;
            }
            .info-box {
              background-color: #e8f5e9;
              border-left: 4px solid #4CAF50;
              padding: 15px;
              margin: 20px 0;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 10px;
              margin: 15px 0;
            }
            .footer {
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Password Changed Successfully</h2>
            </div>
            <div class="content">
              <div class="success-icon">✓</div>
              
              <p>Hello <strong>${name}</strong>,</p>
              
              <div class="info-box">
                <p style="margin: 0;"><strong>Your password has been successfully changed!</strong></p>
                <p style="margin: 5px 0 0 0; font-size: 14px;">Date: ${new Date().toLocaleString()}</p>
              </div>
              
              <p>Your password for the FC Employee Management System has been updated. You can now use your new password to log in to your account.</p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <p style="margin: 5px 0 0 0;">If you did not make this change, please contact the administrator immediately and reset your password.</p>
              </div>
              
              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Keep your password secure and do not share it with anyone</li>
                <li>Use your new password for all future logins</li>
                <li>Consider changing your password regularly for better security</li>
              </ul>
              
              <p>Best regards,<br>FC Employee Management Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>&copy; 2025 FC Employee Management System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password change confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending confirmation email:', error);
    throw error;
  }
};

module.exports = {
  generatePassword,
  sendPasswordResetEmail,
  sendNewEmployeeCredentials,
  sendPasswordChangeConfirmation
};
