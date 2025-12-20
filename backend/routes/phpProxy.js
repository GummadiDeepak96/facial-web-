const express = require('express');
const http = require('http');
const https = require('https');
const url = require('url');
const router = express.Router();

const PHP_PERSONS_API = process.env.PHP_PERSONS_API || process.env.REACT_APP_PHP_PERSONS_API || 'http://localhost/Realtime_Mysql/get_persons.php';

const PHP_ATT_SUMMARY_API = process.env.PHP_ATT_SUMMARY_API || PHP_PERSONS_API.replace('get_persons.php', 'attendance_summary.php');

router.get('/persons', async (req, res) => {
  try {
    const parsed = url.parse(PHP_PERSONS_API);
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
          res.json(json);
        } catch (err) {
          // If not JSON, just forward raw
          res.send(data);
        }
      });
    });

    proxyReq.on('error', (err) => {
      console.error('Error proxying PHP persons API:', err.message);
      res.status(502).json({ error: 'Failed to fetch persons from PHP API', details: err.message });
    });

    proxyReq.end();
  } catch (err) {
    console.error('Proxy persons handler error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Proxy for attendance summary (tolerant)
router.get('/attendance-summary', async (req, res) => {
  try {
    const target = process.env.PHP_ATT_SUMMARY_API || PHP_ATT_SUMMARY_API;
    const parsed = url.parse(target);
    const getter = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.path + (req.url.includes('?') ? '' : ''),
      method: 'GET'
    };

    const proxyReq = getter.request(options, proxyRes => {
      let data = '';
      proxyRes.on('data', chunk => data += chunk);
      proxyRes.on('end', () => {
        try {
          const json = JSON.parse(data);
          res.json(json);
        } catch (err) {
          // If not JSON, forward raw text
          res.send(data);
        }
      });
    });

    proxyReq.on('error', (err) => {
      console.error('Error proxying PHP attendance summary API:', err.message);
      res.status(502).json({ error: 'Failed to fetch attendance summary from PHP API', details: err.message });
    });

    proxyReq.end();
  } catch (err) {
    console.error('Proxy attendance handler error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Proxy for attendance report by enrollId, month, year
router.get('/attendance-report', async (req, res) => {
  try {
    const { enrollId, month, year } = req.query;
    
    if (!enrollId) {
      return res.status(400).json({ error: 'enrollId is required' });
    }

    // Build the PHP API URL for attendance (adjust based on your PHP endpoint)
    const phpBase = PHP_PERSONS_API.replace('get_persons.php', '');
    const target = `${phpBase}get_attendance.php?enroll_id=${enrollId}&month=${month || ''}&year=${year || ''}`;
    
    console.log('📊 Proxying attendance request to:', target);
    
    const parsed = url.parse(target);
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
          res.json(json);
        } catch (err) {
          // If not JSON, forward raw text
          res.send(data);
        }
      });
    });

    proxyReq.on('error', (err) => {
      console.error('Error proxying PHP attendance report:', err.message);
      res.status(502).json({ error: 'Failed to fetch attendance report from PHP API', details: err.message });
    });

    proxyReq.end();
  } catch (err) {
    console.error('Proxy attendance report error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PDF Download endpoint for single employee attendance report
router.get('/attendance-report/download', async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const { enrollId, reportType, date, month, year, startDate, endDate } = req.query;
    
    if (!enrollId) {
      return res.status(400).json({ error: 'enrollId is required' });
    }

    console.log('📄 Generating PDF for enrollId:', enrollId, 'reportType:', reportType);

    // Fetch attendance data from PHP API
    const phpBase = PHP_PERSONS_API.replace('get_persons.php', '');
    let target = `${phpBase}get_attendance_summary_api.php?enroll_id=${enrollId}`;
    
    if (reportType === 'daily' && date) {
      target += `&date=${date}`;
    } else if (reportType === 'monthly' && month) {
      target += `&month=${month}&year=${year || new Date().getFullYear()}`;
    } else if (reportType === 'custom' && startDate && endDate) {
      target += `&start_date=${startDate}&end_date=${endDate}`;
    }
    
    console.log('🌐 Fetching data from:', target);
    
    const parsed = url.parse(target);
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
      proxyRes.on('end', async () => {
        try {
          const attendanceData = JSON.parse(data);
          
          if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
            return res.status(404).json({ error: 'No attendance records found' });
          }

          // Fetch employee name from database using enroll_id
          const { db } = require('../database');
          let employeeName = 'Unknown';
          
          try {
            console.log('🔍 Fetching employee name for enrollId:', enrollId);
            
            // Check if person table exists
            const [personTableExists] = await db.query(`
              SELECT COUNT(*) as count 
              FROM information_schema.tables 
              WHERE table_schema = DATABASE() 
              AND table_name = 'person'
            `);
            
            console.log('📊 Person table exists:', personTableExists.count > 0);
            
            if (personTableExists.count > 0) {
              // Get employee name from person table
              // The person.id column values match the attendance_summary.enroll_id values
              console.log('📝 Executing query: SELECT name FROM person WHERE id =', enrollId);
              
              const persons = await db.query(
                `SELECT name FROM person WHERE id = ?`,
                [enrollId]
              );
              
              console.log('👤 Query result:', persons);
              
              if (persons && persons.length > 0) {
                employeeName = persons[0].name;
                console.log('✅ Found employee name:', employeeName);
              } else {
                console.warn('⚠️ No person found with id =', enrollId);
              }
            }
          } catch (dbErr) {
            console.error('❌ Database error:', dbErr.message);
            console.error(dbErr);
          }
          
          console.log('📄 Using employee name in PDF:', employeeName);

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
          console.error('Error generating PDF:', err);
          res.status(500).json({ error: 'Failed to generate PDF', details: err.message });
        }
      });
    });

    proxyReq.on('error', (err) => {
      console.error('Error fetching attendance data:', err.message);
      res.status(502).json({ error: 'Failed to fetch attendance data from PHP API', details: err.message });
    });

    proxyReq.end();
  } catch (err) {
    console.error('PDF download error:', err.message);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// PDF Download endpoint for all employees attendance report
router.get('/attendance-report-all/download', async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const { reportType, date, month, year, startDate, endDate, departmentId, roleId } = req.query;
    
    console.log('📄 Generating PDF for all employees, reportType:', reportType);

    // Fetch attendance data from PHP API (without enroll_id to get all)
    const phpBase = PHP_PERSONS_API.replace('get_persons.php', '');
    let target = `${phpBase}get_attendance_summary_api.php?`;
    
    if (reportType === 'daily' && date) {
      target += `date=${date}`;
    } else if (reportType === 'monthly' && month) {
      target += `month=${month}&year=${year || new Date().getFullYear()}`;
    } else if (reportType === 'custom' && startDate && endDate) {
      target += `start_date=${startDate}&end_date=${endDate}`;
    }
    
    console.log('🌐 Fetching data from:', target);
    
    const parsed = url.parse(target);
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
      proxyRes.on('end', async () => {
        try {
          const attendanceData = JSON.parse(data);
          
          if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
            return res.status(404).json({ error: 'No attendance records found' });
          }

          // Fetch all employee names from database
          const { db } = require('../database');
          const employeeNamesMap = {};
          
          try {
            // Check if person table exists
            const [personTableExists] = await db.query(`
              SELECT COUNT(*) as count 
              FROM information_schema.tables 
              WHERE table_schema = DATABASE() 
              AND table_name = 'person'
            `);
            
            if (personTableExists.count > 0) {
              // Get all employee names from person table
              // The person.id column values match the attendance_summary.enroll_id values
              const persons = await db.query(`SELECT id as enroll_id, name FROM person`);
              
              persons.forEach(person => {
                employeeNamesMap[person.enroll_id] = person.name;
              });
            }
          } catch (dbErr) {
            console.warn('Could not fetch employee names from database:', dbErr.message);
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
    });

    proxyReq.on('error', (err) => {
      console.error('Error fetching attendance data:', err.message);
      res.status(502).json({ error: 'Failed to fetch attendance data from PHP API', details: err.message });
    });

    proxyReq.end();
  } catch (err) {
    console.error('PDF download error:', err.message);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

module.exports = router;


