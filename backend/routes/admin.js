const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const { body, validationResult } = require('express-validator');
const { db } = require('../database');
const { hashPassword, authenticateAdmin } = require('../auth');
const { generatePassword, sendPasswordResetEmail, sendNewEmployeeCredentials } = require('../utils/emailService');
const { processAttendanceRecords, processEmployeeAttendance } = require('../utils/attendanceProcessor');

const router = express.Router();
const config = require('../config');

console.log("triggered the admin.js page");
// Helper function to sync employee to managers table if role is Manager
async function syncEmployeeToManagers(employeeId) {
  try {
    const dbName = config.DB_CONFIG.database;
    
    // Detect schema columns
    const hasDeptId = await tableHasColumn('employees', 'department_id');
    const hasDept = await tableHasColumn('employees', 'department');
    const hasRoleId = await tableHasColumn('employees', 'role_id');
    const hasRole = await tableHasColumn('employees', 'role') || await tableHasColumn('employees', 'rolename');
    const hasPersonTable = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name IN ('person','persons') LIMIT 1`,
      [dbName]
    );
    const personTable = hasPersonTable.length > 0 ? hasPersonTable[0].table_name : null;
    
    // Build dynamic SQL based on schema
    let sql = 'SELECT e.*';
    if (personTable) sql += ', p.name as person_name';
    if (hasDeptId) sql += ', d.departmentname';
    else if (hasDept) sql += ', e.department AS departmentname';
    if (hasRoleId) sql += ', r.rolename';
    else if (hasRole) {
      const roleCol = await tableHasColumn('employees', 'role') ? 'role' : 'rolename';
      sql += `, e.${roleCol} AS rolename`;
    }
    sql += ' FROM employees e';
    if (personTable) sql += ` LEFT JOIN ${personTable} p ON e.person_id = p.id`;
    if (hasDeptId) sql += ' LEFT JOIN departments d ON e.department_id = d.id';
    if (hasRoleId) sql += ' LEFT JOIN roles r ON e.role_id = r.id';
    sql += ' WHERE e.person_id = ? OR e.id = ? OR e.employeeid = ? OR e.enroll_id = ? LIMIT 1';
    
    const employees = await db.query(sql, [employeeId, employeeId, employeeId, employeeId]);

    if (!employees || employees.length === 0) return;
    
    const emp = employees[0];
    
    // Only sync if role is Manager
    const empRole = emp.rolename || emp.role;
    if (empRole !== 'Manager') {
      // If employee is NOT a manager, remove from managers table if exists
      await db.query('DELETE FROM managers WHERE email = ?', [emp.email]);
      return;
    }

    // Prepare manager data
    const mName = emp.person_name || emp.name || (emp.email ? emp.email.split('@')[0] : 'Manager');
    const mEmail = emp.email;
    const mPassword = emp.password;
    const mDepartment = emp.departmentname || emp.department || null;
    const mStatus = emp.status === 'active' || emp.statusflag === 1 ? 'active' : 'pending';

    if (!mEmail) return;

    // Check if manager already exists
    const existing = await db.query('SELECT id FROM managers WHERE email = ?', [mEmail]);

    if (!existing || existing.length === 0) {
      // Insert new manager
      await db.query(
        'INSERT INTO managers (name, email, password, department, status) VALUES (?, ?, ?, ?, ?)',
        [mName, mEmail, mPassword, mDepartment, mStatus]
      );
      console.log(`  ✅ Synced manager to managers table: ${mName} (${mEmail})`);
    } else {
      // Update existing manager
      await db.query(
        'UPDATE managers SET name = ?, department = ?, status = ? WHERE email = ?',
        [mName, mDepartment, mStatus, mEmail]
      );
      console.log(`  ✅ Updated manager in managers table: ${mName} (${mEmail})`);
    }
  } catch (error) {
    console.error('Error syncing employee to managers table:', error.message);
  }
}

// Cache employee primary key column (to support different schemas)
let EMPLOYEE_PK = null;
async function detectEmployeePk() {
  if (EMPLOYEE_PK) return EMPLOYEE_PK;
  try {
    const dbName = config.DB_CONFIG.database;
    const rows = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = 'employees' AND column_name IN ('person_id','employeeid','id','employee_id','enroll_id') LIMIT 1`,
      [dbName]
    );
    EMPLOYEE_PK = (rows[0] && rows[0].column_name) || 'id';
  } catch (err) {
    console.error('Failed to detect employees PK column, defaulting to id', err.message);
    EMPLOYEE_PK = 'id';
  }
  return EMPLOYEE_PK;
}

