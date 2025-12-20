const { db, testConnection } = require('./database');

async function checkEmployeesSchema() {
  try {
    await testConnection();
    
    console.log('📋 Checking employees table schema...\n');
    
    // Get columns
    const columns = await db.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'employees'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Employees table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (Nullable: ${col.IS_NULLABLE})`);
    });
    
    // Get sample records
    console.log('\n📊 Sample employees records:');
    const samples = await db.query('SELECT * FROM employees LIMIT 5');
    console.log(JSON.stringify(samples, null, 2));
    
    // Check for status/statusflag values
    console.log('\n📊 Status values in employees table:');
    const statusValues = await db.query('SELECT DISTINCT status, statusflag FROM employees');
    console.log(JSON.stringify(statusValues, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkEmployeesSchema();
