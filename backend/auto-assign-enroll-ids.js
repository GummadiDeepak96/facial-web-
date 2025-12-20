const mysql = require('mysql2/promise');

async function autoAssignEnrollIds() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Update with your actual password if needed
    database: 'employee_management'
  });

  try {
    console.log('🔄 Auto-assigning enroll_id = employeeid for all active employees...\n');
    
    // Update all employees: set enroll_id = employeeid
    const [result] = await connection.query(`
      UPDATE employees 
      SET enroll_id = employeeid 
      WHERE statusflag = 1
    `);
    
    console.log(`✅ Updated ${result.affectedRows} employees\n`);
    
    // Show the updated data
    const [employees] = await connection.query(`
      SELECT employeeid, name, biometric_id, enroll_id 
      FROM employees 
      WHERE statusflag = 1
      ORDER BY employeeid
      LIMIT 20
    `);
    
    console.log('📋 Updated employee data:');
    console.table(employees);
    
    console.log('\n✅ Done! Enroll IDs have been assigned.');
    console.log('🔄 Now restart your backend server to apply changes.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

autoAssignEnrollIds();
