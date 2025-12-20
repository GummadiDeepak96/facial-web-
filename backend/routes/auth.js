const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../database');
const { hashPassword, comparePassword, generateToken, authenticateEmployee } = require('../auth');
const { generatePassword, sendPasswordResetEmail, sendPasswordChangeConfirmation } = require('../utils/emailService');

const router = express.Router();

// Admin Login
router.post('/admin/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    console.log('\n=== ADMIN LOGIN ATTEMPT ===');
    console.log('Email:', req.body.email);
    console.log('Time:', new Date().toISOString());
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find admin user in admins table
    const admins = await db.query('SELECT * FROM admins WHERE email = ?', [email]);
    const admin = admins[0];

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('✅ Admin found:', { id: admin.id, email: admin.email });
    
    // Compare password
    console.log('🔐 Comparing passwords...');
    const isPasswordValid = await comparePassword(password, admin.password);
    console.log('🔐 Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    console.log('🎫 Generating JWT token...');
    const token = generateToken({
      id: admin.id,
      email: admin.email,
      name: admin.name || 'Admin User',
      userType: 'admin'
    });

    console.log('✅ Token generated successfully');
    console.log('=== ADMIN LOGIN SUCCESS ===\n');

    res.json({
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name || 'Admin User',
        userType: 'admin'
      }
    });

  } catch (error) {
    console.error('❌ Admin login error:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manager Login
router.post('/manager/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 1 }).withMessage('Password is required')
], async (req, res) => {
  try {
    console.log('\n=== MANAGER LOGIN ATTEMPT ===');
    console.log('Email:', req.body.email);
    console.log('Time:', new Date().toISOString());
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Detect status column (status VARCHAR vs statusflag TINYINT)
    const dbName = require('../config').DB_CONFIG.database;
    const statusCol = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'managers' 
       AND column_name IN ('status','statusflag') LIMIT 1`,
      [dbName]
    );
    const statusField = statusCol.length > 0 ? statusCol[0].column_name : 'statusflag';
    const statusCondition = statusField === 'status' ? `m.status = 'active'` : `m.statusflag = 1`;
    
    // Detect department column (department VARCHAR vs department_id INT FK)
    const deptCol = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'managers' 
       AND column_name IN ('department','department_id') LIMIT 1`,
      [dbName]
    );
    const hasDeptId = deptCol.length > 0 && deptCol[0].column_name === 'department_id';
    
    console.log('🔍 Detected status column:', statusField);
    console.log('🔍 Detected department column:', hasDeptId ? 'department_id (FK)' : 'department (VARCHAR)');

    // Build SQL based on schema
    let sql;
    if (hasDeptId) {
      sql = `
        SELECT m.*, d.departmentname 
        FROM managers m
        LEFT JOIN departments d ON m.department_id = d.id
        WHERE m.email = ? AND ${statusCondition}
      `;
    } else {
      sql = `
        SELECT m.*, m.department AS departmentname
        FROM managers m
        WHERE m.email = ? AND ${statusCondition}
      `;
    }
    
    console.log('🔍 Querying managers table...');
    const managers = await db.query(sql, [email]);
    console.log('📊 Query result:', managers.length, 'manager(s) found');
    
    const manager = managers[0];

    if (!manager) {
      console.log('❌ Manager not found or inactive');
      return res.status(401).json({ error: 'Invalid credentials or account inactive' });
    }

    console.log('✅ Manager found:', {
      id: manager.id,
      name: manager.name,
      email: manager.email,
      department: manager.departmentname,
      department_id: manager.department_id || null,
      status: manager.status || manager.statusflag
    });

    // Compare password
    console.log('🔐 Comparing passwords...');
    const isPasswordValid = await comparePassword(password, manager.password);
    console.log('🔐 Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    console.log('🎫 Generating JWT token...');
    const token = generateToken({
      id: manager.id,
      email: manager.email,
      name: manager.name,
      departmentId: manager.department_id || null,
      departmentName: manager.departmentname || manager.department,
      userType: 'manager'
    });

    console.log('✅ Token generated successfully');
    console.log('✅ Sending response to client');
    console.log('=== MANAGER LOGIN SUCCESS ===\n');

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: manager.id,
        email: manager.email,
        name: manager.name,
        mobile: manager.mobile,
        departmentId: manager.department_id || null,
        department: manager.departmentname || manager.department,
        userType: 'manager'
      }
    });

  } catch (error) {
    console.error('❌ Manager login error:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Employee Login
router.post('/employee/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    console.log('\n=== EMPLOYEE LOGIN ATTEMPT ===');
    console.log('Email:', req.body.email);
    console.log('Time:', new Date().toISOString());
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Detect which status column exists (status or statusflag)
    const dbName = require('../config').DB_CONFIG.database;
    const statusColRows = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'employees' 
       AND column_name IN ('status', 'statusflag') LIMIT 1`,
      [dbName]
    );
    
    const statusCol = statusColRows.length > 0 ? statusColRows[0].column_name : 'statusflag';
    const statusCondition = statusCol === 'status' 
      ? `e.status = 'active'` 
      : `e.statusflag = 1`;

    // Detect department and role columns
    const deptIdColRows = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'employees' 
       AND column_name IN ('department_id', 'department') LIMIT 1`,
      [dbName]
    );
    const roleIdColRows = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'employees' 
       AND column_name IN ('role_id', 'role') LIMIT 1`,
      [dbName]
    );
    
    const hasDeptId = deptIdColRows.length > 0 && deptIdColRows[0].column_name === 'department_id';
    const hasDept = deptIdColRows.length > 0 && deptIdColRows[0].column_name === 'department';
    const hasRoleId = roleIdColRows.length > 0 && roleIdColRows[0].column_name === 'role_id';
    const hasRole = roleIdColRows.length > 0 && roleIdColRows[0].column_name === 'role';

    // Build dynamic SQL based on schema
    let sql;
    if (hasDeptId && hasRoleId) {
      sql = `SELECT e.*, d.departmentname, r.rolename 
             FROM employees e
             LEFT JOIN departments d ON e.department_id = d.id
             LEFT JOIN roles r ON e.role_id = r.id
             WHERE e.email = ? AND ${statusCondition}`;
    } else if (hasDept && hasRole) {
      sql = `SELECT e.*, e.department AS departmentname, e.role AS rolename 
             FROM employees e
             WHERE e.email = ? AND ${statusCondition}`;
    } else if (hasDeptId && hasRole) {
      sql = `SELECT e.*, d.departmentname, e.role AS rolename 
             FROM employees e
             LEFT JOIN departments d ON e.department_id = d.id
             WHERE e.email = ? AND ${statusCondition}`;
    } else if (hasDept && hasRoleId) {
      sql = `SELECT e.*, e.department AS departmentname, r.rolename 
             FROM employees e
             LEFT JOIN roles r ON e.role_id = r.id
             WHERE e.email = ? AND ${statusCondition}`;
    } else {
      // Fallback: just get employee data
      sql = `SELECT e.* FROM employees e WHERE e.email = ? AND ${statusCondition}`;
    }
    
    console.log('🔍 Querying employees table...');
    const employees = await db.query(sql, [email]);
    console.log('📊 Query result:', employees.length, 'employee(s) found');
    const employee = employees[0];

    if (!employee) {
      console.log('❌ Employee not found or inactive');
      return res.status(401).json({ error: 'Invalid credentials or account inactive' });
    }

    console.log('✅ Employee found:', { id: employee.id, name: employee.name, email: employee.email });
    
    // Compare password
    console.log('🔐 Comparing passwords...');
    const isPasswordValid = await comparePassword(password, employee.password);
    console.log('🔐 Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Detect primary key column
    const pkColRows = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'employees' 
       AND column_name IN ('enroll_id','person_id','employeeid','id') LIMIT 1`,
      [dbName]
    );
    const pkCol = pkColRows.length > 0 ? pkColRows[0].column_name : 'id';
    const employeeId = employee[pkCol];

    // Generate JWT token
    console.log('🎫 Generating JWT token...');
    const token = generateToken({
      id: employeeId,
      email: employee.email,
      name: employee.name,
      userType: 'employee'
    });

    console.log('✅ Token generated successfully');
    console.log('✅ Sending response to client');
    console.log('=== EMPLOYEE LOGIN SUCCESS ===\n');

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: employeeId,
        enroll_id: employee.enroll_id || employeeId,
        email: employee.email,
        name: employee.name,
        mobile: employee.mobile,
        department: employee.departmentname || employee.department,
        role: employee.rolename || employee.role,
        photograph: employee.photograph,
        userType: 'employee'
      }
    });

  } catch (error) {
    console.error('❌ Employee login error:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change Password (for employees)
router.post('/employee/change-password', [
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], authenticateEmployee, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { newPassword } = req.body;
    const email = req.employee.email; // Get email from authenticated user

    // Detect which status column exists and PK column
    const dbName = require('../config').DB_CONFIG.database;
    const statusColRows = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'employees' 
       AND column_name IN ('status', 'statusflag') LIMIT 1`,
      [dbName]
    );
    const pkColRows = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'employees' 
       AND column_name IN ('enroll_id','person_id','employeeid','id') LIMIT 1`,
      [dbName]
    );
    
    const statusCol = statusColRows.length > 0 ? statusColRows[0].column_name : 'statusflag';
    const pkCol = pkColRows.length > 0 ? pkColRows[0].column_name : 'id';
    
    // Find employee - build condition based on available column
    let employee;
    if (statusCol === 'status') {
      const employees = await db.query('SELECT * FROM employees WHERE email = ? AND status = ?', [email, 'active']);
      employee = employees[0];
    } else {
      employee = await db.findOne('employees', { email, statusflag: 1 });
    }
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    const updateData = { password: hashedNewPassword };
    const hasUpdatedDateCol = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'employees' 
       AND column_name IN ('updateddate','updated_date') LIMIT 1`,
      [dbName]
    );
    if (hasUpdatedDateCol.length > 0) {
      updateData[hasUpdatedDateCol[0].column_name] = new Date();
    }
    
    await db.update('employees', updateData, { [pkCol]: employee[pkCol] });

    // Send confirmation email
    try {
      const { sendPasswordChangeConfirmation } = require('../utils/emailService');
      await sendPasswordChangeConfirmation(email, employee.name || 'Employee');
    } catch (emailErr) {
      console.error('Failed to send password change confirmation email:', emailErr.message);
      // Don't fail the request if email fails
    }

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot Password - Admin
router.post('/admin/forgot-password', [
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Find admin
    const admins = await db.query('SELECT * FROM admins WHERE email = ?', [email]);
    const admin = admins[0];

    if (!admin) {
      return res.status(404).json({ error: 'Email not found in our system' });
    }

    // Generate new password
    const newPassword = generatePassword();
    const hashedPassword = await hashPassword(newPassword);

    // Update password in database
    await db.query('UPDATE admins SET password = ? WHERE email = ?', [hashedPassword, email]);

    // Send email with new password
    await sendPasswordResetEmail(email, admin.name || 'Admin', newPassword, 'Admin');

    res.json({ 
      message: 'Password reset email sent successfully. Please check your email.',
      email: email 
    });

  } catch (error) {
    console.error('Admin forgot password error:', error);
    res.status(500).json({ error: 'Failed to reset password. Please try again later.' });
  }
});

// Forgot Password - Manager
router.post('/manager/forgot-password', [
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Detect status column
    const dbName = require('../config').DB_CONFIG.database;
    const statusCol = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'managers' 
       AND column_name IN ('status','statusflag') LIMIT 1`,
      [dbName]
    );
    const statusField = statusCol.length > 0 ? statusCol[0].column_name : 'statusflag';
    const statusCondition = statusField === 'status' ? `status = 'active'` : `statusflag = 1`;

    // Find manager
    const managers = await db.query(`SELECT * FROM managers WHERE email = ? AND ${statusCondition}`, [email]);
    const manager = managers[0];

    if (!manager) {
      return res.status(404).json({ error: 'Email not found in our system' });
    }

    // Generate new password
    const newPassword = generatePassword();
    const hashedPassword = await hashPassword(newPassword);

    // Update password in database
    await db.query('UPDATE managers SET password = ? WHERE email = ?', [hashedPassword, email]);

    // Send email with new password
    await sendPasswordResetEmail(email, manager.name, newPassword, 'Manager');

    res.json({ 
      message: 'Password reset email sent successfully. Please check your email.',
      email: email 
    });

  } catch (error) {
    console.error('Manager forgot password error:', error);
    res.status(500).json({ error: 'Failed to reset password. Please try again later.' });
  }
});

