const express = require('express');
const http = require('http');
const https = require('https');
const url = require('url');
const router = express.Router();

// Realtime endpoints now served from DB directly (no external PHP calls)

router.get('/persons', async (req, res) => {
  try {
    const { db } = require('../database');
    const dbName = require('../config').DB_CONFIG.database;

    // Detect the person table name (person or persons)
    const personTableRows = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name IN ('person','persons') LIMIT 1`,
      [dbName]
    );

    const personTable = personTableRows && personTableRows.length > 0 ? personTableRows[0].table_name : null;

    if (!personTable) {
      return res.status(404).json({ error: 'Person table not found in database' });
    }

    const persons = await db.query(`SELECT * FROM ${personTable} ORDER BY name`);
    res.json(persons);
  } catch (err) {
    console.error('Failed to fetch persons from DB:', err.message);
    res.status(500).json({ error: 'Failed to fetch persons from DB', details: err.message });
  }
});

// Attendance summary - query the `attendance_summary` table directly
router.get('/attendance-summary', async (req, res) => {
  try {
    const { enroll_id, date, month, year, start_date, end_date } = req.query;
    const { db } = require('../database');

    let sql = `SELECT * FROM attendance_summary WHERE 1=1`;
    const params = [];

    if (enroll_id) {
      sql += ` AND enroll_id = ?`;
      params.push(enroll_id);
    }

    if (date) {
      sql += ` AND date = ?`;
      params.push(date);
    } else if (month && year) {
      // month and year passed separately
      sql += ` AND DATE_FORMAT(date, '%Y-%m') = ?`;
      params.push(`${year}-${month.toString().padStart(2, '0')}`);
    } else if (month && month.includes('-')) {
      // YYYY-MM format
      sql += ` AND DATE_FORMAT(date, '%Y-%m') = ?`;
      params.push(month);
    } else if (start_date && end_date) {
      sql += ` AND date BETWEEN ? AND ?`;
      params.push(start_date, end_date);
    }

    sql += ` ORDER BY date DESC`;

    const rows = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch attendance_summary from DB:', err.message);
    res.status(500).json({ error: 'Failed to fetch attendance summary', details: err.message });
  }
});

// Attendance report for a single enroll_id (query attendance_summary table)
router.get('/attendance-report', async (req, res) => {
  try {
    const { enrollId, month, year, date, start_date, end_date } = req.query;

    if (!enrollId) {
      return res.status(400).json({ error: 'enrollId is required' });
    }

    const { db } = require('../database');
    let sql = `SELECT * FROM attendance_summary WHERE enroll_id = ?`;
    const params = [enrollId];

    if (date) {
      sql += ` AND date = ?`;
      params.push(date);
    } else if (month && year) {
      sql += ` AND DATE_FORMAT(date, '%Y-%m') = ?`;
      params.push(`${year}-${month.toString().padStart(2, '0')}`);
    } else if (month && month.includes('-')) {
      sql += ` AND DATE_FORMAT(date, '%Y-%m') = ?`;
      params.push(month);
    } else if (start_date && end_date) {
      sql += ` AND date BETWEEN ? AND ?`;
      params.push(start_date, end_date);
    }

    sql += ` ORDER BY date DESC`;
    const rows = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch attendance report from DB:', err.message);
    res.status(500).json({ error: 'Failed to fetch attendance report', details: err.message });
  }
});

// PDF Download endpoint for single employee attendance report (data from DB)
router.get('/attendance-report/download', async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const { enrollId, reportType, date, month, year, startDate, endDate } = req.query;

    if (!enrollId) {
      return res.status(400).json({ error: 'enrollId is required' });
    }

    console.log('📄 Generating PDF for enrollId:', enrollId, 'reportType:', reportType);

    const { db } = require('../database');

    // Build SQL to fetch attendance_summary records
    let sql = `SELECT * FROM attendance_summary WHERE enroll_id = ?`;
    const params = [enrollId];

    if (date) {
      sql += ` AND date = ?`;
      params.push(date);
    } else if (month && year) {
      sql += ` AND DATE_FORMAT(date, '%Y-%m') = ?`;
      params.push(`${year}-${month.toString().padStart(2, '0')}`);
    } else if (month && month.includes('-')) {
      sql += ` AND DATE_FORMAT(date, '%Y-%m') = ?`;
      params.push(month);
    } else if (startDate && endDate) {
      sql += ` AND date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    sql += ` ORDER BY date DESC`;

    const attendanceData = await db.query(sql, params);

    if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
      return res.status(404).json({ error: 'No attendance records found' });
    }

    // Try to get employee name from person/persons table
    let employeeName = 'Unknown';
    try {
      const dbName = require('../config').DB_CONFIG.database;
      const personTableRows = await db.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name IN ('person','persons') LIMIT 1`,
        [dbName]
      );
      const personTable = personTableRows.length > 0 ? personTableRows[0].table_name : null;

      if (personTable) {
        const persons = await db.query(`SELECT name FROM ${personTable} WHERE enroll_id = ? OR id = ? LIMIT 1`, [enrollId, enrollId]);
        if (persons && persons.length > 0) {
          employeeName = persons[0].name;
        }
      }
    } catch (dbErr) {
      console.warn('Could not fetch employee name:', dbErr.message);
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${enrollId}_${Date.now()}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add title
    doc.fontSize(20).font('Helvetica-Bold').text('Biometric Attendance Report', { align: 'center' });
    doc.moveDown(0.5);

    // Add report info
    doc.fontSize(12).font('Helvetica');
    doc.text(`Report Type: ${reportType === 'daily' ? 'Daily' : reportType === 'monthly' ? 'Monthly' : 'Custom Range'}`, { align: 'left' });
    doc.text(`Total Records: ${attendanceData.length}`, { align: 'left' });
    doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'left' });
    doc.moveDown(1);

    // Table headers - proper alignment
    const tableTop = doc.y;
    const col1 = 50;   // Name
    const col2 = 140;  // Date
    const col3 = 220;  // Day
    const col4 = 280;  // Status
    const col5 = 350;  // First In
    const col6 = 440;  // Last Out
    const col7 = 520;  // Late Status

    // Draw header row
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Name', col1, tableTop);
    doc.text('Date', col2, tableTop);
    doc.text('Day', col3, tableTop);
    doc.text('Status', col4, tableTop);
    doc.text('First In', col5, tableTop);
    doc.text('Last Out', col6, tableTop);
    doc.text('Late', col7, tableTop);

    // Draw header line
    doc.moveTo(col1, tableTop + 15).lineTo(570, tableTop + 15).stroke();

    // Table rows
    doc.font('Helvetica').fontSize(9);
    let currentY = tableTop + 25;

    attendanceData.forEach((record, index) => {
      // Check if we need a new page
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;

        // Redraw header on new page
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Name', col1, currentY);
        doc.text('Date', col2, currentY);
        doc.text('Day', col3, currentY);
        doc.text('Status', col4, currentY);
        doc.text('First In', col5, currentY);
        doc.text('Last Out', col6, currentY);
        doc.text('Late', col7, currentY);
        doc.moveTo(col1, currentY + 15).lineTo(570, currentY + 15).stroke();
        currentY += 25;
        doc.font('Helvetica').fontSize(9);
      }

      const recordDate = record.date ? new Date(record.date).toLocaleDateString() : 'N/A';
      const status = record.status === 'P' ? 'Present' : record.status === 'A' ? 'Absent' : (record.status || 'N/A');

      doc.text(employeeName, col1, currentY, { width: 85 });
      doc.text(recordDate, col2, currentY, { width: 75 });
      doc.text(record.day || 'N/A', col3, currentY, { width: 55 });
      doc.text(status, col4, currentY, { width: 65 });
      doc.text(record.first_in || 'N/A', col5, currentY, { width: 85 });
      doc.text(record.last_out || 'N/A', col6, currentY, { width: 75 });
      doc.text(record.late_status || 'On Time', col7, currentY, { width: 60 });

      currentY += 20;

      // Draw row separator
      if (index < attendanceData.length - 1) {
        doc.moveTo(col1, currentY - 5).lineTo(570, currentY - 5).strokeOpacity(0.3).stroke().strokeOpacity(1);
      }
    });

    // Finalize PDF
    doc.end();

  } catch (err) {
    console.error('PDF download error:', err.message);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Attendance report for all employees (JSON) - filters: reportType/date/month/startDate/endDate, departmentId, roleId
router.get('/attendance-report-all', async (req, res) => {
  try {
    const { reportType, date, month, year, startDate, endDate, departmentId, roleId } = req.query;
    const { db } = require('../database');

    let where = [];
    const params = [];

    if (date) {
      where.push('a.date = ?');
      params.push(date);
    } else if (reportType === 'monthly' && month && year) {
      where.push("DATE_FORMAT(a.date, '%Y-%m') = ?");
      params.push(`${year}-${month.toString().padStart(2, '0')}`);
    } else if (month && month.includes('-')) {
      where.push("DATE_FORMAT(a.date, '%Y-%m') = ?");
      params.push(month);
    } else if (reportType === 'custom' && startDate && endDate) {
      where.push('a.date BETWEEN ? AND ?');
      params.push(startDate, endDate);
    }

    if (departmentId) {
      where.push('e.department_id = ?');
      params.push(departmentId);
    }

    if (roleId) {
      where.push('e.role_id = ?');
      params.push(roleId);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
      SELECT a.*, COALESCE(p.name, e.name) as name, e.role as role, d.departmentname as department
      FROM attendance_summary a
      LEFT JOIN person p ON a.enroll_id = p.enroll_id OR a.enroll_id = p.id
      LEFT JOIN employees e ON a.enroll_id = e.enroll_id OR a.enroll_id = e.person_id
      LEFT JOIN departments d ON e.department_id = d.id
      ${whereClause}
      ORDER BY a.date DESC
    `;

    const rows = await db.query(sql, params);

    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error('Failed to fetch attendance report all from DB:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch attendance data', details: err.message });
  }
});

