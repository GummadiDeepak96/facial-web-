const express = require('express');
const cors = require('cors');
const path = require('path');
const { testConnection, db } = require('./database');
const config = require('./config');

// Import routes
const adminRoutes = require('./routes/admin.js');
const employeeRoutes = require('./routes/employee');
const authRoutes = require('./routes/auth');
const shiftsRoutes = require('./routes/shifts');
const managerRoutes = require('./routes/manager');
const phpProxyRoutes = require('./routes/phpProxy');
const facesRoutes = require('./routes/faces');
const attendanceRoutes = require('./routes/attendance');

// Sync managers function
async function syncManagers() {
  try {
    console.log('🔄 Syncing managers from employees table...');
    // Check whether employees.role_id exists in this schema. If not, try to use a role name column (role/rolename/role_name).
    const dbName = config.DB_CONFIG.database;
    const roleIdColumn = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = 'employees' AND column_name = 'role_id' LIMIT 1`,
      [dbName]
    );

    // If role_id missing, look for name-style role columns
    let roleNameCol = null;
    if (!roleIdColumn || roleIdColumn.length === 0) {
      const candidateCols = ['role', 'rolename', 'role_name'];
      for (const col of candidateCols) {
        const rows = await db.query(
          `SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = 'employees' AND column_name = ? LIMIT 1`,
          [dbName, col]
        ); 
        if (rows && rows.length > 0) {
          roleNameCol = col;
          break;
        }
      }
    }

    if ((!roleIdColumn || roleIdColumn.length === 0) && !roleNameCol) {
      console.warn('employees.role_id column not found and no role name column present — skipping manager sync to avoid errors.');
      return;
    }

    // Check if person/persons table exists
    const personTableRows = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name IN ('persons','person') LIMIT 1`,
      [dbName]
    );
    const personTable = personTableRows && personTableRows.length > 0 ? personTableRows[0].table_name : null;

    // Get all employees with Manager role, joining with person table if it exists
    // Detect whether employees table has department_id or department column to avoid invalid JOINs
    const deptIdColRows = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = 'employees' AND column_name = 'department_id' LIMIT 1`,
      [dbName]
    );
    const deptNameColRows = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = 'employees' AND column_name = 'department' LIMIT 1`,
      [dbName]
    );
    const hasDeptId = deptIdColRows && deptIdColRows.length > 0;
    const hasDeptName = deptNameColRows && deptNameColRows.length > 0;

    let sql;
    // Build SQL depending on which role and department columns exist
    if (roleIdColumn && roleIdColumn.length > 0) {
      // role_id present
      if (personTable) {
        if (hasDeptId) {
          sql = `SELECT e.*, p.name, d.departmentname, r.rolename\n          FROM employees e\n          JOIN roles r ON e.role_id = r.id\n          LEFT JOIN ${personTable} p ON e.person_id = p.id\n          LEFT JOIN departments d ON e.department_id = d.id\n          WHERE r.rolename = 'Manager'`;
        } else if (hasDeptName) {
          sql = `SELECT e.*, p.name, e.department AS departmentname, r.rolename\n          FROM employees e\n          JOIN roles r ON e.role_id = r.id\n          LEFT JOIN ${personTable} p ON e.person_id = p.id\n          WHERE r.rolename = 'Manager'`;
        } else {
          sql = `SELECT e.*, p.name, r.rolename\n          FROM employees e\n          JOIN roles r ON e.role_id = r.id\n          LEFT JOIN ${personTable} p ON e.person_id = p.id\n          WHERE r.rolename = 'Manager'`;
        }
      } else {
        if (hasDeptId) {
          sql = `SELECT e.*, d.departmentname, r.rolename\n          FROM employees e\n          JOIN roles r ON e.role_id = r.id\n          LEFT JOIN departments d ON e.department_id = d.id\n          WHERE r.rolename = 'Manager'`;
        } else if (hasDeptName) {
          sql = `SELECT e.*, e.department AS departmentname, r.rolename\n          FROM employees e\n          JOIN roles r ON e.role_id = r.id\n          WHERE r.rolename = 'Manager'`;
        } else {
          sql = `SELECT e.*, r.rolename\n          FROM employees e\n          JOIN roles r ON e.role_id = r.id\n          WHERE r.rolename = 'Manager'`;
        }
      }
    } else {
      // role name column
      if (personTable) {
        if (hasDeptId) {
          sql = `SELECT e.*, p.name, d.departmentname\n          FROM employees e\n          LEFT JOIN ${personTable} p ON e.person_id = p.id\n          LEFT JOIN departments d ON e.department_id = d.id\n          WHERE e.${roleNameCol} = 'Manager'`;
        } else if (hasDeptName) {
          sql = `SELECT e.*, p.name, e.department AS departmentname\n          FROM employees e\n          LEFT JOIN ${personTable} p ON e.person_id = p.id\n          WHERE e.${roleNameCol} = 'Manager'`;
        } else {
          sql = `SELECT e.*, p.name\n          FROM employees e\n          LEFT JOIN ${personTable} p ON e.person_id = p.id\n          WHERE e.${roleNameCol} = 'Manager'`;
        }
      } else {
        if (hasDeptId) {
          sql = `SELECT e.*, d.departmentname\n          FROM employees e\n          LEFT JOIN departments d ON e.department_id = d.id\n          WHERE e.${roleNameCol} = 'Manager'`;
        } else if (hasDeptName) {
          sql = `SELECT e.*, e.department AS departmentname\n          FROM employees e\n          WHERE e.${roleNameCol} = 'Manager'`;
        } else {
          sql = `SELECT e.*\n          FROM employees e\n          WHERE e.${roleNameCol} = 'Manager'`;
        }
      }
    }

    const managers = await db.query(sql);
    
    if (managers.length === 0) {
      console.log('ℹ️  No managers found in employees table');
      return;
    }
    
    console.log(`📋 Found ${managers.length} manager(s) in employees table`);
    
    for (const manager of managers) {
      // Check if manager already exists
      // sanitize manager fields to avoid passing undefined into SQL parameters
      // Ensure name is never null because managers.name column is NOT NULL.
      const mName = (manager.name && String(manager.name).trim())
        ? String(manager.name).trim()
        : (manager.email ? String(manager.email).split('@')[0] : 'Manager');
      const mEmail = manager.email ?? null;
      const mPassword = manager.password ?? null;
      const mDepartment = manager.departmentname ?? null;
      const mStatus = manager.status ?? 'active';

      if (!mEmail) {
        console.warn('  ⚠️ Skipping manager record with missing email:', manager);
        continue;
      }

      const existing = await db.query(
        'SELECT id FROM managers WHERE email = ?',
        [mEmail]
      );

      if (!existing || existing.length === 0) {
        // Insert new manager
        try {
          await db.query(`
            INSERT INTO managers (name, email, password, department, status)
              VALUES (?, ?, ?, ?, ?)
            `, [
              mName,
              mEmail,
              mPassword,
              mDepartment,
              mStatus
            ]);
          console.log(`  ✅ Added manager: ${mName} (${mEmail}) - Dept: ${mDepartment || 'N/A'}`);
        } catch (insertErr) {
          console.error(`  ❌ Failed to insert manager ${mName} (${mEmail}):`, insertErr.message);
        }
      } else {
        // Update existing manager
        try {
          await db.query(`
            UPDATE managers 
            SET name = ?, department = ?, status = ?, password = ?
            WHERE email = ?
          `, [
            mName,
            mDepartment,
            mStatus,
            mPassword,
            mEmail
          ]);
          console.log(`  ✅ Updated manager: ${mName} (${mEmail}) - Dept: ${mDepartment || 'N/A'}`);
        } catch (updateErr) {
          console.error(`  ❌ Failed to update manager ${mName} (${mEmail}):`, updateErr.message);
        }
      }
    }
    
    console.log('✅ Manager sync completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Error syncing managers:', error.message);
  }
}

