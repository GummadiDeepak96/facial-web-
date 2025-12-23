const express = require('express');
const { db } = require('../database');
const { authenticateManager } = require('../auth');

const router = express.Router();

// Get Manager Dashboard Statistics (only for their department)
router.get('/dashboard/stats', authenticateManager, async (req, res) => {
  try {
    const managerId = req.manager.id;
    const departmentId = req.manager.departmentId;
    const today = new Date().toISOString().split('T')[0];
    
    let stats = {
      totalEmployees: 0,
      presentToday: 0,
      absentToday: 0,
      lateToday: 0,
      recentAttendance: [],
      employees: [],
      departmentName: req.manager.departmentName,
      departmentId: departmentId
    };

    // Detect schema variations
    const dbName = require('../config').DB_CONFIG.database;
    
    // Detect department column (department vs department_id)
    const deptCol = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'employees' 
       AND column_name IN ('department','department_id') LIMIT 1`,
      [dbName]
    );
    const deptField = deptCol.length > 0 ? deptCol[0].column_name : 'department_id';
    
    // Detect employee ID column (enroll_id, person_id, employeeid, id)
    const empIdCol = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'employees' 
       AND column_name IN ('enroll_id','person_id','employeeid','id') 
       ORDER BY FIELD(column_name, 'enroll_id', 'person_id', 'employeeid', 'id') LIMIT 1`,
      [dbName]
    );
    const empIdField = empIdCol.length > 0 ? empIdCol[0].column_name : 'id';
    
    // Detect status column
    const statusCol = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'employees' 
       AND column_name IN ('status','statusflag') LIMIT 1`,
      [dbName]
    );
    const statusField = statusCol.length > 0 ? statusCol[0].column_name : 'statusflag';
    const statusCondition = statusField === 'status' ? `${statusField} = 'active'` : `${statusField} = 1`;
    
    // Detect person table
    const personTableCheck = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = ? AND table_name IN ('person','persons') LIMIT 1`,
      [dbName]
    );
    const personTable = personTableCheck.length > 0 ? personTableCheck[0].table_name : null;

    // Build WHERE condition for department
    let deptCondition;
    if (deptField === 'department') {
      // department is VARCHAR, use department name
      deptCondition = `e.${deptField} = ?`;
    } else {
      // department_id is INT, use department ID
      deptCondition = `e.${deptField} = ?`;
    }

    try {
      // Get total employees in manager's department
      const totalEmployeesResult = await db.query(
        `SELECT COUNT(*) as count FROM employees e WHERE ${deptCondition} AND ${statusCondition}`,
        [deptField === 'department' ? req.manager.departmentName : departmentId]
      );
      stats.totalEmployees = totalEmployeesResult[0]?.count || 0;
    } catch (err) {
      console.error('Error fetching employees count:', err.message);
    }

    try {
      // PHP DB attendance integration removed
      stats.presentToday = 0;
      stats.lateToday = 0;
      stats.recentAttendance = [];
      stats.absentToday = stats.totalEmployees;
    } catch (err) {
      console.error('Attendance integration removed or skipped:', err.message);
      stats.absentToday = stats.totalEmployees;
    }

    try {
      // Get all employees in manager's department (excluding the manager)
      const managerEmail = req.manager.email;
      
      // Detect role column (role vs role_id)
      const roleCol = await db.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_schema = ? AND table_name = 'employees' 
         AND column_name IN ('role','role_id') LIMIT 1`,
        [dbName]
      );
      const roleField = roleCol.length > 0 ? roleCol[0].column_name : 'role_id';
      const hasRoleId = roleField === 'role_id';
      
      let employeeQuery;
      if (personTable) {
        // Detect person table's ID column
        const personIdCol = await db.query(
          `SELECT column_name FROM information_schema.columns 
           WHERE table_schema = ? AND table_name = ? 
           AND column_name IN ('enroll_id','person_id','id') LIMIT 1`,
          [dbName, personTable]
        );
        const personIdField = personIdCol.length > 0 ? personIdCol[0].column_name : 'enroll_id';
        
        // Join with person/persons table to get name
        employeeQuery = `
          SELECT 
            e.${empIdField} as enroll_id,
            p.name, 
            e.email,
            e.shift,
            ${hasRoleId ? 'r.rolename' : `e.${roleField}`} as role,
            ${deptField === 'department' ? `e.${deptField} as department` : 'd.departmentname as department'},
            e.${statusField} as statusflag
          FROM employees e
          LEFT JOIN ${personTable} p ON e.${empIdField} = p.${personIdField}
          ${hasRoleId ? 'LEFT JOIN roles r ON e.role_id = r.id' : ''}
          ${deptField === 'department_id' ? 'LEFT JOIN departments d ON e.department_id = d.id' : ''}
          WHERE ${deptCondition}
            AND e.email != ?
          ORDER BY p.name
        `;
      } else {
        // Fallback to employees table name column
        employeeQuery = `
          SELECT 
            e.${empIdField} as enroll_id,
            e.name, 
            e.email,
            e.shift,
            ${hasRoleId ? 'r.rolename' : `e.${roleField}`} as role,
            ${deptField === 'department' ? `e.${deptField} as department` : 'd.departmentname as department'},
            e.${statusField} as statusflag
          FROM employees e
          ${hasRoleId ? 'LEFT JOIN roles r ON e.role_id = r.id' : ''}
          ${deptField === 'department_id' ? 'LEFT JOIN departments d ON e.department_id = d.id' : ''}
          WHERE ${deptCondition}
            AND e.email != ?
          ORDER BY e.name
        `;
      }
      
      const deptValue = deptField === 'department' ? req.manager.departmentName : departmentId;
      stats.employees = await db.query(employeeQuery, [deptValue, managerEmail]);
      
      // Normalize statusflag to boolean for frontend
      stats.employees = stats.employees.map(emp => ({
        ...emp,
        statusflag: statusField === 'status' ? (emp.statusflag === 'active' ? 1 : 0) : emp.statusflag
      }));
    } catch (err) {
      console.error('Error fetching employees:', err.message);
    }

    res.json(stats);

  } catch (error) {
    console.error('Manager dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Attendance Report for Department (with date range)
router.get('/attendance/report', authenticateManager, async (req, res) => {
  try {
    const departmentId = req.manager.departmentId;
    const departmentName = req.manager.departmentName;
    const { startDate, endDate } = req.query;
    
    console.log('📊 Fetching attendance for department:', departmentName, 'ID:', departmentId);
    console.log('📅 Date range:', startDate, 'to', endDate);
    
    const { db } = require('../database');
    const http = require('http');
    const https = require('https');
    const url = require('url');
    
    // Step 1: Get employees from this department (from local database)
    // Get: person_id (maps to person.id), role, department, shift from employees table
    const employees = await db.query(
      `SELECT e.person_id, e.role, e.department, e.shift, p.name as employee_name
       FROM employees e
       LEFT JOIN person p ON e.person_id = p.id
       WHERE e.department = ?`,
      [departmentName]
    );

    console.log('👥 Found employees:', employees.length);
    if (employees.length > 0) {
      console.log('📝 Sample employee data:', employees[0]);
    }

    if (employees.length === 0) {
      return res.json({
        startDate,
        endDate,
        department: departmentName,
        records: []
      });
    }

    // Step 2: Fetch attendance from local DB (attendance_summary table)
    // Get: date, day, status, first_in, last_out, late_status
    const fetchAttendanceForEmployee = async (personId) => {
      try {
        const { db } = require('../database');
        let sql = `SELECT * FROM attendance_summary WHERE enroll_id = ?`;
        const params = [personId];

        if (startDate === endDate) {
          sql += ` AND date = ?`;
          params.push(startDate);
        } else {
          sql += ` AND date BETWEEN ? AND ?`;
          params.push(startDate, endDate);
        }

        sql += ` ORDER BY date DESC`;
        const rows = await db.query(sql, params);
        return rows;
      } catch (err) {
        console.error('Error querying attendance_summary for person:', personId, err.message);
        return [];
      }
    };

    // Fetch attendance for all department employees
    const attendancePromises = employees.map(emp => fetchAttendanceForEmployee(emp.person_id));
    const attendanceResults = await Promise.all(attendancePromises);
    
    // Step 3: Combine data from all three sources
    // person table: employee_name
    // employees table: role, department, shift
    // attendance_summary: date, day, status, first_in, last_out, late_status
    const records = [];
    attendanceResults.forEach((empAttendance, index) => {
      const employee = employees[index];
      empAttendance.forEach(record => {
        records.push({
          employee_name: employee.employee_name || 'Unknown',
          department: employee.department || departmentName,
          role: employee.role || 'N/A',
          shift: employee.shift || 'N/A',
          date: record.date,
          day: record.day,
          status: record.status,
          first_in: record.first_in,
          last_out: record.last_out,
          late_status: record.late_status,
          // Backward compatibility
          clock_in_time: record.first_in,
          clock_out_time: record.last_out,
          time_status: record.late_status
        });
      });
    });

    console.log('📋 Total attendance records:', records.length);

    res.json({
      startDate,
      endDate,
      department: departmentName,
      records
    });

  } catch (error) {
    console.error('Get attendance report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Department Employees List
router.get('/employees', authenticateManager, async (req, res) => {
  try {
    const departmentId = req.manager.departmentId;

    // Detect if person or persons table exists
    const dbName = require('../config').DB_CONFIG.database;
    const personTableCheck = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = ? AND table_name IN ('person','persons') LIMIT 1`,
      [dbName]
    );
    const personTable = personTableCheck.length > 0 ? personTableCheck[0].table_name : null;

    let employeesQuery;
    if (personTable) {
      employeesQuery = `
        SELECT 
          e.employeeid as id,
          p.name,
          e.email,
          r.rolename as role,
          e.statusflag
        FROM employees e
        LEFT JOIN ${personTable} p ON e.enroll_id = p.enroll_id
        LEFT JOIN roles r ON e.role_id = r.id
        WHERE e.department_id = ?
        ORDER BY p.name
      `;
    } else {
      employeesQuery = `
        SELECT 
          e.employeeid as id,
          e.name,
          e.email,
          r.rolename as role,
          e.statusflag
        FROM employees e
        LEFT JOIN roles r ON e.role_id = r.id
        WHERE e.department_id = ?
        ORDER BY e.name
      `;
    }

    const employees = await db.query(employeesQuery, [departmentId]);

    res.json(employees);

  } catch (error) {
    console.error('Get department employees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Specific Employee Details
router.get('/employees/:id', authenticateManager, async (req, res) => {
  try {
    const departmentId = req.manager.departmentId;
    const employeeId = req.params.id; // This is now enroll_id

    // Detect if person or persons table exists
    const dbName = require('../config').DB_CONFIG.database;
    const personTableCheck = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = ? AND table_name IN ('person','persons') LIMIT 1`,
      [dbName]
    );
    const personTable = personTableCheck.length > 0 ? personTableCheck[0].table_name : null;

    let employeeQuery;
    if (personTable) {
      employeeQuery = `
        SELECT 
          e.*,
          p.name,
          d.departmentname as department,
          r.rolename as role
        FROM employees e
        LEFT JOIN ${personTable} p ON e.enroll_id = p.enroll_id
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN roles r ON e.role_id = r.id
        WHERE e.enroll_id = ? AND e.department_id = ?
      `;
    } else {
      employeeQuery = `
        SELECT 
          e.*,
          d.departmentname as department,
          r.rolename as role
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN roles r ON e.role_id = r.id
        WHERE e.enroll_id = ? AND e.department_id = ?
      `;
    }

    const employees = await db.query(employeeQuery, [employeeId, departmentId]);

    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found or not in your department' });
    }

    res.json(employees[0]);

  } catch (error) {
    console.error('Get employee details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Employee Attendance History
router.get('/employees/:id/attendance', authenticateManager, async (req, res) => {
  try {
    const departmentId = req.manager.departmentId;
    const employeeId = req.params.id; // This is now enroll_id

    // Verify employee belongs to manager's department
    const employee = await db.query(
      'SELECT * FROM employees WHERE enroll_id = ? AND department_id = ?',
      [employeeId, departmentId]
    );

    if (employee.length === 0) {
      return res.status(403).json({ error: 'Access denied to this employee' });
    }

    const attendance = await db.query(`
      SELECT * FROM attendance 
      WHERE employee_id = ?
      ORDER BY date DESC
      LIMIT 90
    `, [employeeId]);

    res.json(attendance);

  } catch (error) {
    console.error('Get employee attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Employee Status (Active/Inactive)
router.put('/employees/:id/status', authenticateManager, async (req, res) => {
  try {
    const departmentId = req.manager.departmentId;
    const employeeId = req.params.id; // This is now enroll_id
    const { statusflag } = req.body;

    console.log('🔄 Update status request:', { employeeId, statusflag, departmentId });

    // Verify employee belongs to manager's department
    const employee = await db.query(
      'SELECT * FROM employees WHERE enroll_id = ? AND department_id = ?',
      [employeeId, departmentId]
    );

    if (employee.length === 0) {
      return res.status(403).json({ error: 'Access denied to this employee' });
    }

    // Update employee status
    await db.query(
      'UPDATE employees SET statusflag = ? WHERE enroll_id = ?',
      [statusflag, employeeId]
    );

    console.log('✅ Status updated successfully');

    res.json({ 
      success: true, 
      message: `Employee status updated to ${statusflag ? 'Active' : 'Inactive'}` 
    });

  } catch (error) {
    console.error('Update employee status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Attendance Report with Filters (like admin)
router.get('/attendance-report', authenticateManager, async (req, res) => {
  try {
    const departmentId = req.manager.departmentId;
    const { reportType, date, month, startDate, endDate, roleId, employeeId } = req.query;

    let query = `
      SELECT 
        e.employeeid,
        e.name,
        e.email,
        e.mobile,
        d.departmentname as department,
        r.rolename as role,
        a.date,
        COALESCE(a.attendance_status, 'Absent') as attendance,
        TIME_FORMAT(a.clock_in_time, '%H:%i') as inTime,
        TIME_FORMAT(a.clock_out_time, '%H:%i') as outTime,
        a.time_status as timeStatus,
        TIMESTAMPDIFF(MINUTE, a.clock_in_time, a.clock_out_time) as totalMinutes
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN roles r ON e.role_id = r.id
    `;

    const params = [];
    const whereConditions = [`e.department_id = ?`];
    params.push(departmentId);

    if (reportType === 'daily' && date) {
      query += ` LEFT JOIN employee_attendance a ON e.employeeid = a.employee_id AND a.date = ?`;
      params.push(date);
    } else if (reportType === 'monthly' && month) {
      query += ` LEFT JOIN employee_attendance a ON e.employeeid = a.employee_id AND DATE_FORMAT(a.date, '%Y-%m') = ?`;
      params.push(month);
    } else if (reportType === 'custom' && startDate && endDate) {
      query += ` LEFT JOIN employee_attendance a ON e.employeeid = a.employee_id AND a.date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    } else {
      query += ` LEFT JOIN employee_attendance a ON e.employeeid = a.employee_id`;
    }

    if (roleId) {
      whereConditions.push('e.role_id = ?');
      params.push(parseInt(roleId));
    }

    if (employeeId) {
      whereConditions.push('e.employeeid = ?');
      params.push(parseInt(employeeId));
    }

    query += ` WHERE ${whereConditions.join(' AND ')} ORDER BY a.date DESC, e.name`;

    const records = await db.query(query, params);

    // Format total time
    records.forEach(record => {
      if (record.totalMinutes) {
        const hours = Math.floor(record.totalMinutes / 60);
        const minutes = record.totalMinutes % 60;
        record.totalTime = `${hours}:${String(minutes).padStart(2, '0')}`;
      } else {
        record.totalTime = 'N/A';
      }
    });

    res.json({
      reportType,
      date,
      month,
      startDate,
      endDate,
      records
    });

  } catch (error) {
    console.error('Get attendance report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download Attendance Report PDF (like admin)
router.get('/attendance-report/download', authenticateManager, async (req, res) => {
  try {
    const departmentId = req.manager.departmentId;
    const { reportType, date, month, startDate, endDate, roleId, employeeId } = req.query;

    // Reuse the same query logic as above
    let query = `
      SELECT 
        e.employeeid,
        e.name,
        e.email,
        e.mobile,
        d.departmentname as department,
        r.rolename as role,
        a.date,
        COALESCE(a.attendance_status, 'Absent') as attendance,
        TIME_FORMAT(a.clock_in_time, '%H:%i') as inTime,
        TIME_FORMAT(a.clock_out_time, '%H:%i') as outTime,
        a.time_status as timeStatus,
        TIMESTAMPDIFF(MINUTE, a.clock_in_time, a.clock_out_time) as totalMinutes
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN roles r ON e.role_id = r.id
    `;

    const params = [];
    const whereConditions = [`e.department_id = ?`];
    params.push(departmentId);

    if (reportType === 'daily' && date) {
      query += ` LEFT JOIN employee_attendance a ON e.employeeid = a.employee_id AND a.date = ?`;
      params.push(date);
    } else if (reportType === 'monthly' && month) {
      query += ` LEFT JOIN employee_attendance a ON e.employeeid = a.employee_id AND DATE_FORMAT(a.date, '%Y-%m') = ?`;
      params.push(month);
    } else if (reportType === 'custom' && startDate && endDate) {
      query += ` LEFT JOIN employee_attendance a ON e.employeeid = a.employee_id AND a.date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    } else {
      query += ` LEFT JOIN employee_attendance a ON e.employeeid = a.employee_id`;
    }

    if (roleId) {
      whereConditions.push('e.role_id = ?');
      params.push(parseInt(roleId));
    }

    if (employeeId) {
      whereConditions.push('e.employeeid = ?');
      params.push(parseInt(employeeId));
    }

    query += ` WHERE ${whereConditions.join(' AND ')} ORDER BY a.date DESC, e.name`;

    const records = await db.query(query, params);

    // Generate PDF using pdfkit
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-report-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`);

    doc.pipe(res);

    // Add title
    doc.fontSize(16).font('Helvetica-Bold').text('Attendance Report', { align: 'center' });
    doc.fontSize(11).font('Helvetica').text(`Report Type: ${reportType}`, { align: 'center' });
    if (date) doc.text(`Date: ${date}`, { align: 'center' });
    if (month) doc.text(`Month: ${month}`, { align: 'center' });
    if (startDate && endDate) doc.text(`Period: ${startDate} to ${endDate}`, { align: 'center' });
    doc.moveDown();

    // Table header
    const startY = doc.y;
    const rowHeight = 22;
    let currentY = startY;

    doc.fontSize(8).font('Helvetica-Bold');
    const headers = ['Name', 'Date', 'Status', 'In Time', 'Out Time', 'Hours'];
    const colWidths = [120, 70, 60, 60, 60, 50];
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
        record.name || 'N/A',
        record.date || 'N/A',
        record.attendance || 'Absent',
        record.inTime || 'N/A',
        record.outTime || 'N/A',
        totalTime
      ];

      currentX = 40;
      rowData.forEach((data, i) => {
        doc.text(String(data).substring(0, 25), currentX, currentY, { width: colWidths[i], align: 'left' });
        currentX += colWidths[i];
      });

      currentY += rowHeight;
    });

    doc.end();

  } catch (error) {
    console.error('Download report error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Change Password for Manager
router.post('/change-password', authenticateManager, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const managerId = req.manager.id;

    // Validate input
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Get manager from database
    const managers = await db.query('SELECT * FROM managers WHERE id = ?', [managerId]);
    const manager = managers[0];

    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    // Hash new password
    const { hashPassword } = require('../auth');
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await db.query(
      'UPDATE managers SET password = ? WHERE id = ?',
      [hashedPassword, managerId]
    );

    // Send confirmation email if email service is available
    try {
      const { sendPasswordChangeConfirmation } = require('../utils/emailService');
      await sendPasswordChangeConfirmation(manager.email, manager.name || 'Manager');
    } catch (emailErr) {
      console.error('Failed to send password change confirmation email:', emailErr.message);
      // Don't fail the request if email fails
    }

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Manager change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
