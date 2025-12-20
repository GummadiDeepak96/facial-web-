// Fix employee login - check password and activate account
// Usage: node fix-employee-login.js employee@example.com

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const config = require('./config');

async function fixEmployeeLogin(email) {
  let connection;
  
  try {
    console.log('\n=== EMPLOYEE LOGIN DIAGNOSTIC ===\n');
    
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
      const [allEmployees] = await connection.execute('SELECT id, email, name, statusflag, status FROM employees LIMIT 10');
      console.table(allEmployees);
      return;
    }

    const employee = employees[0];
    console.log('📋 Employee Details:');
    console.log('   Email:', employee.email);
    console.log('   Name:', employee.name || 'N/A');
    console.log('   ID:', employee.id || employee.enroll_id || employee.person_id || 'N/A');
    console.log('   Status Flag:', employee.statusflag);
    console.log('   Status:', employee.status || 'N/A');
    console.log('   Has Password:', employee.password ? 'YES (' + employee.password.substring(0, 20) + '...)' : 'NO');
    console.log();

    // Check login requirements
    const issues = [];
    
    if (!employee.password) {
      issues.push('❌ No password set in database');
    }
    
    if (employee.statusflag !== 1 && employee.status !== 'active') {
      issues.push('❌ Account not active (statusflag=' + employee.statusflag + ', status=' + (employee.status || 'NULL') + ')');
    }
    
    if (issues.length > 0) {
      console.log('🚨 LOGIN ISSUES FOUND:');
      issues.forEach(issue => console.log('   ' + issue));
      console.log();
      
      // Offer to fix
      console.log('💡 RECOMMENDED FIXES:');
      
      if (!employee.password) {
        console.log('   1. Set a password using forgot-password flow or admin panel');
        console.log('      Or run: node fix-employee-password.js ' + email + ' <new-password>');
      }
      
      if (employee.statusflag !== 1 && employee.status !== 'active') {
        console.log('   2. Activate the account:');
        console.log('      SQL: UPDATE employees SET statusflag = 1 WHERE email = \'' + email + '\';');
        console.log('      Or activate via admin panel');
      }
      
      console.log();
      console.log('🔧 Quick Fix Available: Run this script with --fix flag to auto-activate:');
      console.log('   node fix-employee-login.js ' + email + ' --fix');
      
    } else {
      console.log('✅ No login issues found!');
      console.log('   Employee can login with their password.');
    }
    
    // Auto-fix if requested
    if (process.argv[3] === '--fix') {
      console.log('\n🔧 APPLYING AUTO-FIX...\n');
      
      if (employee.statusflag !== 1) {
        await connection.execute(
          'UPDATE employees SET statusflag = 1 WHERE email = ?',
          [email]
        );
        console.log('✅ Activated account (statusflag = 1)');
      }
      
      if (employee.status && employee.status !== 'active') {
        await connection.execute(
          'UPDATE employees SET status = \'active\' WHERE email = ?',
          [email]
        );
        console.log('✅ Set status to active');
      }
      
      console.log('\n✅ Employee can now login!');
      console.log('   Email: ' + email);
      console.log('   Password: Use the temporary password from the email');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed\n');
    }
  }
}

// Get command line arguments
const email = process.argv[2];

if (!email) {
  console.log('\n📖 USAGE:');
  console.log('  Diagnose:  node fix-employee-login.js <email>');
  console.log('  Auto-fix:  node fix-employee-login.js <email> --fix');
  console.log('\nEXAMPLE:');
  console.log('  node fix-employee-login.js employee@company.com');
  console.log('  node fix-employee-login.js employee@company.com --fix\n');
  process.exit(1);
}

fixEmployeeLogin(email);
