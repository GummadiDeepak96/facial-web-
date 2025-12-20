const mysql = require('mysql2/promise');

async function addEnrollIdColumn() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Update with your actual password
    database: 'employee_management'
  });

  try {
    console.log('🔧 Adding enroll_id column to employees table...');
    
    // Check if column already exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'employee_management' 
        AND TABLE_NAME = 'employees' 
        AND COLUMN_NAME = 'enroll_id'
    `);

    if (columns.length > 0) {
      console.log('✅ enroll_id column already exists');
    } else {
      // Add the column
      await connection.query(`
        ALTER TABLE employees 
        ADD COLUMN enroll_id INT NULL AFTER biometric_id
      `);
      console.log('✅ enroll_id column added successfully');
    }

    // Show sample data
    const [employees] = await connection.query(`
      SELECT employeeid, name, biometric_id, enroll_id 
      FROM employees 
      LIMIT 10
    `);
    
    console.log('\n📋 Current employee data:');
    console.table(employees);
    
    console.log('\n📝 Next steps:');
    console.log('1. Manually update each employee\'s enroll_id to match their attendance system ID');
    console.log('2. Example: UPDATE employees SET enroll_id = 1 WHERE employeeid = \'EMP001\';');
    console.log('3. Or provide a mapping file/sheet to bulk update');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

addEnrollIdColumn();