// Forgot Password - Employee
router.post('/employee/forgot-password', [
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    // Detect which status column exists (status or statusflag)
    const dbName = require('../config').DB_CONFIG.database;
    const statusColRows = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'employees' 
       AND column_name IN ('status', 'statusflag') LIMIT 1`,
      [dbName]
    );
    const statusCol = statusColRows.length > 0 ? statusColRows[0].column_name : 'statusflag';
    const statusCondition = statusCol === 'status' 
      ? `status = 'active'` 
      : `statusflag = 1`;

    // Find employee using detected status column
    const employees = await db.query(`SELECT * FROM employees WHERE email = ? AND ${statusCondition}`, [email]);
    const employee = employees[0];

    if (!employee) {
      return res.status(404).json({ error: 'Email not found in our system' });
    }

    // Generate new password
    const newPassword = generatePassword();
    const hashedPassword = await hashPassword(newPassword);

    // Update password in database
    await db.query('UPDATE employees SET password = ? WHERE email = ?', [hashedPassword, email]);

    // Send email with new password
    await sendPasswordResetEmail(email, employee.name, newPassword, 'Employee');

    res.json({ 
      message: 'Password reset email sent successfully. Please check your email.',
      email: email 
    });

  } catch (error) {
    console.error('Employee forgot password error:', error);
    // Surface helpful hint if common schema issue occurs
    const message = (error && error.code === 'ER_BAD_FIELD_ERROR')
      ? 'Database schema mismatch: missing status/statusflag column.'
      : 'Failed to reset password. Please try again later.';
    res.status(500).json({ error: message });
  }
});

// Reset Password with Temporary Password - Admin
router.post('/admin/reset-password', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('temporaryPassword').notEmpty().withMessage('Temporary password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, temporaryPassword, newPassword } = req.body;

    // Find admin
    const admins = await db.query('SELECT * FROM admins WHERE email = ?', [email]);
    const admin = admins[0];

    if (!admin) {
      return res.status(404).json({ error: 'Email not found in our system' });
    }

    // Verify temporary password
    const isPasswordValid = await comparePassword(temporaryPassword, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid temporary password' });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password in database
    await db.query('UPDATE admins SET password = ? WHERE email = ?', [hashedPassword, email]);

    res.json({ 
      message: 'Password updated successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Admin reset password error:', error);
    res.status(500).json({ error: 'Failed to update password. Please try again later.' });
  }
});

// Reset Password with Temporary Password - Manager
router.post('/manager/reset-password', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('temporaryPassword').notEmpty().withMessage('Temporary password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, temporaryPassword, newPassword } = req.body;

    // Detect status column
    const dbName = require('../config').DB_CONFIG.database;
    const statusCol = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'managers' 
       AND column_name IN ('status','statusflag') LIMIT 1`,
      [dbName]
    );
    const statusField = statusCol.length > 0 ? statusCol[0].column_name : 'statusflag';
    const statusCondition = statusField === 'status' ? `status = 'active'` : `statusflag = 1`;

    // Find manager
    const managers = await db.query(`SELECT * FROM managers WHERE email = ? AND ${statusCondition}`, [email]);
    const manager = managers[0];

    if (!manager) {
      return res.status(404).json({ error: 'Email not found in our system' });
    }

    // Verify temporary password
    const isPasswordValid = await comparePassword(temporaryPassword, manager.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid temporary password' });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password in database
    await db.query('UPDATE managers SET password = ? WHERE email = ?', [hashedPassword, email]);

    res.json({ 
      message: 'Password updated successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Manager reset password error:', error);
    res.status(500).json({ error: 'Failed to update password. Please try again later.' });
  }
});

// Reset Password with Temporary Password - Employee
router.post('/employee/reset-password', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('temporaryPassword').notEmpty().withMessage('Temporary password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, temporaryPassword, newPassword } = req.body;

    // Find employee
    const employees = await db.query('SELECT * FROM employees WHERE email = ? AND statusflag = 1', [email]);
    const employee = employees[0];

    if (!employee) {
      return res.status(404).json({ error: 'Email not found in our system' });
    }

    // Verify temporary password
    const isPasswordValid = await comparePassword(temporaryPassword, employee.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid temporary password' });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password in database
    await db.query('UPDATE employees SET password = ? WHERE email = ?', [hashedPassword, email]);

    res.json({ 
      message: 'Password updated successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Employee reset password error:', error);
    res.status(500).json({ error: 'Failed to update password. Please try again later.' });
  }
});

module.exports = router;