const app = express();
const PORT = config.PORT;

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' })); // Allow large JSON payloads for Base64 images
app.use(express.urlencoded({ extended: true }));

// Serve static files for uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/employee', employeeRoutes);
// app.use('/api/admin', shiftsRoutes);
app.use('/api/manager', managerRoutes);
// Proxy for realtime PHP device APIs (avoids CORS issues from browser)
app.use('/api/php', phpProxyRoutes);
// Face recognition endpoints (mobile/offline sync support)
app.use('/api/faces', facesRoutes);
// Attendance logging from mobile devices
app.use('/api/attendance', attendanceRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend is working! Frontend and backend are connected successfully.',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Server is running',
    uptime: process.uptime()
  });
});

// Test managers table
app.get('/api/test/managers', async (req, res) => {
  try {
    const { db } = require('./database');
    const managers = await db.query('SELECT id, name, email, department_id, statusflag FROM managers');
    res.json({ 
      success: true,
      count: managers.length,
      managers: managers
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message,
      hint: 'Make sure managers table exists. Run: mysql -u root -p realtime < backend/database/managers.sql'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server and test database connection
app.listen(PORT, async () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
  
  // Test database connection on startup
  await testConnection();
  
  // Sync managers from employees table
  await syncManagers();
  
  // Auto-sync face_id mapping on startup
  const { syncFaceIdMapping } = require('./utils/faceIdMapper');
  console.log('🔄 Auto-syncing face_id mapping on startup...');
  await syncFaceIdMapping();
  
  // Auto-sync attendance records on startup
  const { processAttendanceRecords } = require('./utils/attendanceProcessor');
  console.log('🔄 Auto-syncing attendance records on startup...');
  await processAttendanceRecords();
  
  // Setup periodic sync every 5 minutes
  setInterval(async () => {
    console.log('🔄 Periodic sync...');
    await syncFaceIdMapping(); // Sync face IDs first
    await processAttendanceRecords(); // Then process attendance
  }, 5 * 60 * 1000); // 5 minutes
});
