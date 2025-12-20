const { db, testConnection } = require('./database');

async function debugAttendance() {
  console.log('🔍 Debugging attendance data...\n');
  
  try {
    await testConnection();
    
    const today = new Date().toISOString().split('T')[0];
    console.log('Today (client):', today);
    
    // Check all dates in attendance_summary
    console.log('\n1. All dates in attendance_summary:');
    const allDates = await db.query(
      `SELECT date, enroll_id, first_in, last_out, status 
       FROM attendance_summary 
       ORDER BY date DESC, id DESC 
       LIMIT 20`
    );
    console.log('Found', allDates.length, 'records:');
    allDates.forEach(r => {
      console.log(`  - Date: ${r.date}, Enroll: ${r.enroll_id}, In: ${r.first_in}, Out: ${r.last_out}, Status: ${r.status}`);
    });
    
    // Check with today's date query
    console.log(`\n2. Query with today's date (${today}):`);
    const todayRecords = await db.query(
      `SELECT * FROM attendance_summary WHERE date = ?`,
      [today]
    );
    console.log('Found', todayRecords.length, 'records');
    
    // Check with DATE() function
    console.log('\n3. Query using DATE() conversion:');
    const dateRecords = await db.query(
      `SELECT * FROM attendance_summary WHERE DATE(date) = ?`,
      [today]
    );
    console.log('Found', dateRecords.length, 'records');
    
    // Check person and employee join
    console.log('\n4. Full join query (like the API does):');
    const fullQuery = `
      SELECT 
        p.id as person_id,
        p.name as name,
        e.email,
        ats.enroll_id,
        ats.date,
        ats.first_in,
        ats.last_out,
        ats.status,
        ats.late_status
      FROM attendance_summary ats
      INNER JOIN person p ON ats.enroll_id = p.id
      LEFT JOIN employees e ON p.id = e.person_id
      WHERE DATE(ats.date) = ?
      ORDER BY p.name
    `;
    const joined = await db.query(fullQuery, [today]);
    console.log('Found', joined.length, 'records with full join');
    if (joined.length > 0) {
      joined.forEach(r => {
        console.log(`  - ${r.name}: ${r.first_in} - ${r.last_out} (${r.status})`);
      });
    }
    
    // Check recent records table
    console.log('\n5. Recent records (last 5):');
    const recentRecords = await db.query(
      `SELECT enroll_id, name, records_time, log_time FROM records ORDER BY id DESC LIMIT 5`
    );
    recentRecords.forEach(r => {
      console.log(`  - ${r.name} (enroll: ${r.enroll_id}): ${r.records_time}`);
    });
    
    console.log('\n✅ Debug completed');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

debugAttendance();