// PDF Download endpoint for all employees attendance report (uses DB)
router.get('/attendance-report-all/download', async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const { reportType, date, month, year, startDate, endDate, departmentId, roleId } = req.query;
    const { db } = require('../database');

    let where = [];
    const params = [];

    if (date) {
      where.push('a.date = ?');
      params.push(date);
    } else if (reportType === 'monthly' && month && year) {
      where.push("DATE_FORMAT(a.date, '%Y-%m') = ?");
      params.push(`${year}-${month.toString().padStart(2, '0')}`);
    } else if (month && month.includes('-')) {
      where.push("DATE_FORMAT(a.date, '%Y-%m') = ?");
      params.push(month);
    } else if (reportType === 'custom' && startDate && endDate) {
      where.push('a.date BETWEEN ? AND ?');
      params.push(startDate, endDate);
    }

    if (departmentId) {
      where.push('e.department_id = ?');
      params.push(departmentId);
    }

    if (roleId) {
      where.push('e.role_id = ?');
      params.push(roleId);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
      SELECT a.*, COALESCE(p.name, e.name) as name, e.role as role, d.departmentname as department
      FROM attendance_summary a
      LEFT JOIN person p ON a.enroll_id = p.enroll_id OR a.enroll_id = p.id
      LEFT JOIN employees e ON a.enroll_id = e.enroll_id OR a.enroll_id = e.person_id
      LEFT JOIN departments d ON e.department_id = d.id
      ${whereClause}
      ORDER BY a.date DESC
    `;

    const attendanceData = await db.query(sql, params);

    if (!attendanceData || attendanceData.length === 0) {
      return res.status(404).json({ error: 'No attendance records found' });
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_report_all_${Date.now()}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add title
    doc.fontSize(20).font('Helvetica-Bold').text('Biometric Attendance Report - All Employees', { align: 'center' });
    doc.moveDown(0.5);

    // Add report info
    doc.fontSize(12).font('Helvetica');
    doc.text(`Report Type: ${reportType === 'daily' ? 'Daily' : reportType === 'monthly' ? 'Monthly' : 'Custom Range'}`, { align: 'left' });
    doc.text(`Total Records: ${attendanceData.length}`, { align: 'left' });
    doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'left' });
    doc.moveDown(1);

    // Table headers (landscape mode with Enroll ID and Name)
    const tableTop = doc.y;
    const col1 = 40;   // Enroll ID
    const col2 = 100;  // Name
    const col3 = 190;  // Date
    const col4 = 260;  // Day
    const col5 = 320;  // Status
    const col6 = 400;  // First In
    const col7 = 500;  // Last Out
    const col8 = 600;  // Late Status

    // Draw header row
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('ID', col1, tableTop);
    doc.text('Name', col2, tableTop);
    doc.text('Date', col3, tableTop);
    doc.text('Day', col4, tableTop);
    doc.text('Status', col5, tableTop);
    doc.text('First In', col6, tableTop);
    doc.text('Last Out', col7, tableTop);
    doc.text('Late Status', col8, tableTop);

    // Draw header line
    doc.moveTo(col1, tableTop + 15).lineTo(780, tableTop + 15).stroke();

    // Table rows
    doc.font('Helvetica').fontSize(9);
    let currentY = tableTop + 25;

    attendanceData.forEach((record, index) => {
      // Check if we need a new page
      if (currentY > 520) {
        doc.addPage();
        currentY = 40;

        // Redraw header on new page
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('ID', col1, currentY);
        doc.text('Name', col2, currentY);
        doc.text('Date', col3, currentY);
        doc.text('Day', col4, currentY);
        doc.text('Status', col5, currentY);
        doc.text('First In', col6, currentY);
        doc.text('Last Out', col7, currentY);
        doc.text('Late Status', col8, currentY);
        doc.moveTo(col1, currentY + 15).lineTo(780, currentY + 15).stroke();
        currentY += 25;
        doc.font('Helvetica').fontSize(9);
      }

      const recordDate = record.date ? new Date(record.date).toLocaleDateString() : 'N/A';
      const status = record.status === 'P' ? 'Present' : record.status === 'A' ? 'Absent' : (record.status || 'N/A');
      const employeeName = employeeNamesMap[record.enroll_id] || 'Unknown';

      doc.text(record.enroll_id || 'N/A', col1, currentY, { width: 55 });
      doc.text(employeeName, col2, currentY, { width: 85 });
      doc.text(recordDate, col3, currentY, { width: 65 });
      doc.text(record.day || 'N/A', col4, currentY, { width: 55 });
      doc.text(status, col5, currentY, { width: 75 });
      doc.text(record.first_in || 'N/A', col6, currentY, { width: 95 });
      doc.text(record.last_out || 'N/A', col7, currentY, { width: 95 });
      doc.text(record.late_status || 'On Time', col8, currentY, { width: 85 });

      currentY += 18;

      // Draw row separator
      if (index < attendanceData.length - 1) {
        doc.moveTo(col1, currentY - 4).lineTo(780, currentY - 4).strokeOpacity(0.3).stroke().strokeOpacity(1);
      }
    });

    // Finalize PDF
    doc.end();
    
  } catch (err) {
    console.error('Error generating PDF:', err);
    res.status(500).json({ error: 'Failed to generate PDF', details: err.message });
  }
});

module.exports = router;
