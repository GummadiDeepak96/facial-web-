const { db, testConnection } = require('./database');

async function fixVamshiRecord() {
  console.log('🔧 Fixing vamshi attendance record...\n');
  
  try {
    await testConnection();
    
    // Get vamshi's correct person.id
    const person = await db.query('SELECT id, name FROM person WHERE name = ?', ['vamshi']);
    if (person.length === 0) {
      console.log('❌ Vamshi not found in person table');
      process.exit(1);
    }
    
    const correctId = person[0].id;
    console.log('✅ Vamshi person.id:', correctId);
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log('Today:', today);
    
    // Find vamshi's records in records table for today with wrong enroll_id
    const records = await db.query(
      'SELECT id, enroll_id, records_time FROM records WHERE name = ? AND DATE(records_time) = ?',
      ['vamshi', today]
    );
    
    console.log('\nFound', records.length, 'record(s) for vamshi today');
    
    if (records.length === 0) {
      console.log('❌ No records to fix');
      process.exit(0);
    }
    
    // Update enroll_id in records table
    for (const rec of records) {
      console.log(`Updating record ${rec.id}: enroll_id ${rec.enroll_id} -> ${correctId}`);
      await db.query('UPDATE records SET enroll_id = ? WHERE id = ?', [correctId, rec.id]);
    }
    
    console.log('✅ Updated', records.length, 'record(s)');
    
    // Now process attendance to create attendance_summary
    console.log('\nProcessing attendance to create summary...');
    
    // Get all records for today
    const todayRecords = await db.query(
      'SELECT enroll_id, records_time FROM records WHERE name = ? AND DATE(records_time) = ? ORDER BY records_time',
      ['vamshi', today]
    );
    
    if (todayRecords.length > 0) {
      const firstIn = todayRecords[0].records_time;
      const lastOut = todayRecords[todayRecords.length - 1].records_time;
      
      // Check if attendance_summary exists
      const existing = await db.query(
        'SELECT id FROM attendance_summary WHERE enroll_id = ? AND DATE(date) = ?',
        [correctId, today]
      );
      
      if (existing.length > 0) {
        // Update
        await db.query(
          'UPDATE attendance_summary SET first_in = ?, last_out = ? WHERE id = ?',
          [firstIn, lastOut, existing[0].id]
        );
        console.log('✅ Updated attendance_summary record');
      } else {
        // Insert
        await db.query(
          'INSERT INTO attendance_summary (enroll_id, date, first_in, last_out, status, late_status, shift_start) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [correctId, today, firstIn, lastOut, 'Present', 'On Time', '09:00:00']
        );
        console.log('✅ Created attendance_summary record');
      }
    }
    
    // Verify
    console.log('\nVerifying...');
    const final = await db.query(
      `SELECT ats.id, ats.enroll_id, p.name, ats.first_in, ats.last_out
       FROM attendance_summary ats
       INNER JOIN person p ON ats.enroll_id = p.id
       WHERE DATE(ats.date) = ?
       ORDER BY p.name`,
      [today]
    );
    
    console.log('\nToday attendance summary:');
    final.forEach(r => {
      console.log(`  - ${r.name} (${r.enroll_id}): ${r.first_in} - ${r.last_out}`);
    });
    
    console.log('\n✅ Fix completed! Refresh the UI to see vamshi attendance.');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

fixVamshiRecord();
