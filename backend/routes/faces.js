/**
 * Face Recognition Routes
 * Handles face upload, retrieval, and attendance logging
 * Maps to person and records tables
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

// Helper: Cosine similarity for duplicate detection
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    dot += x * y;
    magA += x * x;
    magB += y * y;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// Helper: Check for duplicate embeddings
async function isDuplicateEmbedding(newEmbedding, threshold = 0.95) {
  if (!Array.isArray(newEmbedding)) return false;
  try {
    const rows = await db.query('SELECT embedding_json FROM person WHERE embedding_json IS NOT NULL');
    for (const row of rows) {
      try {
        const stored = JSON.parse(row.embedding_json);
        const sim = cosineSimilarity(newEmbedding, stored);
        if (sim > threshold) return true;
      } catch (e) {
        // skip invalid rows
      }
    }
    return false;
  } catch (err) {
    console.error('Error checking duplicate embedding:', err.message);
    return false;
  }
}

// Helper: Validate embedding
function validateEmbedding(embedding) {
  return Array.isArray(embedding) && embedding.length === 512;
}

// POST /api/faces/upload
router.post('/upload', async (req, res) => {
  const {
    localId,
    personName,
    faceEmbedding,
    imageBase64,
    registeredLatitude,
    registeredLongitude
  } = req.body;

  if (typeof localId === 'undefined' || !personName || !faceEmbedding) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: localId, personName, faceEmbedding'
    });
  }

  if (!validateEmbedding(faceEmbedding)) {
    return res.status(400).json({
      success: false,
      message: 'faceEmbedding must be an array of 512 floats'
    });
  }

  try {
    console.log('📱 Mobile face upload received:', { localId, personName, hasEmbedding: !!faceEmbedding, hasImage: !!imageBase64 });
    
    const duplicate = await isDuplicateEmbedding(faceEmbedding, 0.95);
    if (duplicate) {
      console.log('⚠️  Duplicate face detected for:', personName);
      return res.status(409).json({
        success: false,
        message: 'Duplicate face detected',
        data: { localId }
      });
    }

    const imagePath = await saveBase64Image(imageBase64, personName);
    const now = Date.now();

    const result = await db.query(
      `INSERT INTO person
        (name, embedding_json, image_path, registered_latitude, registered_longitude, local_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        personName,
        JSON.stringify(faceEmbedding),
        imagePath,
        (typeof registeredLatitude !== 'undefined') ? registeredLatitude : null,
        (typeof registeredLongitude !== 'undefined') ? registeredLongitude : null,
        localId,
        now,
        now
      ]
    );

    const serverId = result.insertId.toString();
    console.log('✅ Face uploaded successfully - serverId:', serverId, 'localId:', localId, 'name:', personName);
    return res.json({
      success: true,
      message: 'Face uploaded successfully',
      data: { serverId, localId }
    });
  } catch (err) {
    console.error('❌ Error in /api/faces/upload:', err && err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Server error',
      data: { localId }
    });
  }
});

// GET /api/faces/all
router.get('/all', async (req, res) => {
  try {
    const rows = await db.query(
      'SELECT id, name, embedding_json, image_path, registered_latitude, registered_longitude FROM person WHERE embedding_json IS NOT NULL'
    );

    const faces = [];
    for (const row of rows) {
      let imageBase64 = null;
      if (row.image_path) {
        try {
          const p = path.join(__dirname, '..', row.image_path);
          const buf = await fs.promises.readFile(p);
          imageBase64 = `data:image/jpeg;base64,${buf.toString('base64')}`;
        } catch (err) {
          // ignore read errors
        }
      }

      faces.push({
        id: row.id.toString(),
        name: row.name,
        embedding: row.embedding_json ? JSON.parse(row.embedding_json) : null,
        imageBase64,
        latitude: row.registered_latitude,
        longitude: row.registered_longitude
      });
    }

    return res.json({ success: true, data: { faces } });
  } catch (err) {
    console.error('Error in /api/faces/all:', err && err.message);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// GET /api/faces/image/:id
router.get('/image/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await db.query('SELECT id, name, image_path FROM person WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Face not found' });
    }
    const face = rows[0];
    if (!face.image_path) {
      return res.status(404).json({ success: false, message: 'Image file not found for this face' });
    }
    const imagePath = path.join(__dirname, '..', face.image_path);
    const imageBuffer = await fs.promises.readFile(imagePath);
    const imageBase64 = imageBuffer.toString('base64');
    return res.json({
      success: true,
      data: { id: face.id.toString(), name: face.name, imageBase64: `data:image/jpeg;base64,${imageBase64}` }
    });
  } catch (err) {
    console.error('Error in /api/faces/image/:id:', err && err.message);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// POST /api/faces/attendance/log
router.post('/attendance/log', async (req, res) => {
  const { faceId, name, imageBase64, latitude, longitude, method, timestamp } = req.body;

  console.log('📱 Mobile attendance log received:', { 
    faceId, 
    name, 
    method: method || 'facial', 
    timestamp: timestamp ? new Date(Number(timestamp)).toLocaleString() : 'missing',
    hasImage: !!imageBase64,
    latitude,
    longitude
  });

  // Auto-sync face_id mapping before processing attendance
  if (faceId && name) {
    const { syncSingleFaceId } = require('../utils/faceIdMapper');
    await syncSingleFaceId(faceId, name);
  }

  if (!name || typeof timestamp === 'undefined') {
    console.log('❌ Missing required fields');
    return res.status(400).json({ success: false, message: 'Missing required fields: name, timestamp' });
  }

  const clientTime = Number(timestamp);
  if (Number.isNaN(clientTime) || clientTime <= 0) {
    console.log('❌ Invalid timestamp:', timestamp);
    return res.status(400).json({ success: false, message: 'Invalid timestamp' });
  }

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
    if (typeof faceId !== 'undefined' && faceId !== null) {
      const existing = await db.query(
        'SELECT id FROM records WHERE face_id = ? AND log_time = ? LIMIT 1',
        [faceId, clientTime]
      );
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'Duplicate attendance log', data: { existingId: existing[0].id } });
      }
    } else {
      const existing = await db.query(
        'SELECT id FROM records WHERE name = ? AND log_time = ? LIMIT 1',
        [name, clientTime]
      );
      if (existing.length > 0) {
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

    // Get enroll_id: if faceId provided use it, otherwise lookup by name in person table
    let enrollId = faceId;
    if (!enrollId) {
      const personByName = await db.query('SELECT id FROM person WHERE name = ? LIMIT 1', [name]);
      if (personByName.length > 0) {
        enrollId = personByName[0].id;
      } else {
        console.log('⚠️ No matching person found for name:', name, '- Creating attendance without face link');
        // Allow attendance even without person record (for manual entries)
        enrollId = 0; // Use 0 for non-registered persons
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
    console.log('✅ Attendance logged successfully - serverId:', serverId, 'name:', name, 'method:', method || 'facial');
    return res.json({
      success: true,
      message: 'Attendance logged successfully',
      data: { serverId, timestamp: clientTime }
    });
  } catch (err) {
    console.error('❌ Error in /api/faces/attendance/log:', err && err.message);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// GET /api/faces/attendance/recent
router.get('/attendance/recent', async (req, res) => {
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
          // ignore
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
    console.error('Error in /api/faces/attendance/recent:', err && err.message);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

module.exports = router;
