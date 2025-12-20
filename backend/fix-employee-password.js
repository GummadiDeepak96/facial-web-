// Set employee password with proper bcrypt hashing
// Usage: node fix-employee-password.js employee@example.com newPassword123

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const config = require('./config');

async function fixEmployeePassword(email, newPassword) {
  let connection;
  
  try {
    console.log('\n=== SETTING EMPLOYEE PASSWORD ===\n');
    
    // Create database connection
    const dbConfig = {
      host: config.DB_CONFIG.host,
      user: config.DB_CONFIG.user,
      password: config.DB_CONFIG.password,
      database: config.DB_CONFIG.database
    };
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database\n');

    // Check if employee exists
    const [employees] = await connection.execute(
      'SELECT * FROM employees WHERE email = ?',
      [email]
    );

    if (employees.length === 0) {
      console.log('❌ No employee found with email:', email);
      console.log('\n📋 Available employees:');
      const [allEmployees] = await connection.execute('SELECT id, email, name FROM employees LIMIT 10');
      console.table(allEmployees);
      return;
    }

    const employee = employees[0];
    console.log('📋 Employee found:');
    console.log('   Email:', employee.email);
    console.log('   Name:', employee.name || 'N/A');
    console.log('   Current password hash:', employee.password ? employee.password.substring(0, 30) + '...' : 'NULL');
    console.log();

    // Hash the new password
    console.log('🔐 Hashing new password...');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('   Hash:', hashedPassword.substring(0, 30) + '...');
    console.log();

    // Update the password
    console.log('💾 Updating password in database...');
    await connection.execute(
      'UPDATE employees SET password = ? WHERE email = ?',
      [hashedPassword, email]
    );

    console.log('✅ Password updated successfully!\n');

    // Test the new password
    console.log('🧪 Testing password verification...');
    const isValid = await bcrypt.compare(newPassword, hashedPassword);
    
    if (isValid) {
      console.log('✅ Password verification PASSED!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ EMPLOYEE CAN NOW LOGIN WITH:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('   Email:', email);
      console.log('   Password:', newPassword);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      // Check if account is active
      if (employee.statusflag !== 1 && employee.status !== 'active') {
        console.log('⚠️  WARNING: Account is not active!');
        console.log('   Status flag:', employee.statusflag);
        console.log('   Status:', employee.status || 'NULL');
        console.log();
        console.log('💡 To activate, run:');
        console.log('   node fix-employee-login.js ' + email + ' --fix');
        console.log();
      }
    } else {
      console.log('❌ Password verification FAILED\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed\n');
    }
  }
}

// Get command line arguments
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('\n📖 USAGE:');
  console.log('  node fix-employee-password.js <email> <new-password>');
  console.log('\nEXAMPLE:');
  console.log('  node fix-employee-password.js employee@company.com TempPass123!');
  console.log('\n💡 TIP: Password should be at least 6 characters\n');
  process.exit(1);
}

if (password.length < 6) {
  console.log('\n❌ Password must be at least 6 characters long\n');
  process.exit(1);
}

fixEmployeePassword(email, password);
