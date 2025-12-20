const { db, testConnection } = require('./database');

async function testAttendanceQuery() {
  console.log('🔍 Testing attendance report query...\n');
  
  try {
    await testConnection();
    
    const reportDate = '2025-12-17';
    
    console.log('Testing daily report query for:', reportDate);
    
    const query = `
      SELECT 
        p.id as person_id,
        p.name as name,
        e.email,
        e.department,
        e.role,
        e.shift,
        ats.enroll_id,
        ats.date,
        DATE_FORMAT(CONVERT_TZ(ats.first_in, '+00:00', '+05:30'), '%h:%i %p') as first_in,
        DATE_FORMAT(CONVERT_TZ(ats.last_out, '+00:00', '+05:30'), '%h:%i %p') as last_out,
        ats.status,
        ats.late_status,
        TIME_FORMAT(ats.shift_start, '%h:%i %p') as shift_start
      FROM attendance_summary ats
      INNER JOIN person p ON ats.enroll_id = p.id
      LEFT JOIN employees e ON p.id = e.person_id
      WHERE ats.date = ?
      ORDER BY p.name
    `;
    
    console.log('\nExecuting query...');
    const records = await db.query(query, [reportDate]);
    
    console.log(`\n✅ Found ${records.length} records`);
    if (records.length > 0) {
      console.log('\nSample records:');
      records.forEach(r => {
        console.log(`- ${r.name}: ${r.first_in} - ${r.last_out} (${r.status}, ${r.late_status})`);
      });
    } else {
      console.log('\n⚠️ No records found!');
      
      // Debug: Check what dates exist
      console.log('\nChecking what dates exist in attendance_summary:');
      const dates = await db.query('SELECT DISTINCT date FROM attendance_summary ORDER BY date DESC LIMIT 5');
      console.log('Available dates:', dates.map(d => d.date).join(', '));
    }
    
    console.log('\n✅ Test completed');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testAttendanceQuery();
