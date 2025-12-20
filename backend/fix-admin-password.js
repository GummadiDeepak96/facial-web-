// Fix admin password by hashing it properly
// Usage: node fix-admin-password.js admin@company.com newpassword123

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const config = require('./config');

async function fixAdminPassword(email, newPassword) {
  let connection;
  
  try {
    console.log('=== FIXING ADMIN PASSWORD ===\n');
    
    // Create database connection
    const dbConfig = {
      host: config.DB_CONFIG.host,
      user: config.DB_CONFIG.user,
      password: config.DB_CONFIG.password,
      database: config.DB_CONFIG.database
    };
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database\n');

    // Check if admin exists
    const [admins] = await connection.execute(
      'SELECT * FROM admins WHERE email = ?',
      [email]
    );

    if (admins.length === 0) {
      console.log('❌ No admin found with email:', email);
      console.log('\nAvailable admins:');
      const [allAdmins] = await connection.execute('SELECT id, email, name FROM admins');
      console.table(allAdmins);
      return;
    }

    const admin = admins[0];
    console.log('Admin found:');
    console.log('   ID:', admin.id);
    console.log('   Email:', admin.email);
    console.log('   Name:', admin.name || 'N/A');
    console.log('\nCurrent password (in DB):', admin.password);
    console.log('New password (plaintext):', newPassword);

    // Hash the new password
    console.log('\nHashing new password...');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('Hashed password:', hashedPassword);

    // Update the password
    console.log('\nUpdating password in database...');
    await connection.execute(
      'UPDATE admins SET password = ? WHERE email = ?',
      [hashedPassword, email]
    );

    console.log('✅ Password updated successfully!\n');

    // Test the new password
    console.log('Testing new password...');
    const isValid = await bcrypt.compare(newPassword, hashedPassword);
    
    if (isValid) {
      console.log('✅ Password verification SUCCESSFUL!\n');
      console.log('You can now login with:');
      console.log('   Email:', email);
      console.log('   Password:', newPassword);
      console.log('\n🎉 All done! Try logging in now.\n');
    } else {
      console.log('❌ Something went wrong with password hashing\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ Database connection closed');
    }
  }
}

// Get command line arguments
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('Usage: node fix-admin-password.js <email> <new-password>');
  console.log('Example: node fix-admin-password.js admin@company.com admin123');
  console.log('\nThis will hash the password properly and update it in the database.');
  process.exit(1);
}

fixAdminPassword(email, password);
