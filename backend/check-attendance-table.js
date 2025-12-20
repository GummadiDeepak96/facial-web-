const { db, testConnection } = require('./database');

async function checkAttendanceTable() {
  console.log('📊 Checking attendance_summary table...\n');
  
  try {
    await testConnection();
    
    const today = new Date().toISOString().split('T')[0];
    console.log('Today:', today);
    
    // Get all recent records
    const all = await db.query(
      `SELECT id, enroll_id, DATE(date) as date_str, first_in, last_out, status, late_status 
       FROM attendance_summary 
       ORDER BY date DESC, id DESC 
       LIMIT 30`
    );
    
    console.log('\n📋 All recent records (last 30):');
    console.log('ID | Enroll_ID | Date | First_In | Last_Out | Status | Late');
    console.log('-'.repeat(100));
    all.forEach(r => {
      const firstIn = r.first_in ? new Date(r.first_in).toLocaleTimeString() : 'NULL';
      const lastOut = r.last_out ? new Date(r.last_out).toLocaleTimeString() : 'NULL';
      console.log(`${r.id} | ${r.enroll_id} | ${r.date_str} | ${firstIn} | ${lastOut} | ${r.status} | ${r.late_status}`);
    });
    
    // Get today's records with person names
    const withNames = await db.query(
      `SELECT ats.id, ats.enroll_id, p.name, DATE(ats.date) as date_str, ats.first_in, ats.last_out, ats.status 
       FROM attendance_summary ats 
       LEFT JOIN person p ON ats.enroll_id = p.id 
       WHERE DATE(ats.date) >= ? 
       ORDER BY ats.date DESC, p.name`,
      [today]
    );
    
    console.log('\n\n✅ Today records with person names:');
    console.log('ID | Enroll_ID | Name | Date | First_In | Last_Out | Status');
    console.log('-'.repeat(100));
    withNames.forEach(r => {
      const firstIn = r.first_in ? new Date(r.first_in).toLocaleTimeString() : 'NULL';
      const lastOut = r.last_out ? new Date(r.last_out).toLocaleTimeString() : 'NULL';
      console.log(`${r.id} | ${r.enroll_id} | ${r.name || 'NOT FOUND'} | ${r.date_str} | ${firstIn} | ${lastOut} | ${r.status}`);
    });
    
    // Get statistics
    const stats = await db.query(
      `SELECT COUNT(*) as total, 
              COUNT(DISTINCT enroll_id) as unique_persons, 
              MIN(date) as first_date, 
              MAX(date) as last_date 
       FROM attendance_summary`
    );
    
    console.log('\n\n📊 Table Statistics:');
    console.log('Total records:', stats[0].total);
    console.log('Unique persons:', stats[0].unique_persons);
    console.log('First date:', stats[0].first_date);
    console.log('Last date:', stats[0].last_date);
    
    // Check for orphaned records (enroll_id not in person table)
    const orphaned = await db.query(
      `SELECT ats.id, ats.enroll_id, ats.date 
       FROM attendance_summary ats 
       LEFT JOIN person p ON ats.enroll_id = p.id 
       WHERE p.id IS NULL`
    );
    
    if (orphaned.length > 0) {
      console.log('\n\n⚠️ Orphaned records (enroll_id not in person table):', orphaned.length);
      orphaned.slice(0, 10).forEach(r => {
        console.log(`  ID: ${r.id}, enroll_id: ${r.enroll_id}, date: ${r.date}`);
      });
    } else {
      console.log('\n\n✅ No orphaned records - all enroll_ids match person table');
    }
    
    console.log('\n✅ Check completed');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

checkAttendanceTable();
