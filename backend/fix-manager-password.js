// Fix manager password by hashing it properly
// Usage: node fix-manager-password.js manager@email.com newpassword123

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const config = require('./config');

async function fixManagerPassword(email, newPassword) {
  let connection;
  
  try {
    console.log('=== FIXING MANAGER PASSWORD ===\n');
    
    // Create database connection
    const dbConfig = {
      host: config.DB_CONFIG.host,
      user: config.DB_CONFIG.user,
      password: config.DB_CONFIG.password,
      database: config.DB_CONFIG.database
    };
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database\n');

    // Check if manager exists
    const [managers] = await connection.execute(
      'SELECT * FROM managers WHERE email = ?',
      [email]
    );

    if (managers.length === 0) {
      console.log('❌ No manager found with email:', email);
      console.log('\nAvailable managers:');
      const [allManagers] = await connection.execute('SELECT id, email, name, department FROM managers');
      console.table(allManagers);
      return;
    }

    const manager = managers[0];
    console.log('Manager found:');
    console.log('   ID:', manager.id);
    console.log('   Email:', manager.email);
    console.log('   Name:', manager.name || 'N/A');
    console.log('   Department:', manager.department || 'N/A');
    console.log('\nCurrent password (in DB):', manager.password);
    console.log('New password (plaintext):', newPassword);

    // Hash the new password
    console.log('\nHashing new password...');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('Hashed password:', hashedPassword);

    // Update the password
    console.log('\nUpdating password in database...');
    await connection.execute(
      'UPDATE managers SET password = ? WHERE email = ?',
      [hashedPassword, email]
    );
    console.log('✅ Password updated successfully!');

    // Verify the update
    console.log('\nTesting new password...');
    const [updatedManagers] = await connection.execute(
      'SELECT * FROM managers WHERE email = ?',
      [email]
    );
    const updatedManager = updatedManagers[0];
    
    const isValid = await bcrypt.compare(newPassword, updatedManager.password);
    
    if (isValid) {
      console.log('✅ Password verification SUCCESSFUL!');
      console.log('\nYou can now login with:');
      console.log('   Email:', email);
      console.log('   Password:', newPassword);
      console.log('\n🎉 All done! Try logging in now.');
    } else {
      console.log('❌ Password verification FAILED!');
      console.log('Something went wrong. Please try again.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node fix-manager-password.js <email> <new-password>');
  console.log('Example: node fix-manager-password.js manager@company.com password123');
  process.exit(1);
}

const [email, newPassword] = args;
fixManagerPassword(email, newPassword);
