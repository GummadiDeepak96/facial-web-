const { db, testConnection } = require('./database');

async function checkAttendance() {
  console.log('🔍 Checking attendance data...\n');
  
  try {
    await testConnection();
    
    // Check attendance_summary table
    console.log('1. Recent attendance_summary records:');
    const summary = await db.query(
      `SELECT * FROM attendance_summary ORDER BY date DESC, id DESC LIMIT 10`
    );
    console.log('Found', summary.length, 'records');
    if (summary.length > 0) {
      console.log('Sample record:', JSON.stringify(summary[0], null, 2));
    } else {
      console.log('⚠️ No records in attendance_summary table!');
    }
    
    // Check recent records
    console.log('\n2. Recent records table entries:');
    const records = await db.query(
      `SELECT enroll_id, name, records_time, log_time FROM records ORDER BY log_time DESC LIMIT 10`
    );
    console.log('Found', records.length, 'records');
    if (records.length > 0) {
      console.log('Sample record:', JSON.stringify(records[0], null, 2));
    }
    
    // Check person table
    console.log('\n3. Person table records:');
    const persons = await db.query(`SELECT id, name FROM person LIMIT 10`);
    console.log('Found', persons.length, 'persons');
    if (persons.length > 0) {
      console.log('Sample:', persons.map(p => `id:${p.id} name:${p.name}`).join(', '));
    }
    
    // Check employees table
    console.log('\n4. Employees table records:');
    const employees = await db.query(`SELECT person_id, email FROM employees LIMIT 10`);
    console.log('Found', employees.length, 'employees');
    if (employees.length > 0) {
      console.log('Sample:', employees.map(e => `person_id:${e.person_id} email:${e.email}`).join(', '));
    }
    
    // Check today's attendance specifically
    console.log('\n5. Today\'s attendance:');
    const today = new Date().toISOString().split('T')[0];
    const todayAtt = await db.query(
      `SELECT * FROM attendance_summary WHERE date = ?`,
      [today]
    );
    console.log('Found', todayAtt.length, 'records for today:', today);
    
    console.log('\n✅ Check completed');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

checkAttendance();
