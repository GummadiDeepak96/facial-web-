/**
 * Attendance Routes
 * Handles attendance logging from mobile devices
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { db } = require('../database');

// Helper: Strip base64 prefix
function stripBase64Prefix(base64) {
  if (!base64) return base64;
  const commaIndex = base64.indexOf(',');
  if (base64.startsWith('data:') && commaIndex !== -1) {
    return base64.slice(commaIndex + 1);
  }
  return base64;
}

// Helper: Save base64 image to disk
async function saveBase64Image(base64, name) {
  if (!base64) return null;
  try {
    const cleanBase64 = stripBase64Prefix(base64);
    const buffer = Buffer.from(cleanBase64, 'base64');
    const safeName = (name || 'img').toString().replace(/[^a-zA-Z0-9_\-]/g, '_');
    const filename = `${Date.now()}_${safeName}.jpg`;

    const dir = path.join(__dirname, '..', 'uploads', 'faces');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, filename);
    await fs.promises.writeFile(filePath, buffer);
    return `uploads/faces/${filename}`;
  } catch (e) {
    console.warn('Failed to save image:', e && e.message);
    return null;
  }
}

// POST /api/attendance/log
router.post('/log', async (req, res) => {
  const { faceId, name, imageBase64, latitude, longitude, method, timestamp } = req.body;

  console.log('📱 Mobile attendance log received:', { 
    faceId, 
    name, 
    method: method || 'facial', 
    timestamp: timestamp,
    hasImage: !!imageBase64,
    latitude,
    longitude
  });

  if (!name || typeof timestamp === 'undefined') {
    console.log('❌ Missing required fields');
    return res.status(400).json({ success: false, message: 'Missing required fields: name, timestamp' });
  }

  // Handle both Unix timestamp (number) and date string formats
  let clientTime;
  if (typeof timestamp === 'number') {
    clientTime = timestamp;
  } else if (typeof timestamp === 'string') {
    // Try to parse as number first
    const numTime = Number(timestamp);
    if (!Number.isNaN(numTime) && numTime > 0) {
      clientTime = numTime;
    } else {
      // Parse as date string
      const parsedDate = new Date(timestamp);
      if (parsedDate.toString() !== 'Invalid Date') {
        clientTime = parsedDate.getTime();
      } else {
        console.log('❌ Invalid timestamp format:', timestamp);
        return res.status(400).json({ success: false, message: 'Invalid timestamp format' });
      }
    }
  } else {
    clientTime = Number(timestamp);
  }

  if (Number.isNaN(clientTime) || clientTime <= 0) {
    console.log('❌ Invalid timestamp:', timestamp, '-> clientTime:', clientTime);
    return res.status(400).json({ success: false, message: 'Invalid timestamp' });
  }

  console.log('✅ Parsed timestamp:', timestamp, '->', new Date(clientTime).toLocaleString());

  if (typeof latitude !== 'undefined') {
    const lat = Number(latitude);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ success: false, message: 'Invalid latitude' });
    }
  }
  if (typeof longitude !== 'undefined') {
    const lon = Number(longitude);
    if (Number.isNaN(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({ success: false, message: 'Invalid longitude' });
    }
  }

  try {
    // Duplicate check
    if (typeof faceId !== 'undefined' && faceId !== null) {
      const existing = await db.query(
        'SELECT id FROM records WHERE face_id = ? AND log_time = ? LIMIT 1',
        [faceId, clientTime]
      );
      if (existing.length > 0) {
        console.log('⚠️ Duplicate attendance detected');
        return res.status(409).json({ success: false, message: 'Duplicate attendance log', data: { existingId: existing[0].id } });
      }
    } else {
      const existing = await db.query(
        'SELECT id FROM records WHERE name = ? AND log_time = ? LIMIT 1',
        [name, clientTime]
      );
      if (existing.length > 0) {
        console.log('⚠️ Duplicate attendance detected');
        return res.status(409).json({ success: false, message: 'Duplicate attendance log', data: { existingId: existing[0].id } });
      }
    }

    let imagePath = null;
    if (imageBase64) {
      imagePath = await saveBase64Image(imageBase64, `attendance_${name}`);
    }

    const now = Date.now();
    const logDate = new Date(clientTime);
    const recordsTime = logDate.toISOString().slice(0, 19).replace('T', ' '); // Convert to MySQL DATETIME format

    // Get enroll_id: ALWAYS lookup by name in person table to get correct person.id
    let enrollId = null;
    const personByName = await db.query('SELECT id FROM person WHERE name = ? LIMIT 1', [name]);
    if (personByName.length > 0) {
      enrollId = personByName[0].id;
      console.log(`✅ Found person by name "${name}": person.id = ${enrollId}`);
    } else {
      // If no person found, try using faceId as fallback
      console.log(`⚠️ No matching person found for name: "${name}"`);
      if (faceId) {
        // Try to find person by local_id (which maps to faceId)
        const personByFaceId = await db.query('SELECT id FROM person WHERE local_id = ? LIMIT 1', [faceId]);
        if (personByFaceId.length > 0) {
          enrollId = personByFaceId[0].id;
          console.log(`✅ Found person by faceId ${faceId}: person.id = ${enrollId}`);
        } else {
          enrollId = faceId;
          console.log(`⚠️ Using faceId as enrollId: ${faceId}`);
        }
      } else {
        console.log('❌ Cannot determine enrollId - no person found and no faceId provided');
        return res.status(400).json({ success: false, message: 'Person not found in system' });
      }
    }

    const result = await db.query(
      `INSERT INTO records
        (enroll_id, records_time, mode, intOut, event, face_id, name, method, image_path, latitude, longitude, log_time, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        enrollId,
        recordsTime,
        1,  // mode: 1 for face recognition
        0,  // intOut: 0 for check-in, 1 for check-out
        0,  // event: 0 for normal attendance
        faceId ?? null,
        name,
        method ?? 'facial',
        imagePath,
        typeof latitude !== 'undefined' ? latitude : null,
        typeof longitude !== 'undefined' ? longitude : null,
        clientTime,
        now
      ]
    );

    const serverId = result.insertId.toString();
    console.log('✅ Attendance logged successfully - serverId:', serverId, 'enrollId:', enrollId, 'name:', name, 'method:', method || 'facial');

    // Update attendance_summary table (same pipeline as PHP device)
    try {
      // Convert to local time (IST) before extracting date
      const localDate = new Date(clientTime + (5.5 * 60 * 60 * 1000)); // Add IST offset
      const dateOnly = localDate.toISOString().split('T')[0]; // YYYY-MM-DD in IST
      const recordsTimeFormatted = recordsTime; // Already in DATETIME format
      
      console.log('📅 Date conversion - clientTime:', new Date(clientTime).toISOString(), '-> dateOnly:', dateOnly);
      
      // Get shift information for the employee (person_id matches the person.id / enrollId)
      const employeeShift = await db.query(
        `SELECT e.shift, s.start_time 
         FROM employees e 
         LEFT JOIN shifts s ON e.shift = s.id 
         WHERE e.person_id = ? LIMIT 1`,
        [enrollId]
      );
      
      const shiftStart = employeeShift.length > 0 && employeeShift[0].start_time 
        ? employeeShift[0].start_time 
        : '09:00:00';

      // Check if attendance_summary record exists for this date
      const existing = await db.query(
        'SELECT id, first_in, last_out FROM attendance_summary WHERE enroll_id = ? AND date = ? LIMIT 1',
        [enrollId, dateOnly]
      );

      if (existing.length > 0) {
        // Update existing record - update first_in if earlier, last_out if later
        const summary = existing[0];
        const updates = [];
        const params = [];

        if (!summary.first_in || recordsTimeFormatted < summary.first_in) {
          updates.push('first_in = ?');
          params.push(recordsTimeFormatted);
        }
        
        if (!summary.last_out || recordsTimeFormatted > summary.last_out) {
          updates.push('last_out = ?');
          params.push(recordsTimeFormatted);
        }

        if (updates.length > 0) {
          params.push(summary.id);
          await db.query(
            `UPDATE attendance_summary SET ${updates.join(', ')} WHERE id = ?`,
            params
          );
          console.log('✅ Updated attendance_summary for enroll_id:', enrollId, 'date:', dateOnly);
        }
      } else {
        // Insert new attendance_summary record
        // Determine status and late_status based on first check-in time
        const checkInTime = new Date(`2000-01-01 ${recordsTimeFormatted.split(' ')[1]}`);
        const shiftStartTime = new Date(`2000-01-01 ${shiftStart}`);
        const lateStatus = checkInTime > shiftStartTime ? 'Late' : 'On Time';
        
        await db.query(
          `INSERT INTO attendance_summary 
            (enroll_id, date, first_in, last_out, status, late_status, shift_start)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [enrollId, dateOnly, recordsTimeFormatted, recordsTimeFormatted, 'Present', lateStatus, shiftStart]
        );
        console.log('✅ Created attendance_summary for enroll_id:', enrollId, 'date:', dateOnly);
      }
    } catch (summaryErr) {
      console.error('⚠️ Warning: Failed to update attendance_summary:', summaryErr.message);
      // Don't fail the attendance log if summary update fails
    }

    return res.json({
      success: true,
      message: 'Attendance logged successfully',
      data: { serverId, timestamp: clientTime }
    });
  } catch (err) {
    console.error('❌ Error in /api/attendance/log:', err && err.message);
    console.error('❌ Error stack:', err.stack);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// GET /api/attendance/recent
router.get('/recent', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);
  const withImages = req.query.withImages === 'true' || req.query.withImages === '1';
  
  try {
    const rows = await db.query(
      'SELECT id, face_id, name, method, image_path, latitude, longitude, log_time FROM records WHERE log_time IS NOT NULL ORDER BY log_time DESC LIMIT ?',
      [limit]
    );

    const logs = [];
    for (const row of rows) {
      let imageBase64 = null;
      if (withImages && row.image_path) {
        try {
          const p = path.join(__dirname, '..', row.image_path);
          const buf = await fs.promises.readFile(p);
          imageBase64 = `data:image/jpeg;base64,${buf.toString('base64')}`;
        } catch (err) {
          // ignore read errors
        }
      }
      logs.push({
        id: row.id.toString(),
        faceId: row.face_id,
        name: row.name,
        method: row.method,
        imageBase64,
        latitude: row.latitude,
        longitude: row.longitude,
        logTime: row.log_time
      });
    }

    return res.json({ success: true, data: { logs } });
  } catch (err) {
    console.error('Error in /api/attendance/recent:', err && err.message);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

module.exports = router;
