const { db, testConnection } = require('./database');
const config = require('./config');

async function testDelete() {
  console.log('Testing delete functionality...\n');
  
  try {
    // Test connection
    await testConnection();
    
    // Check employees table structure
    console.log('\n1. Checking employees table structure:');
    const dbName = config.DB_CONFIG.database;
    const columns = await db.query(
      `SELECT column_name, column_key FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'employees'
       ORDER BY ordinal_position`,
      [dbName]
    );
    console.log('Columns:', columns.map(c => `${c.column_name}${c.column_key === 'PRI' ? ' (PK)' : ''}`).join(', '));
    
    // Detect primary key
    console.log('\n2. Detecting primary key:');
    const pkRows = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'employees' 
       AND column_name IN ('person_id','employeeid','id','employee_id','enroll_id') 
       LIMIT 1`,
      [dbName]
    );
    const pk = (pkRows[0] && pkRows[0].column_name) || 'id';
    console.log('Primary key detected:', pk);
    
    // Check if employee exists (use an ID from your system)
    console.log('\n3. Checking sample employee (ID: 1):');
    const employee = await db.findOne('employees', { [pk]: 1 });
    if (employee) {
      console.log('Employee found:', {
        [pk]: employee[pk],
        name: employee.name,
        email: employee.email,
        statusflag: employee.statusflag
      });
    } else {
      console.log('No employee with ID 1 found');
    }
    
    // Test update query directly
    console.log('\n4. Testing UPDATE query structure:');
    const testSql = `UPDATE employees SET statusflag = ?, updateddate = ? WHERE ${pk} = ?`;
    console.log('SQL:', testSql);
    console.log('This is what will be executed on delete');
    
    console.log('\n✅ Test completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testDelete();
