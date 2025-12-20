const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../database');
const { authenticateAdmin } = require('../auth');

const router = express.Router();

console.log("SHIFT ROUTES LOADED");


// Get all shifts
router.get('/shifts', authenticateAdmin, async (req, res) => {
  try {
    const shifts = await db.query('SELECT * FROM shifts ORDER BY created_at DESC');
    res.json(shifts);
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new shift
router.post('/shifts', authenticateAdmin, [
  body('name').notEmpty().withMessage('Shift name is required'),
  body('code').notEmpty().withMessage('Shift code is required'),
  body('start_time').notEmpty().withMessage('Start time is required'),
  body('end_time').notEmpty().withMessage('End time is required'),
  body('lunch_start_time').optional(),
  body('lunch_end_time').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, code, start_time, end_time, lunch_start_time, lunch_end_time } = req.body;

    // Check if shift code already exists
    const existingShift = await db.findOne('shifts', { code });
    if (existingShift) {
      return res.status(409).json({ error: 'Shift code already exists' });
    }
    
    // Format current timestamp for MySQL
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    const result = await db.insert('shifts', {
      name,
      code,
      start_time,
      end_time,
      lunch_start_time: lunch_start_time || null,
      lunch_end_time: lunch_end_time || null,
      created_at: now,
      updated_at: now
    });
    
    const newShiftId = result.insertId;
    const newShift = await db.findOne('shifts', { id: newShiftId });
    res.status(201).json(newShift);
  } catch (error) {
    console.error('Add shift error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Update shift
router.put('/shifts/:id', authenticateAdmin, [
  body('name').notEmpty().withMessage('Shift name is required'),
  body('code').notEmpty().withMessage('Shift code is required'),
  body('start_time').notEmpty().withMessage('Start time is required'),
  body('end_time').notEmpty().withMessage('End time is required'),
  body('lunch_start_time').optional(),
  body('lunch_end_time').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, code, start_time, end_time, lunch_start_time, lunch_end_time } = req.body;

    // Check if shift exists
    const existingShift = await db.findOne('shifts', { id });
    if (!existingShift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    // Check if shift code already exists for another shift
    const duplicateShift = await db.query('SELECT * FROM shifts WHERE code = ? AND id != ?', [code, id]);
    if (duplicateShift.length > 0) {
      return res.status(409).json({ error: 'Shift code already exists' });
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    await db.update('shifts', {
      name,
      code,
      start_time,
      end_time,
      lunch_start_time: lunch_start_time || null,
      lunch_end_time: lunch_end_time || null,
      updated_at: now
    }, { id });

    const updatedShift = await db.findOne('shifts', { id });
    res.json(updatedShift);
  } catch (error) {
    console.error('Update shift error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete shift
router.delete('/shifts/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const shift = await db.findOne('shifts', { id });
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    await db.delete('shifts', { id });
    res.json({ message: 'Shift deleted successfully' });
  } catch (error) {
    console.error('Delete shift error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