// Helper to check if a column exists in a table
async function tableHasColumn(table, column) {
  try {
    const dbName = config.DB_CONFIG.database;
    const rows = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ? LIMIT 1`,
      [dbName, table, column]
    );
    return rows && rows.length > 0;
  } catch (err) {
    console.error('tableHasColumn check failed:', err.message);
    return false;
  }
}

// Try to resolve a name to an id from a lookup table by checking multiple possible column names
async function tryResolveId(table, nameValue, candidateKeys = []) {
  if (!nameValue) return null;
  for (const key of candidateKeys) {
    try {
      const where = {};
      where[key] = nameValue;
      const found = await db.findOne(table, where);
      if (found) return found.id || found[`${table}_id`] || found.id;
    } catch (e) {
      // ignore and try next key
    }
  }
  return null;
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'employee-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const allowedDocTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (allowedImageTypes.includes(file.mimetype) || allowedDocTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image, CSV, and Excel files are allowed'), false);
    }
  }
});

// Get Dashboard Statistics
router.get('/dashboard/stats', authenticateAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    let stats = {
      totalEmployees: 0,
      presentToday: 0,
      absentToday: 0,
      lateToday: 0,
      recentAttendance: [],
      employees: [],
      departments: [],
      roles: []
    };

    try {
      // Get total employees count using status column
      const totalEmployeesResult = await db.query("SELECT COUNT(*) as count FROM employees WHERE status = 'active'");
      stats.totalEmployees = totalEmployeesResult[0]?.count || 0;
    } catch (err) {
      console.error('Error fetching employees count:', err.message);
      // Fallback without status filter
      const totalEmployeesResult = await db.query('SELECT COUNT(*) as count FROM employees');
      stats.totalEmployees = totalEmployeesResult[0]?.count || 0;
    }

    try {
      // PHP DB attendance integration removed — realtime (device) DB is consumed directly by the frontend in your environment.
      // Skipping external PHP DB queries here. Provide empty/default attendance stats so dashboard remains functional.
      stats.presentToday = 0;
      stats.lateToday = 0;
      stats.recentAttendance = [];
      stats.absentToday = stats.totalEmployees;
    } catch (err) {
      console.error('Attendance integration removed or skipped:', err.message);
      stats.absentToday = stats.totalEmployees;
    }

    try {
      const pk = await detectEmployeePk();
      // Only run the joined query if the foreign key columns exist in employees
      const hasDeptId = await tableHasColumn('employees', 'department_id');
      const hasRoleId = await tableHasColumn('employees', 'role_id');
      try {
        if (hasDeptId && hasRoleId) {
          stats.employees = await db.query(`
            SELECT e.${pk} as id, e.name, e.email, 
                   d.departmentname as department, r.rolename as role
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN roles r ON e.role_id = r.id
            WHERE e.statusflag = 1
          `);
        } else {
          // Schema doesn't have *_id columns; return simple employees selection
          stats.employees = await db.query('SELECT * FROM employees');
        }
      } catch (innerErr) {
        console.warn('Employees query failed, falling back to SELECT * FROM employees:', innerErr.message);
        stats.employees = await db.query('SELECT * FROM employees');
      }
    } catch (err) {
      console.error('Error fetching employees:', err.message);
    }

    try {
      // Get all departments
      stats.departments = await db.query('SELECT * FROM departments');
    } catch (err) {
      console.error('Error fetching departments:', err.message);
    }

    try {
      // Get all roles
      stats.roles = await db.query('SELECT * FROM roles');
    } catch (err) {
      console.error('Error fetching roles:', err.message);
    }

    res.json(stats);

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get All Employees
router.get('/employees', authenticateAdmin, async (req, res) => {
  try {
    // Check whether *_id foreign key columns exist before attempting joins
    const hasDeptId = await tableHasColumn('employees', 'department_id');
    const hasRoleId = await tableHasColumn('employees', 'role_id');
    const hasShiftId = await tableHasColumn('employees', 'shift_id');

    // Check if person table exists
    const [personTableExists] = await db.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'person'
    `);
    const hasPersonTable = personTableExists.count > 0;

    // Detect person table join column
    let personJoinColumn = 'person_id';
    if (hasPersonTable) {
      const personColumns = await db.query(`
        SELECT COLUMN_NAME 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'person'
      `);
      const personColNames = personColumns.map(c => c.COLUMN_NAME);
      if (personColNames.includes('enroll_id')) {
        personJoinColumn = 'enroll_id';
      } else if (personColNames.includes('person_id')) {
        personJoinColumn = 'person_id';
      } else if (personColNames.includes('id')) {
        personJoinColumn = 'id';
      }
    }

    if (hasDeptId && hasRoleId && hasShiftId) {
      try {
        let query = `
          SELECT e.*, d.departmentname, r.rolename, 
               s.name as shiftname, s.start_time as from_time, s.end_time as to_time`;
        
        if (hasPersonTable) {
          query += `, p.name as name, p.name as person_name`;
        }
        
        query += `
          FROM employees e
          LEFT JOIN departments d ON e.department_id = d.id
          LEFT JOIN roles r ON e.role_id = r.id
          LEFT JOIN shifts s ON e.shift_id = s.id`;
        
        if (hasPersonTable) {
          query += `
          LEFT JOIN person p ON e.person_id = p.id`;
        }
        
        query += `
          WHERE e.status = 'active'
          ORDER BY e.created_date DESC
        `;
        
        const employees = await db.query(query);
        return res.json(employees);
      } catch (innerErr) {
        console.warn('Employees joined query failed, falling back to simple select:', innerErr.message);
      }
    }

    // Fallback: return raw employees table with person join if possible
    let fallbackQuery = 'SELECT e.*';
    if (hasPersonTable) {
      fallbackQuery += ', p.name as name, p.name as person_name';
    }
    fallbackQuery += ' FROM employees e';
    if (hasPersonTable) {
      fallbackQuery += ' LEFT JOIN person p ON e.person_id = p.id';
    }
    fallbackQuery += ' WHERE e.status = \'active\'';
    fallbackQuery += ' ORDER BY e.person_id DESC';
    
    const employees = await db.query(fallbackQuery);
    return res.json(employees);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Pending Persons (for approval - not yet in employees table)
router.get('/pending-persons', authenticateAdmin, async (req, res) => {
  try {
    console.log('📋 Fetching pending persons for admin approval...');
    
    // Return all person rows not yet linked to an employee (do not require embedding_json)
    const pendingPersons = await db.query(
      `SELECT p.* 
       FROM person p
       LEFT JOIN employees e ON p.id = e.person_id
       WHERE e.person_id IS NULL
       ORDER BY p.created_at DESC`
    );

    console.log(`✅ Found ${pendingPersons.length} pending persons awaiting approval`);
    res.json(pendingPersons);
  } catch (error) {
    console.error('Get pending persons error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve Person and Create Employee
router.post('/approve-person/:personId', authenticateAdmin, async (req, res) => {
  try {
    const { personId } = req.params;
    const { email, department, role, shift, department_id, role_id, shift_id } = req.body;

    console.log('✅ Approving person ID:', personId, 'with data:', req.body);

    // Check if person exists
    const person = await db.query('SELECT * FROM person WHERE id = ?', [personId]);
    if (person.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // Resolve IDs to names if IDs are provided
    let departmentName = department;
    let roleName = role;
    let shiftName = shift;

    if (department_id) {
      const [dept] = await db.query('SELECT departmentname FROM departments WHERE id = ?', [department_id]);
      if (dept) departmentName = dept.departmentname;
    }

    if (role_id) {
      const [roleData] = await db.query('SELECT rolename FROM roles WHERE id = ?', [role_id]);
      if (roleData) roleName = roleData.rolename;
    }

    if (shift_id) {
      const [shiftData] = await db.query('SELECT name FROM shifts WHERE id = ?', [shift_id]);
      if (shiftData) shiftName = shiftData.name;
    }

    // Generate password and hash it
    const password = generatePassword();
    const hashedPassword = await hashPassword(password);

    // Create employee record
    const result = await db.query(
      `INSERT INTO employees (person_id, email, department, role, shift, status, password, created_date, updated_date)
       VALUES (?, ?, ?, ?, ?, 'active', ?, NOW(), NOW())`,
      [personId, email, departmentName, roleName, shiftName, hashedPassword]
    );

    console.log('✅ Employee created with person_id:', personId);

    // Send credentials email
    try {
      await sendNewEmployeeCredentials(email, person[0].name, password);
      console.log('✅ Credentials email sent to:', email);
    } catch (emailErr) {
      console.error('⚠️ Failed to send email:', emailErr.message);
    }

    res.json({ 
      success: true, 
      message: 'Person approved and employee created',
      employeeId: result.insertId,
      credentials: { email, password }
    });
  } catch (error) {
    console.error('Approve person error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk Upload Employees
router.post('/employees/bulk-upload', authenticateAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    let employees = [];

    if (fileExtension === '.csv') {
      // Parse CSV file
      const query = `
        SELECT 
          e.${pk} as employeeid,
          e.name,
          d.departmentname as department,
          r.rolename as role,
          s.name as shiftTiming,
          COALESCE(a.attendance_status, 'Absent') as attendance,
          TIME_FORMAT(a.clock_in_time, '%H:%i') as inTime,
          TIME_FORMAT(a.clock_out_time, '%H:%i') as outTime,
          CONCAT(
            FLOOR(TIMESTAMPDIFF(MINUTE, a.clock_in_time, a.clock_out_time) / 60), ':',
            LPAD(TIMESTAMPDIFF(MINUTE, a.clock_in_time, a.clock_out_time) % 60, 2, '0')
          ) as totalTime,
          CASE WHEN a.time_status = 'late' THEN 'Yes' ELSE 'No' END as late,
          '' as early,
          '' as extra,
          COALESCE(a.clock_in_method, 'Selfie') as attendanceMode
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN roles r ON e.role_id = r.id
        LEFT JOIN shifts s ON e.shift_id = s.id
        LEFT JOIN employee_attendance a ON e.${pk} = a.employee_id AND a.date = ?
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY e.name
      `;
    }

    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    // Process each employee
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      try {
        // Validate required fields
        if (!emp.name || !emp.email || !emp.password) {
          errors.push(`Row ${i + 1}: Missing required fields (name, email, password)`);
          failedCount++;
          continue;
        }

        // Check for duplicate email
        const [existingEmail] = await db.query(
          `SELECT ${pk} as employeeid FROM employees WHERE email = ?`,
          [emp.email]
        );
        if (existingEmail.length > 0) {
          errors.push(`Row ${i + 1}: Email ${emp.email} already exists`);
          failedCount++;
          continue;
        }

        // Hash password
        const hashedPassword = await hashPassword(emp.password);

        const insertQuery = `
          INSERT INTO employees 
          (name, email, password, role_id, department_id, shift_id, statusflag, createddate, updateddate)
          VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;

        await db.query(insertQuery, [
          emp.name,
          emp.email,
          hashedPassword,
          emp.role_id || null,
          emp.department_id || null,
          emp.shift_id || null,
          emp.statusflag !== undefined ? emp.statusflag : 1
        ]);

        successCount++;
      } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error);
        errors.push(`Row ${i + 1}: ${error.message}`);
        failedCount++;
      }
    }

    // Delete the uploaded file
    fs.unlinkSync(filePath);

    res.json({
      message: `Bulk upload completed. ${successCount} employees added successfully, ${failedCount} failed.`,
      success: successCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    // Try to delete the file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Bulk upload failed: ' + error.message });
  }
});

// Add New Employee
router.post('/employees', authenticateAdmin, [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Extract fields; accept biometric_id OR person_id coming from frontend
  const { name, email } = req.body;
  const role_id = req.body.role_id || null;
  const department_id = req.body.department_id || null;
  const shift_id = req.body.shift_id || null;

    // Check if email already exists
    const existingEmployee = await db.findOne('employees', { email });
    if (existingEmployee) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // No biometric/person id handling - schema does not store these columns

    // Handle password: if provided, use it; otherwise generate one and email it to the employee
    let plainPassword = req.body.password || null;
    if (!plainPassword) {
      plainPassword = generatePassword();
    }

    let hashedPassword = null;
    if (await tableHasColumn('employees', 'password')) {
      hashedPassword = await hashPassword(plainPassword);
    }

    // Determine status column name
    const hasStatusCol = await tableHasColumn('employees', 'status');
    const hasStatusFlag = await tableHasColumn('employees', 'statusflag');

    // Build insertData only including columns that actually exist in the employees table
    const insertData = {};
    if (await tableHasColumn('employees', 'name')) insertData.name = name;
    if (await tableHasColumn('employees', 'email')) insertData.email = email;
  if (await tableHasColumn('employees', 'role_id')) insertData.role_id = role_id;
    if (await tableHasColumn('employees', 'department_id')) insertData.department_id = department_id;
    if (await tableHasColumn('employees', 'shift_id')) insertData.shift_id = shift_id || null;
    if (hashedPassword && await tableHasColumn('employees', 'password')) insertData.password = hashedPassword;
    // New employees should default to 'pending' not active
    if (hasStatusFlag && await tableHasColumn('employees', 'statusflag')) insertData.statusflag = 0;
    if (hasStatusCol && await tableHasColumn('employees', 'status')) insertData.status = 'pending';
    // If the employees table stores a person_id (or similar biometric id column), persist it so
    // imported device persons can be linked to employee rows. This is conditional on the column existing.
    if (await tableHasColumn('employees', 'person_id') && req.body.person_id) {
      insertData.person_id = req.body.person_id;
    }

    const result = await db.insert('employees', insertData);

    // Sync to managers table if role is Manager
    await syncEmployeeToManagers(result.insertId);

    // Send email with password (non-blocking but report errors)
    try {
      await sendNewEmployeeCredentials(email, name || 'User', plainPassword, 'Employee');
    } catch (emailErr) {
      console.error('Failed to send password email after create:', emailErr.message);
      // proceed but inform caller
      return res.status(201).json({
        message: 'Employee created but failed to send password email',
        employeeId: result.insertId
      });
    }

    res.status(201).json({
      message: 'Employee created successfully',
      employeeId: result.insertId
    });

  } catch (error) {
    console.error('Add employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Employee
router.put('/employees/:id', authenticateAdmin, async (req, res) => {
  try {
  const { id } = req.params;
  const { name, email, role_id, department_id, shift_id, statusflag } = req.body;

  // Debug: log incoming body for diagnosis
  try {
    console.debug('PUT /admin/employees/%s - body:', id, req.body);
  } catch (e) {
    /* ignore logging failures */
  }

    // Check if employee exists. Try multiple candidate PKs to be tolerant of different schemas.
    const candidateKeys = ['person_id','employeeid','id','employee_id','enroll_id','email'];
    let employee = null;
    let pk = null;
    for (const key of candidateKeys) {
      try {
        // Skip keys that the employees table doesn't have to avoid ER_BAD_FIELD_ERROR
        // (e.g. enroll_id may not exist in some schemas)
        const hasCol = await tableHasColumn('employees', key);
        if (!hasCol) {
          // but always allow 'email' even if tableHasColumn fails for some reason
          if (key !== 'email') continue;
        }

        const where = {};
        where[key] = id;
        const found = await db.findOne('employees', where);
        if (found) {
          employee = found;
          pk = key;
          break;
        }
      } catch (e) {
        // ignore and try next key
      }
    }

    if (!employee) {
      // No existing employee matched the provided identifier. For device-import flows
      // where name+person_id come from the device, create a new pending employee row
      // if the employees table supports a person_id column. This makes the import
      // action resilient when an employee record doesn't yet exist.
      const canStorePersonId = await tableHasColumn('employees', 'person_id');
      if (!canStorePersonId) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Build insert data using only columns that exist in the table.
      // Write both name and id variants for role/department/shift when possible so
      // newly-created rows (from device imports) show names in UI if the schema stores names.
      const insertData = {};
      if (await tableHasColumn('employees', 'name')) insertData.name = name || '';
      if (await tableHasColumn('employees', 'email') && email) insertData.email = email;
      if (await tableHasColumn('employees', 'person_id')) insertData.person_id = id;

      // Role: accept either role_id or role name and write whichever columns exist
      const incomingRoleId = role_id || req.body.role_id || null;
      const incomingRoleName = req.body.role || req.body.role_name || req.body.rolename || null;
      let resolvedRoleId = incomingRoleId;
      let resolvedRoleName = incomingRoleName;
      if (!resolvedRoleName && resolvedRoleId) {
        const foundRole = await db.findOne('roles', { id: resolvedRoleId }) || await db.findOne('roles', { role_id: resolvedRoleId });
        if (foundRole) resolvedRoleName = foundRole.rolename || foundRole.name || foundRole.role_name || null;
      }
      if (!resolvedRoleId && resolvedRoleName) {
        const resolved = await tryResolveId('roles', resolvedRoleName, ['rolename', 'role_name', 'name', 'title']);
        if (resolved) resolvedRoleId = resolved;
      }
      if (await tableHasColumn('employees', 'role_id') && resolvedRoleId) insertData.role_id = resolvedRoleId;
      if (await tableHasColumn('employees', 'role') && resolvedRoleName) insertData.role = resolvedRoleName;
      else if (await tableHasColumn('employees', 'rolename') && resolvedRoleName) insertData.rolename = resolvedRoleName;
      else if (await tableHasColumn('employees', 'role_name') && resolvedRoleName) insertData.role_name = resolvedRoleName;

      // Department: accept either department_id or name
      const incomingDeptId = department_id || req.body.department_id || null;
      const incomingDeptName = req.body.department || req.body.department_name || req.body.departmentname || null;
      let resolvedDeptId = incomingDeptId;
      let resolvedDeptName = incomingDeptName;
      if (!resolvedDeptName && resolvedDeptId) {
        const foundDept = await db.findOne('departments', { id: resolvedDeptId }) || await db.findOne('departments', { department_id: resolvedDeptId });
        if (foundDept) resolvedDeptName = foundDept.departmentname || foundDept.name || foundDept.department_name || null;
      }
      if (!resolvedDeptId && resolvedDeptName) {
        const resolved = await tryResolveId('departments', resolvedDeptName, ['departmentname', 'department_name', 'name', 'title']);
        if (resolved) resolvedDeptId = resolved;
      }
      if (await tableHasColumn('employees', 'department_id') && resolvedDeptId) insertData.department_id = resolvedDeptId;
      if (await tableHasColumn('employees', 'department') && resolvedDeptName) insertData.department = resolvedDeptName;
      else if (await tableHasColumn('employees', 'departmentname') && resolvedDeptName) insertData.departmentname = resolvedDeptName;
      else if (await tableHasColumn('employees', 'department_name') && resolvedDeptName) insertData.department_name = resolvedDeptName;

      // Shift: accept either shift_id or name
      const incomingShiftId = shift_id || req.body.shift_id || null;
      const incomingShiftName = req.body.shift || req.body.shift_name || req.body.shiftname || null;
      let resolvedShiftId = incomingShiftId;
      let resolvedShiftName = incomingShiftName;
      if (!resolvedShiftName && resolvedShiftId) {
        const foundShift = await db.findOne('shifts', { id: resolvedShiftId }) || await db.findOne('shifts', { shift_id: resolvedShiftId });
        if (foundShift) resolvedShiftName = foundShift.name || foundShift.shift_name || null;
      }
      if (!resolvedShiftId && resolvedShiftName) {
        const resolved = await tryResolveId('shifts', resolvedShiftName, ['name', 'shiftname', 'shift_name', 'title']);
        if (resolved) resolvedShiftId = resolved;
      }
      if (await tableHasColumn('employees', 'shift_id') && resolvedShiftId) insertData.shift_id = resolvedShiftId;
      if (await tableHasColumn('employees', 'shift') && resolvedShiftName) insertData.shift = resolvedShiftName;
      else if (await tableHasColumn('employees', 'shiftname') && resolvedShiftName) insertData.shiftname = resolvedShiftName;
      else if (await tableHasColumn('employees', 'shift_name') && resolvedShiftName) insertData.shift_name = resolvedShiftName;

      // Status: prefer incoming status if provided, otherwise default to pending
      const incomingStatus = req.body.status !== undefined ? req.body.status : undefined;
      if (incomingStatus !== undefined) {
        if (await tableHasColumn('employees', 'status')) {
          insertData.status = incomingStatus;
        } else if (await tableHasColumn('employees', 'statusflag')) {
          insertData.statusflag = incomingStatus === 'active' ? 1 : 0;
        }
      } else {
        if (await tableHasColumn('employees', 'statusflag')) insertData.statusflag = 0;
        if (await tableHasColumn('employees', 'status')) insertData.status = 'pending';
      }

      // Password handling: generate and hash if supported
      let plainPassword = null;
      if (await tableHasColumn('employees', 'password')) {
        plainPassword = generatePassword();
        insertData.password = await hashPassword(plainPassword);
      }

  // Set created/updated timestamps if the schema uses these columns
  if (await tableHasColumn('employees', 'createddate')) insertData.createddate = new Date();
  if (await tableHasColumn('employees', 'created_date')) insertData.created_date = new Date();
  if (await tableHasColumn('employees', 'updateddate')) insertData.updateddate = new Date();
  if (await tableHasColumn('employees', 'updated_date')) insertData.updated_date = new Date();

  try {
        const result = await db.insert('employees', insertData);
        
        // Sync to managers table if role is Manager
        await syncEmployeeToManagers(result.insertId);
        
        // Send password email if we generated one and email is provided
        if (plainPassword && insertData.email) {
          try {
            await sendNewEmployeeCredentials(insertData.email, insertData.name || 'User', plainPassword, 'Employee');
          } catch (emailErr) {
            console.error('Failed to send password email after create-from-put:', emailErr.message);
            // proceed — creation succeeded
          }
        }

        return res.status(201).json({ message: 'Employee created from device import', employeeId: result.insertId });
      } catch (createErr) {
        console.error('Failed to create employee during upsert:', createErr.message);
        return res.status(500).json({ error: 'Failed to create employee from device import' });
      }
    }

    // No biometric_id handling - schema does not store biometric/person id

    // Prepare update data only for columns that exist in the employees table
    const updateData = {};

    // Name
    if (await tableHasColumn('employees', 'name')) updateData.name = name || employee.name;

    // Email handling: compute newEmail and decide whether to send a temporary password
    const emailColumnExists = await tableHasColumn('employees', 'email');
    let newEmail = employee.email;
    if (emailColumnExists) {
      newEmail = email || employee.email;
      // If email is changing, ensure uniqueness
      if (email && email !== employee.email) {
        const dup = await db.findOne('employees', { email });
        if (dup) {
          // Determine whether the duplicate record is actually the same employee by checking common identifier columns
          const candidateIdKeys = ['id','employeeid','person_id','employee_id','enroll_id'];
          const dupMatches = candidateIdKeys.some(k => dup[k] !== undefined && String(dup[k]) === String(id));
          if (!dupMatches) {
            return res.status(409).json({ error: 'Email already exists' });
          }
        }
      }
      updateData.email = newEmail;
    }

    // Decide whether to send a temporary password: either caller requested it (sendPassword flag)
    // or the email is being changed.
    const sendPasswordFlag = req.body.sendPassword === 'true' || req.body.sendPassword === true;
    const emailChanged = email && email !== employee.email;
    const shouldSendPassword = sendPasswordFlag || emailChanged;

    // If caller requested to send a temporary password, only generate and store it
    // when the database actually has a `password` column. Avoid emailing a
    // password when it cannot be persisted (that creates confusion for users).
    let plainPasswordToSend = null;
    if (shouldSendPassword) {
      const hasPasswordCol = await tableHasColumn('employees', 'password');
      if (hasPasswordCol) {
        plainPasswordToSend = generatePassword();
        const hashed = await hashPassword(plainPasswordToSend);
        updateData.password = hashed;
      } else {
        // Log a warning so admins know password wasn't stored
        console.warn('sendPassword requested but employees.password column missing — skipping password generation and email.');
        // Ensure we don't attempt to email a password that won't work for login
        plainPasswordToSend = null;
      }
    }

  // Mobile column not present in schema — skipped

    // Role handling: write whichever columns exist. If both name and id columns exist, write both
    const roleIdValue = role_id || req.body.role_id || null;
    const roleNameValue = req.body.role || req.body.role_name || req.body.rolename || null;
    const hasRoleNameCol = (await tableHasColumn('employees', 'role')) || (await tableHasColumn('employees', 'rolename')) || (await tableHasColumn('employees', 'role_name'));
    const hasRoleIdCol = await tableHasColumn('employees', 'role_id');
    // Resolve a name from incoming id if needed
    let resolvedRoleName = roleNameValue;
    if (!resolvedRoleName && roleIdValue) {
      const foundRole = await db.findOne('roles', { id: roleIdValue }) || await db.findOne('roles', { role_id: roleIdValue });
      if (foundRole) resolvedRoleName = foundRole.rolename || foundRole.name || foundRole.role_name || null;
    }
    // Resolve an id from incoming name if needed
    let resolvedRoleId = roleIdValue;
    if (!resolvedRoleId && resolvedRoleName) {
      const resolved = await tryResolveId('roles', resolvedRoleName, ['rolename', 'role_name', 'name', 'title']);
      if (resolved) resolvedRoleId = resolved;
    }
    console.debug('Resolved role -> id:', resolvedRoleId, ' name:', resolvedRoleName);
    if (hasRoleNameCol) {
      if (await tableHasColumn('employees', 'role')) updateData.role = resolvedRoleName !== undefined && resolvedRoleName !== null ? resolvedRoleName : employee.role;
      else if (await tableHasColumn('employees', 'rolename')) updateData.rolename = resolvedRoleName !== undefined && resolvedRoleName !== null ? resolvedRoleName : (employee.rolename || employee.role);
      else if (await tableHasColumn('employees', 'role_name')) updateData.role_name = resolvedRoleName !== undefined && resolvedRoleName !== null ? resolvedRoleName : employee.role;
    }
    if (hasRoleIdCol) {
      updateData.role_id = resolvedRoleId !== undefined && resolvedRoleId !== null ? resolvedRoleId : (employee.role_id || null);
    }

    // Department handling
    const deptIdValue = department_id || req.body.department_id || null;
    const deptNameValue = req.body.department || req.body.department_name || req.body.departmentname || null;
    const hasDeptNameCol = (await tableHasColumn('employees', 'department')) || (await tableHasColumn('employees', 'departmentname')) || (await tableHasColumn('employees', 'department_name'));
    const hasDeptIdCol = await tableHasColumn('employees', 'department_id');
    // Resolve department name from id if needed
    let resolvedDeptName = deptNameValue;
    if (!resolvedDeptName && deptIdValue) {
      const foundDept = await db.findOne('departments', { id: deptIdValue }) || await db.findOne('departments', { department_id: deptIdValue });
      if (foundDept) resolvedDeptName = foundDept.departmentname || foundDept.name || foundDept.department_name || null;
    }
    // Resolve department id from name if needed
    let resolvedDeptId = deptIdValue;
    if (!resolvedDeptId && resolvedDeptName) {
      const resolved = await tryResolveId('departments', resolvedDeptName, ['departmentname', 'department_name', 'name', 'title']);
      if (resolved) resolvedDeptId = resolved;
    }
    console.debug('Resolved dept -> id:', resolvedDeptId, ' name:', resolvedDeptName);
    if (hasDeptNameCol) {
      if (await tableHasColumn('employees', 'department')) updateData.department = resolvedDeptName !== undefined && resolvedDeptName !== null ? resolvedDeptName : employee.department;
      else if (await tableHasColumn('employees', 'departmentname')) updateData.departmentname = resolvedDeptName !== undefined && resolvedDeptName !== null ? resolvedDeptName : (employee.department || employee.departmentname);
      else if (await tableHasColumn('employees', 'department_name')) updateData.department_name = resolvedDeptName !== undefined && resolvedDeptName !== null ? resolvedDeptName : employee.department;
    }
    if (hasDeptIdCol) {
      updateData.department_id = resolvedDeptId !== undefined && resolvedDeptId !== null ? resolvedDeptId : (employee.department_id || null);
    }

    // Shift handling
    const shiftIdValue = shift_id || req.body.shift_id || null;
    const shiftNameValue = req.body.shift || req.body.shift_name || req.body.shiftname || null;
    const hasShiftNameCol = (await tableHasColumn('employees', 'shift')) || (await tableHasColumn('employees', 'shiftname')) || (await tableHasColumn('employees', 'shift_name'));
    const hasShiftIdCol = await tableHasColumn('employees', 'shift_id');
    // Resolve shift name from id if needed
    let resolvedShiftName = shiftNameValue;
    if (!resolvedShiftName && shiftIdValue) {
      const foundShift = await db.findOne('shifts', { id: shiftIdValue }) || await db.findOne('shifts', { shift_id: shiftIdValue });
      if (foundShift) resolvedShiftName = foundShift.name || foundShift.shift_name || null;
    }
    // Resolve shift id from name if needed
    let resolvedShiftId = shiftIdValue;
    if (!resolvedShiftId && resolvedShiftName) {
      const resolved = await tryResolveId('shifts', resolvedShiftName, ['name', 'shiftname', 'shift_name', 'title']);
      if (resolved) resolvedShiftId = resolved;
    }
    console.debug('Resolved shift -> id:', resolvedShiftId, ' name:', resolvedShiftName);
    if (hasShiftNameCol) {
      if (await tableHasColumn('employees', 'shift')) updateData.shift = resolvedShiftName !== undefined && resolvedShiftName !== null ? resolvedShiftName : employee.shift;
      else if (await tableHasColumn('employees', 'shiftname')) updateData.shiftname = resolvedShiftName !== undefined && resolvedShiftName !== null ? resolvedShiftName : (employee.shift || employee.shiftname);
      else if (await tableHasColumn('employees', 'shift_name')) updateData.shift_name = resolvedShiftName !== undefined && resolvedShiftName !== null ? resolvedShiftName : employee.shift;
    }
    if (hasShiftIdCol) {
      updateData.shift_id = resolvedShiftId !== undefined && resolvedShiftId !== null ? resolvedShiftId : (employee.shift_id || null);
    }

    // Status mapping: if DB has statusflag but client sends status, map it
    if (await tableHasColumn('employees', 'statusflag')) {
      if (req.body.status !== undefined) {
        updateData.statusflag = req.body.status === 'active' ? 1 : 0;
      } else if (statusflag !== undefined) {
        updateData.statusflag = statusflag;
      } else {
        updateData.statusflag = employee.statusflag !== undefined ? employee.statusflag : 1;
      }
    } else if (await tableHasColumn('employees', 'status')) {
      updateData.status = req.body.status !== undefined ? req.body.status : (employee.status !== undefined ? employee.status : null);
    }


    // Status - support both status (string) or statusflag (int)
    if (await tableHasColumn('employees', 'status')) {
      updateData.status = (req.body.status !== undefined) ? req.body.status : (employee.status !== undefined ? employee.status : null);
    } else if (await tableHasColumn('employees', 'statusflag')) {
      updateData.statusflag = (statusflag !== undefined) ? statusflag : (employee.statusflag !== undefined ? employee.statusflag : 1);
    }

    // Defensive: if caller explicitly provided status, ensure we write it using the
    // available column (status or statusflag). This covers edge-cases where earlier
    // conditional logic may have skipped adding the field.
    if (req.body.status !== undefined) {
      if (await tableHasColumn('employees', 'status')) {
        updateData.status = req.body.status;
      } else if (await tableHasColumn('employees', 'statusflag')) {
        updateData.statusflag = req.body.status === 'active' ? 1 : 0;
      }
    }

    // Photograph not stored in schema — skip saving uploaded file path

    // Updated timestamp (check both naming variants)
    if (await tableHasColumn('employees', 'updateddate')) updateData.updateddate = new Date();
    if (await tableHasColumn('employees', 'updated_date')) updateData.updated_date = new Date();

    // Debug: log which columns we're about to update (mask password)
    try {
      const updateKeys = Object.keys(updateData);
      const maskedPreview = { ...updateData };
      if (maskedPreview.password) maskedPreview.password = '***masked***';
      console.log('Updating employee', id, 'with keys:', updateKeys);
      console.debug('Update payload preview:', maskedPreview);
      // Also log which expected schema columns exist (quick check)
      const colChecks = {
        hasRoleName: await tableHasColumn('employees', 'role'),
        hasRoleId: await tableHasColumn('employees', 'role_id'),
        hasDeptName: await tableHasColumn('employees', 'department'),
        hasDeptId: await tableHasColumn('employees', 'department_id'),
        hasShiftName: await tableHasColumn('employees', 'shift'),
        hasShiftId: await tableHasColumn('employees', 'shift_id'),
        hasStatus: await tableHasColumn('employees', 'status'),
        hasStatusFlag: await tableHasColumn('employees', 'statusflag')
      };
      console.debug('Detected employee columns:', colChecks);
    } catch (logErr) {
      console.warn('Failed to log update debug info:', logErr.message);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No updatable employee fields available in database schema' });
    }

    await db.update('employees', updateData, { [pk]: id });

    // Sync to managers table if role is Manager
    await syncEmployeeToManagers(id);

    // If requested, send the temporary password email (await so caller knows if it succeeded)
    if (shouldSendPassword) {
      try {
        const nameToUse = name || employee.name || 'User';
        if (plainPasswordToSend) {
          await sendPasswordResetEmail(newEmail, nameToUse, plainPasswordToSend, 'Employee');
        } else {
          await sendPasswordResetEmail(newEmail, nameToUse, '(password managed externally)', 'Employee');
        }
      } catch (emailErr) {
        console.error('Failed to send password email after update:', emailErr.message);
        return res.status(500).json({ error: 'Employee updated but failed to send password email' });
      }
    }

    res.json({ message: 'Employee updated successfully' });

  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Employee (hard delete with transactional cleanup)
router.delete('/employees/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // First check if employee exists
    const pk = await detectEmployeePk();
    const employee = await db.findOne('employees', { [pk]: id });
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Determine enroll identifier(s) to remove attendance rows (cover common column names)
    const enrollCandidates = [
      employee.enroll_id,
      employee.employeeid,
      employee.employee_id,
      employee.enrollId,
      employee[pk]
    ].filter(v => v !== undefined && v !== null);

    // Determine person id if available
    const personId = employee.person_id || employee.personId || null;

    // Build transactional queries to remove related data safely
    const queries = [];

    // Remove attendance_summary rows for known enroll identifiers
    for (const val of enrollCandidates) {
      queries.push({ sql: 'DELETE FROM attendance_summary WHERE enroll_id = ?', params: [val] });
    }

    // Remove employee row
    queries.push({ sql: `DELETE FROM employees WHERE ${pk} = ?`, params: [id] });

    // Remove manager entry if present
    if (employee.email) {
      queries.push({ sql: 'DELETE FROM managers WHERE email = ?', params: [employee.email] });
    }

    // Remove person row if it exists and is not referenced by any other employee
    if (personId) {
      const otherEmps = await db.findMany('employees', { person_id: personId }, 'id');
      if (!otherEmps || otherEmps.length <= 1) {
        queries.push({ sql: 'DELETE FROM person WHERE id = ?', params: [personId] });
      } else {
        console.log(`Skipping deletion of person ${personId} because it is referenced by other employees`);
      }
    }

    // Execute all deletes in a single transaction for safety
    await db.transaction(queries);

    console.log(`✅ Employee (id=${id}) and related data deleted successfully`);
    res.json({ message: 'Employee and related data deleted successfully' });

  } catch (error) {
    console.error('Delete employee error:', error.message || error);
    res.status(500).json({ error: 'Failed to delete employee and related data' });
  }
});

// Reset Employee Password
router.post('/employees/:id/reset-password', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Find employee
    const pk = await detectEmployeePk();
    const employee = await db.findOne('employees', { [pk]: id });
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    if (!employee.email) {
      return res.status(400).json({ error: 'Employee has no registered email address' });
    }

    // Generate new random password
    const newPassword = generatePassword();
    const hashedPassword = await hashPassword(newPassword);

    // Update password in database
    await db.update('employees', 
      { password: hashedPassword, updated_date: new Date() }, 
      { [pk]: id }
    );

    // Send password reset email
    try {
      const employeeName = employee.name || employee.person_name || 'User';
      await sendPasswordResetEmail(employee.email, employeeName, newPassword, 'Employee');
      
      res.json({ 
        message: 'Password reset successfully. New password sent to registered email.',
        email: employee.email 
      });
    } catch (emailErr) {
      console.error('Failed to send password reset email:', emailErr.message);
      return res.status(500).json({ error: 'Password reset but failed to send email. Please contact administrator.' });
    }

  } catch (error) {
    console.error('Reset employee password error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get All Departments
router.get('/departments', authenticateAdmin, async (req, res) => {
  try {
    const departments = await db.findMany('departments', {}, '*', 'departmentname ASC');
    res.json(departments);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get All Shifts
router.get('/shifts', authenticateAdmin, async (req, res) => {
  try {
    const shifts = await db.findMany('shifts', {}, '*', 'name ASC');
    res.json(shifts);
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add New Department
router.post('/departments', authenticateAdmin, [
  body('departmentname').notEmpty().withMessage('Department name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { departmentname } = req.body;

    // Check if department already exists
    const existing = await db.findOne('departments', { departmentname });
    if (existing) {
      return res.status(409).json({ error: 'Department already exists' });
    }

    const result = await db.insert('departments', { departmentname });

    res.status(201).json({
      message: 'Department created successfully',
      departmentId: result.insertId
    });

  } catch (error) {
    console.error('Add department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get All Roles
router.get('/roles', authenticateAdmin, async (req, res) => {
  try {
    const roles = await db.findMany('roles', {}, '*', 'rolename ASC');
    res.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add New Role
router.post('/roles', authenticateAdmin, [
  body('rolename').notEmpty().withMessage('Role name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rolename } = req.body;

    // Check if role already exists
    const existing = await db.findOne('roles', { rolename });
    if (existing) {
      return res.status(409).json({ error: 'Role already exists' });
    }

    const result = await db.insert('roles', { rolename });

    res.status(201).json({
      message: 'Role created successfully',
      roleId: result.insertId
    });

  } catch (error) {
    console.error('Add role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Department
router.delete('/departments/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Department ID is required' });
    }

    // Check if department exists
    const department = await db.findOne('departments', { id });
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check if any employees have this department
    const employeeCount = await db.query(
      'SELECT COUNT(*) as count FROM employees WHERE department = ?',
      [department.departmentname]
    );

    if (employeeCount[0].count > 0) {
      return res.status(409).json({ 
        error: `Cannot delete department. ${employeeCount[0].count} employee(s) are assigned to this department.` 
      });
    }

    // Delete the department
    await db.query('DELETE FROM departments WHERE id = ?', [id]);

    res.json({ 
      message: 'Department deleted successfully'
    });

  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Role
router.delete('/roles/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Role ID is required' });
    }

    // Check if role exists
    const role = await db.findOne('roles', { id });
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Check if any employees have this role
    const employeeCount = await db.query(
      'SELECT COUNT(*) as count FROM employees WHERE role = ?',
      [role.rolename]
    );

    if (employeeCount[0].count > 0) {
      return res.status(409).json({ 
        error: `Cannot delete role. ${employeeCount[0].count} employee(s) have this role.` 
      });
    }

    // Delete the role
    await db.query('DELETE FROM roles WHERE id = ?', [id]);

    res.json({ 
      message: 'Role deleted successfully'
    });

  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Attendance Records
router.get('/attendance', authenticateAdmin, async (req, res) => {
  try {
    const { date, employee_id, limit = 50 } = req.query;
    
    const pk = await detectEmployeePk();

    let whereConditions = {};
    if (date) whereConditions.date = date;
    if (employee_id) whereConditions.employee_id = employee_id;

    const attendance = await db.query(`
      SELECT ea.*, e.name as employee_name, d.departmentname, r.rolename
      FROM employee_attendance ea
      LEFT JOIN employees e ON ea.employee_id = e.${pk}
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN roles r ON e.role_id = r.id
      ${Object.keys(whereConditions).length > 0 ? 
        'WHERE ' + Object.keys(whereConditions).map(key => `ea.${key} = ?`).join(' AND ') : ''}
      ORDER BY ea.createddatetimestamp DESC
      LIMIT ?
    `, [...Object.values(whereConditions), parseInt(limit)]);

    res.json(attendance);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send Notification to Employees
router.post('/notifications/send', authenticateAdmin, async (req, res) => {
  try {
    const { departments, roles, employeeId, subject, message, signature, urlLink } = req.body;

    if (!employeeId && (!departments || departments.length === 0) && (!roles || roles.length === 0)) {
      return res.status(400).json({ error: 'Please select at least one department, role, or employee' });
    }

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    const pk = await detectEmployeePk();
    
    // Detect if person table exists for name
    const dbName = config.DB_CONFIG.database;
    const personTableCheck = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = ? AND table_name IN ('person','persons') LIMIT 1`,
      [dbName]
    );
    const personTable = personTableCheck.length > 0 ? personTableCheck[0].table_name : null;
    
    // Get employees based on selected criteria
    let employees = [];
    
    if (employeeId) {
      // Single employee notification
      let query = `SELECT e.${pk} as employeeid, e.email`;
      if (personTable) {
        query += `, p.name`;
      }
      query += ` FROM employees e`;
      if (personTable) {
        query += ` LEFT JOIN ${personTable} p ON e.person_id = p.id`;
      }
      query += ` WHERE e.${pk} = ?`;
      
      try {
        const singleEmployee = await db.query(query, [employeeId]);
        employees = singleEmployee.map(emp => ({
          employeeid: emp.employeeid,
          email: emp.email,
          name: emp.name || emp.email?.split('@')[0] || 'Employee'
        }));
      } catch (err) {
        console.error('Error fetching single employee:', err.message);
      }
    } else {
      // Multiple employees notification
      if (departments && departments.length > 0) {
        try {
          // Get department names first
          const deptNames = await db.query(
            `SELECT departmentname FROM departments WHERE id IN (${departments.map(() => '?').join(',')})`,
            departments
          );
          const deptNamesList = deptNames.map(d => d.departmentname);
          
          if (deptNamesList.length > 0) {
            let deptQuery = `SELECT DISTINCT e.${pk} as employeeid, e.email`;
            if (personTable) {
              deptQuery += `, p.name`;
            }
            deptQuery += ` FROM employees e`;
            if (personTable) {
              deptQuery += ` LEFT JOIN ${personTable} p ON e.person_id = p.id`;
            }
            deptQuery += ` WHERE e.department IN (${deptNamesList.map(() => '?').join(',')}) AND e.status = 'active'`;
            
            const deptEmployees = await db.query(deptQuery, deptNamesList);
            employees = [...employees, ...deptEmployees.map(emp => ({
              employeeid: emp.employeeid,
              email: emp.email,
              name: emp.name || emp.email?.split('@')[0] || 'Employee'
            }))];
          }
        } catch (deptErr) {
          console.warn('Department-based query failed:', deptErr.message);
        }
      }

      if (roles && roles.length > 0) {
        try {
          // Get role names first
          const roleNames = await db.query(
            `SELECT rolename FROM roles WHERE id IN (${roles.map(() => '?').join(',')})`,
            roles
          );
          const roleNamesList = roleNames.map(r => r.rolename);
          
          if (roleNamesList.length > 0) {
            let roleQuery = `SELECT DISTINCT e.${pk} as employeeid, e.email`;
            if (personTable) {
              roleQuery += `, p.name`;
            }
            roleQuery += ` FROM employees e`;
            if (personTable) {
              roleQuery += ` LEFT JOIN ${personTable} p ON e.person_id = p.id`;
            }
            roleQuery += ` WHERE e.role IN (${roleNamesList.map(() => '?').join(',')}) AND e.status = 'active'`;
            
            const roleEmployees = await db.query(roleQuery, roleNamesList);
            employees = [...employees, ...roleEmployees.map(emp => ({
              employeeid: emp.employeeid,
              email: emp.email,
              name: emp.name || emp.email?.split('@')[0] || 'Employee'
            }))];
          }
        } catch (roleErr) {
          console.warn('Role-based query failed:', roleErr.message);
        }
      }
    }

    // Remove duplicates
    const uniqueEmployees = Array.from(new Map(employees.map(emp => [emp.employeeid, emp])).values());

    if (uniqueEmployees.length === 0) {
      return res.status(400).json({ error: 'No employees found for selected criteria' });
    }

    // Insert notifications for each employee (always as 'note' type)
    const notificationPromises = uniqueEmployees.map(employee => {
      const fullMessage = signature ? `${message}\n\n${signature}` : message;
      return db.query(
        `INSERT INTO notifications (employee_id, subject, message, notification_type, url_link, is_read, created_at)
         VALUES (?, ?, ?, 'note', ?, 0, NOW())`,
        [employee.employeeid, subject, fullMessage, urlLink || null]
      );
    });

    await Promise.all(notificationPromises);

    res.json({ 
      message: 'Notifications sent successfully',
      count: uniqueEmployees.length 
    });

  } catch (error) {
    console.error('Send notification error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get all holidays
router.get('/holidays', authenticateAdmin, async (req, res) => {
  try {
    const holidays = await db.query(
      `SELECT id, date_from, date_to, description, created_at 
       FROM holidays 
       ORDER BY date_from DESC`
    );
    res.json(holidays);
  } catch (error) {
    console.error('Get holidays error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a new holiday
router.post('/holidays', authenticateAdmin, async (req, res) => {
  try {
    const { date_from, date_to, description } = req.body;

    if (!date_from || !date_to || !description) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    await db.query(
      `INSERT INTO holidays (date_from, date_to, description, created_at)
       VALUES (?, ?, ?, NOW())`,
      [date_from, date_to, description]
    );

    res.json({ message: 'Holiday added successfully' });
  } catch (error) {
    console.error('Add holiday error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a holiday
router.delete('/holidays/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM holidays WHERE id = ?', [id]);
    res.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error('Delete holiday error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save weekly offs
router.post('/weekly-offs', authenticateAdmin, async (req, res) => {
  try {
    const weeklyOffs = req.body;
    
    // Store weekly offs configuration in a settings table or JSON field
    // For now, we'll just return success
    // You can implement database storage based on your requirements
    
    res.json({ message: 'Weekly offs saved successfully' });
  } catch (error) {
    console.error('Save weekly offs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sync attendance records to attendance_summary table
router.post('/sync-attendance', authenticateAdmin, async (req, res) => {
  try {
    console.log('🔄 Manual attendance sync triggered by admin');
    const result = await processAttendanceRecords();
    
    if (result.success) {
      res.json({
        success: true,
        message: `Attendance synced successfully: ${result.inserted} inserted, ${result.updated} updated`,
        inserted: result.inserted,
        updated: result.updated
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Sync attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Attendance Report from attendance_summary table
router.get('/attendance-report', authenticateAdmin, async (req, res) => {
  try {
    const { reportType, date, month, startDate, endDate, departmentId, roleId, employeeId } = req.query;
    
    console.log('📊 Fetching attendance report:', { reportType, date, month, startDate, endDate, employeeId });
    
    // Auto-sync before fetching report
    await processAttendanceRecords();

    if (reportType === 'daily') {
      // Daily Report from attendance_summary
      const reportDate = date || new Date().toISOString().split('T')[0];
      
      let query = `
        SELECT 
          p.id as person_id,
          p.name as name,
          e.email,
          e.department,
          e.role,
          e.shift,
          ats.enroll_id,
          ats.date,
          DATE_FORMAT(CONVERT_TZ(ats.first_in, '+00:00', '+05:30'), '%h:%i %p') as first_in,
          DATE_FORMAT(CONVERT_TZ(ats.last_out, '+00:00', '+05:30'), '%h:%i %p') as last_out,
          ats.status,
          ats.late_status,
          TIME_FORMAT(ats.shift_start, '%h:%i %p') as shift_start,
          (SELECT latitude FROM records WHERE enroll_id = ats.enroll_id AND DATE(records_time) = DATE(ats.date) ORDER BY records_time ASC LIMIT 1) as checkin_latitude,
          (SELECT longitude FROM records WHERE enroll_id = ats.enroll_id AND DATE(records_time) = DATE(ats.date) ORDER BY records_time ASC LIMIT 1) as checkin_longitude,
          (SELECT latitude FROM records WHERE enroll_id = ats.enroll_id AND DATE(records_time) = DATE(ats.date) ORDER BY records_time DESC LIMIT 1) as checkout_latitude,
          (SELECT longitude FROM records WHERE enroll_id = ats.enroll_id AND DATE(records_time) = DATE(ats.date) ORDER BY records_time DESC LIMIT 1) as checkout_longitude
        FROM attendance_summary ats
        INNER JOIN person p ON ats.enroll_id = p.id
        LEFT JOIN employees e ON p.id = e.person_id
        WHERE DATE(ats.date) = ?
      `;
      
      const params = [reportDate];

      // Add filters
      if (employeeId) {
        query += ' AND p.id = ?';
        params.push(employeeId);
      }
      
      if (departmentId) {
        query += ' AND e.department = (SELECT departmentname FROM departments WHERE id = ?)';
        params.push(departmentId);
      }
      
      if (roleId) {
        query += ' AND e.role = (SELECT rolename FROM roles WHERE id = ?)';
        params.push(roleId);
      }

      query += ' ORDER BY p.name';

      const records = await db.query(query, params);
      
      console.log(`✅ Found ${records.length} attendance records for ${reportDate}`);

      res.json({
        reportType: 'daily',
        reportDate,
        records: records,
        count: records.length
      });

    } else if (reportType === 'monthly') {
      // Monthly Report from attendance_summary
      const reportMonth = month || new Date().toISOString().slice(0, 7);
      const [year, monthNum] = reportMonth.split('-');

      let query = `
        SELECT 
          p.id as person_id,
          p.name as name,
          e.email,
          e.department,
          e.role,
          e.shift,
          ats.enroll_id,
          ats.date,
          DATE_FORMAT(CONVERT_TZ(ats.first_in, '+00:00', '+05:30'), '%h:%i %p') as first_in,
          DATE_FORMAT(CONVERT_TZ(ats.last_out, '+00:00', '+05:30'), '%h:%i %p') as last_out,
          ats.status,
          ats.late_status,
          TIME_FORMAT(ats.shift_start, '%h:%i %p') as shift_start,
          (SELECT latitude FROM records WHERE enroll_id = ats.enroll_id AND DATE(records_time) = DATE(ats.date) ORDER BY records_time ASC LIMIT 1) as checkin_latitude,
          (SELECT longitude FROM records WHERE enroll_id = ats.enroll_id AND DATE(records_time) = DATE(ats.date) ORDER BY records_time ASC LIMIT 1) as checkin_longitude,
          (SELECT latitude FROM records WHERE enroll_id = ats.enroll_id AND DATE(records_time) = DATE(ats.date) ORDER BY records_time DESC LIMIT 1) as checkout_latitude,
          (SELECT longitude FROM records WHERE enroll_id = ats.enroll_id AND DATE(records_time) = DATE(ats.date) ORDER BY records_time DESC LIMIT 1) as checkout_longitude
        FROM attendance_summary ats
        INNER JOIN person p ON ats.enroll_id = p.id
        LEFT JOIN employees e ON p.id = e.person_id
        WHERE YEAR(ats.date) = ? AND MONTH(ats.date) = ?
      `;
      
      const params = [year, monthNum];

      if (employeeId) {
        query += ' AND p.id = ?';
        params.push(employeeId);
      }
      
      if (departmentId) {
        query += ' AND e.department = (SELECT departmentname FROM departments WHERE id = ?)';
        params.push(departmentId);
      }
      
      if (roleId) {
        query += ' AND e.role = (SELECT rolename FROM roles WHERE id = ?)';
        params.push(roleId);
      }

      query += ' ORDER BY p.name, ats.date';

      const records = await db.query(query, params);
      
      console.log(`✅ Found ${records.length} attendance records for ${reportMonth}`);

      res.json({
        reportType: 'monthly',
        reportMonth,
        records: records,
        count: records.length
      });

    } else if (reportType === 'custom') {
      // Custom Date Range Report from attendance_summary
      const fromDate = startDate || new Date().toISOString().split('T')[0];
      const toDate = endDate || new Date().toISOString().split('T')[0];

      let query = `
        SELECT 
          p.id as person_id,
          p.name as name,
          e.email,
          e.department,
          e.role,
          e.shift,
          ats.enroll_id,
          ats.date,
          DATE_FORMAT(CONVERT_TZ(ats.first_in, '+00:00', '+05:30'), '%h:%i %p') as first_in,
          DATE_FORMAT(CONVERT_TZ(ats.last_out, '+00:00', '+05:30'), '%h:%i %p') as last_out,
          ats.status,
          ats.late_status,
          TIME_FORMAT(ats.shift_start, '%h:%i %p') as shift_start,
          (SELECT latitude FROM records WHERE enroll_id = ats.enroll_id AND DATE(records_time) = DATE(ats.date) ORDER BY records_time ASC LIMIT 1) as checkin_latitude,
          (SELECT longitude FROM records WHERE enroll_id = ats.enroll_id AND DATE(records_time) = DATE(ats.date) ORDER BY records_time ASC LIMIT 1) as checkin_longitude,
          (SELECT latitude FROM records WHERE enroll_id = ats.enroll_id AND DATE(records_time) = DATE(ats.date) ORDER BY records_time DESC LIMIT 1) as checkout_latitude,
          (SELECT longitude FROM records WHERE enroll_id = ats.enroll_id AND DATE(records_time) = DATE(ats.date) ORDER BY records_time DESC LIMIT 1) as checkout_longitude
        FROM attendance_summary ats
        INNER JOIN person p ON ats.enroll_id = p.id
        LEFT JOIN employees e ON p.id = e.person_id
        WHERE ats.date BETWEEN ? AND ?
      `;
      
      const params = [fromDate, toDate];

      if (employeeId) {
        query += ' AND p.id = ?';
        params.push(employeeId);
      }
      
      if (departmentId) {
        query += ' AND e.department = (SELECT departmentname FROM departments WHERE id = ?)';
        params.push(departmentId);
      }
      
      if (roleId) {
        query += ' AND e.role = (SELECT rolename FROM roles WHERE id = ?)';
        params.push(roleId);
      }

      query += ' ORDER BY p.name, ats.date';

      const records = await db.query(query, params);
      
      console.log(`✅ Found ${records.length} attendance records from ${fromDate} to ${toDate}`);

      res.json({
        reportType: 'custom',
        startDate: fromDate,
        endDate: toDate,
        records: records,
        count: records.length
      });

    } else {
      return res.status(400).json({ error: 'Invalid report type' });
    }

  } catch (error) {
    console.error('Get attendance report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download Attendance Report (PDF/Excel)
router.get('/attendance-report/download', authenticateAdmin, async (req, res) => {
  try {
    const { reportType, date, month, startDate, endDate, departmentId, roleId, employeeId, format } = req.query;
    const PDFDocument = require('pdfkit');

    const pk = await detectEmployeePk();

    let whereConditions = ['e.statusflag = 1'];
    let params = [];

    // Filter by department
    if (departmentId) {
      whereConditions.push('e.department_id = ?');
      params.push(departmentId);
    }

    // Filter by role
    if (roleId) {
      whereConditions.push('e.role_id = ?');
      params.push(roleId);
    }

    // Filter by employee
    if (employeeId) {
      whereConditions.push(`e.${pk} = ?`);
      params.push(employeeId);
    }

    // Create PDF document
    const doc = new PDFDocument({ 
      size: 'A4',
      layout: reportType === 'monthly' ? 'landscape' : 'portrait',
      margin: 40
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${reportType}_${Date.now()}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    if (reportType === 'daily') {
      // Daily Report
      const reportDate = date || new Date().toISOString().split('T')[0];
      
      const query = `
        SELECT 
          e.${pk} as employeeid,
          e.name,
          d.departmentname as department,
          r.rolename as role,
          s.name as shiftTiming,
          COALESCE(a.attendance_status, 'Absent') as attendance,
          TIME_FORMAT(a.clock_in_time, '%H:%i') as inTime,
          TIME_FORMAT(a.clock_out_time, '%H:%i') as outTime,
          TIMESTAMPDIFF(MINUTE, a.clock_in_time, a.clock_out_time) as totalMinutes,
          CASE WHEN a.time_status = 'late' THEN 'Yes' ELSE 'No' END as late,
          COALESCE(a.clock_in_method, 'N/A') as attendanceMode
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN roles r ON e.role_id = r.id
        LEFT JOIN shifts s ON e.shift_id = s.id
        LEFT JOIN employee_attendance a ON e.${pk} = a.employee_id AND a.date = ?
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY e.name
      `;

      const records = await db.query(query, [reportDate, ...params]);

      // Add title
      doc.fontSize(18).font('Helvetica-Bold').text('Daily Attendance Report', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text(`Date: ${reportDate}`, { align: 'center' });
      doc.moveDown();

      // Table header
      const startY = doc.y;
      const rowHeight = 25;
      let currentY = startY;

      // Draw table headers
      doc.fontSize(9).font('Helvetica-Bold');
      const headers = ['Name', 'Dept', 'Role', 'Shift', 'Status', 'In Time', 'Out Time', 'Total', 'Late'];
      const colWidths = [100, 80, 70, 60, 50, 50, 50, 50, 40];
      let currentX = 40;

      headers.forEach((header, i) => {
        doc.text(header, currentX, currentY, { width: colWidths[i], align: 'left' });
        currentX += colWidths[i];
      });

      currentY += rowHeight;
      doc.moveTo(40, currentY - 5).lineTo(550, currentY - 5).stroke();

      // Draw table rows
      doc.font('Helvetica').fontSize(8);
      records.forEach((record) => {
        if (currentY > 750) {
          doc.addPage();
          currentY = 40;
        }

        const totalTime = record.totalMinutes 
          ? `${Math.floor(record.totalMinutes / 60)}:${String(record.totalMinutes % 60).padStart(2, '0')}`
          : 'N/A';

        const rowData = [
          record.name || 'N/A',
          record.department || 'N/A',
          record.role || 'N/A',
          record.shiftTiming || 'N/A',
          record.attendance || 'Absent',
          record.inTime || 'N/A',
          record.outTime || 'N/A',
          totalTime,
          record.late || 'No'
        ];

        currentX = 40;
        rowData.forEach((data, i) => {
          doc.text(String(data).substring(0, 20), currentX, currentY, { width: colWidths[i], align: 'left' });
          currentX += colWidths[i];
        });

        currentY += rowHeight;
      });

    } else if (reportType === 'monthly') {
      // Monthly Report
      const reportMonth = month || new Date().toISOString().slice(0, 7);
      const [year, monthNum] = reportMonth.split('-');
      const daysInMonth = new Date(year, monthNum, 0).getDate();

      const query = `
        SELECT 
          e.${pk} as employeeid,
          e.name,
          d.departmentname as department,
          r.rolename as role
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN roles r ON e.role_id = r.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY e.name
      `;

      const employees = await db.query(query, params);

      // Get attendance for employees
      const records = await Promise.all(employees.map(async (emp) => {
        const attendanceQuery = `
          SELECT 
            DAY(date) as day,
            attendance_status
          FROM employee_attendance
          WHERE employee_id = ? 
            AND YEAR(date) = ? 
            AND MONTH(date) = ?
        `;
        
        const attendance = await db.query(attendanceQuery, [emp.employeeid, year, monthNum]);
        
        const dailyStatus = Array(daysInMonth).fill('-');
        attendance.forEach(att => {
          const dayIndex = att.day - 1;
          dailyStatus[dayIndex] = att.attendance_status === 'present' ? 'P' : 
                                  att.attendance_status === 'absent' ? 'A' : 
                                  att.attendance_status === 'leave' ? 'L' : 'H';
        });

        // Mark weekends
        for (let i = 0; i < daysInMonth; i++) {
          const dayDate = new Date(year, monthNum - 1, i + 1);
          if ((dayDate.getDay() === 0 || dayDate.getDay() === 6) && dailyStatus[i] === '-') {
            dailyStatus[i] = 'WO';
          }
        }

        return { ...emp, dailyStatus };
      }));

      // Add title
      doc.fontSize(16).font('Helvetica-Bold').text('Monthly Attendance Report', { align: 'center' });
      doc.fontSize(11).font('Helvetica').text(`Month: ${reportMonth}`, { align: 'center' });
      doc.moveDown();

      // Monthly table (simplified for PDF)
      doc.fontSize(8).font('Helvetica-Bold');
      let y = doc.y;
      doc.text('Employee', 30, y);
      doc.text('Department', 150, y);
      doc.text('Present Days', 250, y);
      doc.text('Absent Days', 350, y);
      doc.text('Leaves', 450, y);
      y += 20;

      doc.font('Helvetica').fontSize(7);
      records.forEach(record => {
        if (y > 500) {
          doc.addPage();
          y = 40;
        }

        const presentCount = record.dailyStatus.filter(s => s === 'P').length;
        const absentCount = record.dailyStatus.filter(s => s === 'A').length;
        const leaveCount = record.dailyStatus.filter(s => s === 'L').length;

        doc.text(record.name, 30, y);
        doc.text(record.department || 'N/A', 150, y);
        doc.text(String(presentCount), 250, y);
        doc.text(String(absentCount), 350, y);
        doc.text(String(leaveCount), 450, y);
        y += 18;
      });

    } else if (reportType === 'custom') {
      // Custom Date Range Report
      const fromDate = startDate || new Date().toISOString().split('T')[0];
      const toDate = endDate || new Date().toISOString().split('T')[0];

      const query = `
        SELECT 
          e.${pk} as employeeid,
          e.name,
          d.departmentname as department,
          r.rolename as role
          a.date,
          COALESCE(a.attendance_status, 'Absent') as attendance,
          TIME_FORMAT(a.clock_in_time, '%H:%i') as inTime,
          TIME_FORMAT(a.clock_out_time, '%H:%i') as outTime,
          TIMESTAMPDIFF(MINUTE, a.clock_in_time, a.clock_out_time) as totalMinutes
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN roles r ON e.role_id = r.id
        LEFT JOIN employee_attendance a ON e.${pk} = a.employee_id 
          AND a.date BETWEEN ? AND ?
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY a.date, e.name
      `;

      const records = await db.query(query, [fromDate, toDate, ...params]);

      // Add title
      doc.fontSize(16).font('Helvetica-Bold').text('Custom Date Range Attendance Report', { align: 'center' });
      doc.fontSize(11).font('Helvetica').text(`From: ${fromDate} To: ${toDate}`, { align: 'center' });
      doc.moveDown();

      // Table header
      const startY = doc.y;
      const rowHeight = 22;
      let currentY = startY;

      doc.fontSize(8).font('Helvetica-Bold');
      const headers = ['Date', 'Name', 'Dept', 'Role', 'Status', 'In Time', 'Out Time', 'Total'];
      const colWidths = [70, 100, 80, 70, 60, 60, 60, 50];
      let currentX = 40;

      headers.forEach((header, i) => {
        doc.text(header, currentX, currentY, { width: colWidths[i], align: 'left' });
        currentX += colWidths[i];
      });

      currentY += rowHeight;
      doc.moveTo(40, currentY - 5).lineTo(550, currentY - 5).stroke();

      // Draw table rows
      doc.font('Helvetica').fontSize(7);
      records.forEach((record) => {
        if (currentY > 750) {
          doc.addPage();
          currentY = 40;
        }

        const totalTime = record.totalMinutes 
          ? `${Math.floor(record.totalMinutes / 60)}:${String(record.totalMinutes % 60).padStart(2, '0')}`
          : 'N/A';

        const rowData = [
          record.date || 'N/A',
          record.name || 'N/A',
          record.department || 'N/A',
          record.role || 'N/A',
          record.attendance || 'Absent',
          record.inTime || 'N/A',
          record.outTime || 'N/A',
          totalTime
        ];

        currentX = 40;
        rowData.forEach((data, i) => {
          doc.text(String(data).substring(0, 20), currentX, currentY, { width: colWidths[i], align: 'left' });
          currentX += colWidths[i];
        });

        currentY += rowHeight;
      });
    }

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Download attendance report error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Attendance Summary (Weekly / Monthly)
router.get('/attendance/summary/:type', async (req, res) => {
  const { type } = req.params;

  try {
    let query = "";

    if (type === "weekly") {
      query = `
        SELECT 
          YEARWEEK(date, 1) AS period_key,
          CONCAT('Week ', WEEK(date)) AS period,
          SUM(status = 'Present') AS present,
          SUM(status = 'Absent') AS absent,
          SUM(status = 'Halfday') AS halfday
        FROM attendance_summary
        GROUP BY YEARWEEK(date, 1)
        ORDER BY period_key DESC;
      `;
    }

    if (type === "monthly") {
      query = `
        SELECT 
          DATE_FORMAT(date, '%Y-%m') AS period_key,
          DATE_FORMAT(date, '%M %Y') AS period,
          SUM(status = 'Present') AS present,
          SUM(status = 'Absent') AS absent,
          SUM(status = 'Halfday') AS halfday
        FROM attendance_summary
        GROUP BY DATE_FORMAT(date, '%Y-%m')
        ORDER BY period_key DESC;
      `;
    }

    // FIXED
    const rows = await db.query(query);

    res.json({ success: true, data: rows });

  } catch (err) {
    console.error('Attendance summary error:', err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});




module.exports = router;