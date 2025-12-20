const { db, testConnection } = require('./database');
const bcrypt = require('bcryptjs');

async function resetManagerPassword() {
  try {
    await testConnection();
    
    const email = 'sanjaybairy@avniya.in';
    const newPassword = 'Sanjay@123'; // New password for sanjay
    
    console.log('Resetting password for:', email);
    console.log('New password:', newPassword);
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('Hashed password:', hashedPassword);
    
    // Update in database
    await db.query(
      'UPDATE managers SET password = ? WHERE email = ?',
      [hashedPassword, email]
    );
    
    console.log('\n✅ Password updated successfully!');
    console.log('\n=== LOGIN CREDENTIALS ===');
    console.log('Email:', email);
    console.log('Password:', newPassword);
    console.log('========================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetManagerPassword();
