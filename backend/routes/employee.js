const express = require('express');
const { db } = require('../database');
const { authenticateEmployee } = require('../auth');

const router = express.Router();

// Get Employee Profile
router.get('/profile', authenticateEmployee, async (req, res) => {
  try {
    console.log('📋 Employee profile request - req.employee:', req.employee);
    
    // Ensure employee ID exists
    if (!req.employee || !req.employee.id) {
      console.error('❌ No employee ID in token');
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    
    const dbName = require('../config').DB_CONFIG.database;
    
    // Detect schema columns
    const pkCol = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'employees' 
       AND column_name IN ('enroll_id','person_id','employeeid','id') LIMIT 1`,
      [dbName]
    );
    const pk = pkCol.length > 0 ? pkCol[0].column_name : 'id';
    
    const hasDeptId = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'employees' 
       AND column_name = 'department_id' LIMIT 1`,
      [dbName]
    );
    const hasRoleId = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'employees' 
       AND column_name = 'role_id' LIMIT 1`,
      [dbName]
    );
    const statusCol = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'employees' 
       AND column_name IN ('status','statusflag') LIMIT 1`,
      [dbName]
    );
    const statusField = statusCol.length > 0 ? statusCol[0].column_name : 'statusflag';
    const statusCondition = statusField === 'status' ? `e.status = 'active'` : `e.statusflag = 1`;
    
    // Build dynamic SQL
    let sql = `SELECT e.*`;
    if (hasDeptId.length > 0) sql += `, d.departmentname`;
    else sql += `, e.department AS departmentname`;
    if (hasRoleId.length > 0) sql += `, r.rolename`;
    else sql += `, e.role AS rolename`;
    sql += ` FROM employees e`;
    if (hasDeptId.length > 0) sql += ` LEFT JOIN departments d ON e.department_id = d.id`;
    if (hasRoleId.length > 0) sql += ` LEFT JOIN roles r ON e.role_id = r.id`;
    sql += ` WHERE e.${pk} = ? AND ${statusCondition}`;
    
    console.log('🔍 Querying with SQL:', sql);
    console.log('🔍 Parameters:', [req.employee.id]);
    
    const employee = await db.query(sql, [req.employee.id]);

    if (!employee.length) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Add employeeid as formatted display ID
    const profile = {
      ...employee[0],
      employeeid: `EMP${employee[0][pk].toString().padStart(3, '0')}`
    };

    res.json(profile);
  } catch (error) {
    console.error('Get employee profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Employee Attendance History
router.get('/attendance', authenticateEmployee, async (req, res) => {
  try {
    const { month, year } = req.query;
    const employeeId = req.employee.id;

    console.log('📊 Fetching attendance for employee id:', employeeId, 'Month:', month, 'Year:', year);

    // First, get the employee's enroll_id/person_id from database
    const dbName = require('../config').DB_CONFIG.database;
    const empIdCol = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'employees' 
       AND column_name IN ('person_id','enroll_id','employeeid','id') 
       ORDER BY FIELD(column_name, 'person_id', 'enroll_id', 'employeeid', 'id') LIMIT 1`,
      [dbName]
    );
    const empIdField = empIdCol.length > 0 ? empIdCol[0].column_name : 'person_id';

    const employeeData = await db.query(`SELECT ${empIdField} as enroll_id FROM employees WHERE ${empIdField} = ?`, [employeeId]);
    
    if (!employeeData || employeeData.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const enrollId = employeeData[0].enroll_id;
    console.log('🔍 Employee enroll_id:', enrollId);

    // Fetch attendance from PHP API
    const http = require('http');
    const https = require('https');
    const url = require('url');
    
    const PHP_PERSONS_API = process.env.PHP_PERSONS_API || process.env.REACT_APP_PHP_PERSONS_API || 'http://localhost/Realtime_Mysql/get_persons.php';
    const phpBase = PHP_PERSONS_API.replace('get_persons.php', '');
    let apiUrl = `${phpBase}get_attendance_summary_api.php?enroll_id=${enrollId}`;
    
    if (month && year) {
      apiUrl += `&month=${month}&year=${year}`;
    }

    console.log('🌐 Fetching from PHP API:', apiUrl);

    const fetchAttendance = () => {
      return new Promise((resolve) => {
        const parsed = url.parse(apiUrl);
        const getter = parsed.protocol === 'https:' ? https : http;
        const options = {
          hostname: parsed.hostname,
          port: parsed.port,
          path: parsed.path,
          method: 'GET'
        };

        const proxyReq = getter.request(options, proxyRes => {
          let data = '';
          proxyRes.on('data', chunk => data += chunk);
          proxyRes.on('end', () => {
            try {
              const json = JSON.parse(data);
              resolve(Array.isArray(json) ? json : []);
            } catch (err) {
              console.error('Failed to parse PHP response:', err);
              resolve([]);
            }
          });
        });

        proxyReq.on('error', (err) => {
          console.error('Error fetching PHP attendance:', err);
          resolve([]);
        });

        proxyReq.end();
      });
    };

    const attendance = await fetchAttendance();

    console.log('📥 Fetched attendance records:', attendance.length);

    // Calculate statistics
    let total_days = attendance.length;
    let present_days = 0;
    let absent_days = 0;
    let late_days = 0;

    attendance.forEach(record => {
      const status = record.status || record.attendance_status || '';
      const timeStatus = record.late_status || record.time_status || '';
      
      if (status === 'P' || status === 'present') {
        present_days++;
      } else if (status === 'A' || status === 'absent') {
        absent_days++;
      }
      
      if (timeStatus === 'Late' || timeStatus === 'late' || timeStatus === 'L') {
        late_days++;
      }
    });

    res.json({
      attendance: attendance,
      statistics: {
        total_days,
        present_days,
        absent_days,
        late_days
      }
    });

  } catch (error) {
    console.error('Get employee attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Public Holidays
router.get('/holidays', authenticateEmployee, async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const holidays = await db.query(`
      SELECT id, date_from, date_to, description, created_at 
      FROM holidays 
      WHERE YEAR(date_from) = ? OR YEAR(date_to) = ?
      ORDER BY date_from ASC
    `, [currentYear, currentYear]);

    res.json(holidays);
  } catch (error) {
    console.error('Get holidays error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Employee Notifications
router.get('/notifications', authenticateEmployee, async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const { limit = 50, unreadOnly } = req.query;

    // Detect employee_id column in notifications table
    const dbName = require('../config').DB_CONFIG.database;
    const empIdCol = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'notifications' 
       AND column_name IN ('employee_id','enroll_id','person_id','employeeid') LIMIT 1`,
      [dbName]
    );
    const empCol = empIdCol.length > 0 ? empIdCol[0].column_name : 'employee_id';

    let query = `
      SELECT * FROM notifications 
      WHERE ${empCol} = ?
    `;
    
    if (unreadOnly === 'true') {
      query += ' AND is_read = 0';
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';

    const notifications = await db.query(query, [employeeId, parseInt(limit)]);

    // Get unread count
    const unreadCountResult = await db.query(
      `SELECT COUNT(*) as count FROM notifications WHERE ${empCol} = ? AND is_read = 0`,
      [employeeId]
    );
    
    const unreadCount = unreadCountResult[0]?.count || 0;

    res.json({
      notifications: notifications,
      unreadCount: unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark Notification as Read
router.put('/notifications/:id/read', authenticateEmployee, async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = req.employee.id;

    // Detect employee_id column
    const dbName = require('../config').DB_CONFIG.database;
    const empIdCol = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'notifications' 
       AND column_name IN ('employee_id','enroll_id','person_id','employeeid') LIMIT 1`,
      [dbName]
    );
    const empCol = empIdCol.length > 0 ? empIdCol[0].column_name : 'employee_id';

    const result = await db.query(
      `UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND ${empCol} = ?`,
      [id, employeeId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record Employee Access (for biometric/facial/barcode tracking)
router.post('/access', authenticateEmployee, async (req, res) => {
  try {
    const { access_type, device_name, device_id } = req.body;
    const employeeId = req.employee.id;

    // Get employee details
    const employee = await db.query(`
      SELECT e.name, d.departmentname, r.rolename
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN roles r ON e.role_id = r.id
      WHERE e.employeeid = ?
    `, [employeeId]);

    if (!employee.length) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const emp = employee[0];

    // Record access
    await db.insert('employee_access', {
      employee_id: employeeId,
      employeeName: emp.name,
      department: emp.departmentname,
      role: emp.rolename,
      access_type,
      device_name,
      device_id
    });

    res.json({ message: 'Access recorded successfully' });
  } catch (error) {
    console.error('Record access error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clock In/Out (Record Attendance)
router.post('/clockin', authenticateEmployee, async (req, res) => {
  try {
    const { device_accessed, access_type = 'manual' } = req.body;
    const employeeId = req.employee.id;
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];

    // Check if already clocked in today
    const existingAttendance = await db.findOne('employee_attendance', {
      employee_id: employeeId,
      date: today
    });

    if (existingAttendance) {
      return res.status(409).json({ error: 'Already clocked in today' });
    }

    // Get employee name
    const employee = await db.findOne('employees', { employeeid: employeeId });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Determine if late (assuming 9:00 AM is the standard time)
    const standardTime = '09:00:00';
    const timeStatus = currentTime > standardTime ? 'late' : 'on_time';

    // Record attendance
    await db.insert('employee_attendance', {
      employee_id: employeeId,
      employeename: employee.name,
      attendance_status: 'present',
      device_accessed,
      time_status: timeStatus,
      check_in_time: currentTime,
      date: today
    });

    res.json({ 
      message: 'Clocked in successfully',
      time_status: timeStatus,
      check_in_time: currentTime
    });

  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clock Out
router.post('/clockout', authenticateEmployee, async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];

    // Find today's attendance record
    const attendance = await db.findOne('employee_attendance', {
      employee_id: employeeId,
      date: today
    });

    if (!attendance) {
      return res.status(404).json({ error: 'No clock-in record found for today' });
    }

    if (attendance.check_out_time) {
      return res.status(409).json({ error: 'Already clocked out today' });
    }

    // Update with clock out time
    await db.update('employee_attendance', 
      { check_out_time: currentTime }, 
      { sno: attendance.sno }
    );

    res.json({ 
      message: 'Clocked out successfully',
      check_out_time: currentTime
    });

  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Notifications for Employee
router.get('/notifications', authenticateEmployee, async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const { limit = 50, unreadOnly = false } = req.query;

    let query = `
      SELECT * FROM notifications 
      WHERE employee_id = ?
      ${unreadOnly === 'true' ? 'AND is_read = 0' : ''}
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const notifications = await db.query(query, [employeeId, parseInt(limit)]);

    // Get unread count
    const unreadCount = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE employee_id = ? AND is_read = 0',
      [employeeId]
    );

    res.json({
      notifications,
      unreadCount: unreadCount[0]?.count || 0
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark Notification as Read
router.put('/notifications/:id/read', authenticateEmployee, async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = req.employee.id;

    // Verify notification belongs to this employee
    const notification = await db.query(
      'SELECT * FROM notifications WHERE id = ? AND employee_id = ?',
      [id, employeeId]
    );

    if (notification.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Mark as read
    await db.query(
      'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ?',
      [id]
    );

    res.json({ message: 'Notification marked as read' });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;