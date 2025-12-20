const { db } = require('../database');

/**
 * Process raw records and update attendance_summary table
 * Automatically called to sync latest attendance logs
 */
async function processAttendanceRecords() {
  try {
    console.log('🔄 Processing attendance records...');

    // Get all records that need to be processed (from today and recent days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // Process last 7 days
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    // Get all records grouped by person_id and date
    // records.enroll_id now contains person.id (after fix), so join directly
    const recordsQuery = `
      SELECT 
        r.enroll_id,
        p.id as person_id,
        DATE(r.records_time) as attendance_date,
        MIN(r.records_time) as first_in_time,
        MAX(r.records_time) as last_out_time,
        COUNT(*) as log_count
      FROM records r
      INNER JOIN person p ON (r.enroll_id = p.id OR r.enroll_id = p.local_id)
      WHERE DATE(r.records_time) >= ?
      GROUP BY p.id, DATE(r.records_time)
      ORDER BY attendance_date DESC, p.id
    `;

    const recordsToProcess = await db.query(recordsQuery, [cutoffDateStr]);
    console.log(`📋 Found ${recordsToProcess.length} attendance records to process`);

    let insertCount = 0;
    let updateCount = 0;

    for (const record of recordsToProcess) {
      const { enroll_id, person_id, attendance_date, first_in_time, last_out_time, log_count } = record;

      // Get shift information for the employee using person_id
      const shiftQuery = `
        SELECT s.start_time, s.grace_minutes
        FROM employees e
        LEFT JOIN shifts s ON e.shift COLLATE utf8mb4_unicode_ci = s.name COLLATE utf8mb4_unicode_ci
        WHERE e.person_id = ?
        LIMIT 1
      `;
      
      const shiftInfo = await db.query(shiftQuery, [person_id]);
      const shiftStart = shiftInfo.length > 0 && shiftInfo[0].start_time 
        ? shiftInfo[0].start_time 
        : '09:00:00';
      const graceMinutes = shiftInfo.length > 0 && shiftInfo[0].grace_minutes 
        ? shiftInfo[0].grace_minutes 
        : 15; // Default 15 minutes grace period

      // Calculate late status
      const firstInTime = new Date(first_in_time);
      const shiftStartDateTime = new Date(attendance_date + ' ' + shiftStart);
      const graceEndTime = new Date(shiftStartDateTime.getTime() + graceMinutes * 60000);
      
      const isLate = firstInTime > graceEndTime;
      const lateStatus = isLate ? 'Late' : 'On-Time';
      const status = log_count > 0 ? 'Present' : 'Absent';

      // Check if record already exists in attendance_summary (use person_id as enroll_id)
      const existingQuery = `
        SELECT id FROM attendance_summary 
        WHERE enroll_id = ? AND date = ?
      `;
      const existing = await db.query(existingQuery, [person_id, attendance_date]);

      if (existing.length > 0) {
        // Update existing record
        const updateQuery = `
          UPDATE attendance_summary 
          SET first_in = ?, 
              last_out = ?, 
              status = ?, 
              late_status = ?,
              shift_start = ?
          WHERE enroll_id = ? AND date = ?
        `;
        await db.query(updateQuery, [
          first_in_time,
          last_out_time,
          status,
          lateStatus,
          shiftStart,
          person_id,
          attendance_date
        ]);
        updateCount++;
      } else {
        // Insert new record (use person_id as enroll_id)
        const insertQuery = `
          INSERT INTO attendance_summary 
          (enroll_id, date, first_in, last_out, status, late_status, shift_start)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        await db.query(insertQuery, [
          person_id,
          attendance_date,
          first_in_time,
          last_out_time,
          status,
          lateStatus,
          shiftStart
        ]);
        insertCount++;
      }
    }

    console.log(`✅ Attendance processing complete: ${insertCount} inserted, ${updateCount} updated`);
    return { success: true, inserted: insertCount, updated: updateCount };

  } catch (error) {
    console.error('❌ Error processing attendance records:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process attendance for a specific employee and date
 * @param {number} personId - The person_id (not face_id) of the employee
 * @param {string} date - Date in YYYY-MM-DD format
 */
async function processEmployeeAttendance(personId, date) {
  try {
    console.log(`🔄 Processing attendance for employee ${personId} on ${date}`);

    // First, get the local_id (face_id) for this person
    const personQuery = `SELECT local_id FROM person WHERE id = ?`;
    const personResult = await db.query(personQuery, [personId]);
    
    if (personResult.length === 0 || !personResult[0].local_id) {
      console.log(`⚠️ No local_id found for person ${personId}`);
      return { success: false, message: 'Person not registered with face recognition' };
    }

    const faceId = personResult[0].local_id;

    // Get all records for this employee on this date using face_id (stored as enroll_id)
    const recordsQuery = `
      SELECT 
        MIN(records_time) as first_in_time,
        MAX(records_time) as last_out_time,
        COUNT(*) as log_count
      FROM records
      WHERE enroll_id = ? AND DATE(records_time) = ?
    `;

    const records = await db.query(recordsQuery, [faceId, date]);
    
    if (records.length === 0 || records[0].log_count === 0) {
      console.log(`⚠️ No records found for employee ${personId} (face_id ${faceId}) on ${date}`);
      return { success: false, message: 'No records found' };
    }

    const { first_in_time, last_out_time, log_count } = records[0];

    // Get shift information using person_id
    const shiftQuery = `
      SELECT s.start_time, s.grace_minutes
      FROM employees e
      LEFT JOIN shifts s ON e.shift COLLATE utf8mb4_unicode_ci = s.name COLLATE utf8mb4_unicode_ci
      WHERE e.person_id = ?
      LIMIT 1
    `;
    
    const shiftInfo = await db.query(shiftQuery, [personId]);
    const shiftStart = shiftInfo.length > 0 && shiftInfo[0].start_time 
      ? shiftInfo[0].start_time 
      : '09:00:00';
    const graceMinutes = shiftInfo.length > 0 && shiftInfo[0].grace_minutes 
      ? shiftInfo[0].grace_minutes 
      : 15;

    // Calculate late status
    const firstInTime = new Date(first_in_time);
    const shiftStartDateTime = new Date(date + ' ' + shiftStart);
    const graceEndTime = new Date(shiftStartDateTime.getTime() + graceMinutes * 60000);
    
    const isLate = firstInTime > graceEndTime;
    const lateStatus = isLate ? 'Late' : 'On-Time';
    const status = 'Present';

    // Check if record exists (use person_id as enroll_id in attendance_summary)
    const existingQuery = `
      SELECT id FROM attendance_summary 
      WHERE enroll_id = ? AND date = ?
    `;
    const existing = await db.query(existingQuery, [personId, date]);

    if (existing.length > 0) {
      // Update
      const updateQuery = `
        UPDATE attendance_summary 
        SET first_in = ?, 
            last_out = ?, 
            status = ?, 
            late_status = ?,
            shift_start = ?
        WHERE enroll_id = ? AND date = ?
      `;
      await db.query(updateQuery, [
        first_in_time,
        last_out_time,
        status,
        lateStatus,
        shiftStart,
        personId,
        date
      ]);
      console.log(`✅ Updated attendance for employee ${personId}`);
    } else {
      // Insert (use person_id as enroll_id)
      const insertQuery = `
        INSERT INTO attendance_summary 
        (enroll_id, date, first_in, last_out, status, late_status, shift_start)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      await db.query(insertQuery, [
        personId,
        date,
        first_in_time,
        last_out_time,
        status,
        lateStatus,
        shiftStart
      ]);
      console.log(`✅ Inserted attendance for employee ${personId}`);
    }

    return { success: true };

  } catch (error) {
    console.error(`❌ Error processing employee ${personId} attendance:`, error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  processAttendanceRecords,
  processEmployeeAttendance
};
