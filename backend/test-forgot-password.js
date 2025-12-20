const { db, testConnection } = require('./database');
const { hashPassword } = require('./auth');
const bcrypt = require('bcryptjs');

async function testForgotPassword() {
  try {
    await testConnection();
    console.log('\n=== TESTING MANAGER FORGOT PASSWORD ===\n');
    
    const email = 'sanjaybairy@avniya.in';
    
    // Detect status column
    const dbName = require('./config').DB_CONFIG.database;
    const statusCol = await db.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'managers' 
       AND column_name IN ('status','statusflag') LIMIT 1`,
      [dbName]
    );
    const statusField = statusCol.length > 0 ? statusCol[0].column_name : 'statusflag';
    const statusCondition = statusField === 'status' ? `status = 'active'` : `statusflag = 1`;
    
    console.log('Status field detected:', statusField);
    console.log('Status condition:', statusCondition);
    
    // Find manager
    const managers = await db.query(`SELECT * FROM managers WHERE email = ? AND ${statusCondition}`, [email]);
    const manager = managers[0];
    
    if (!manager) {
      console.log('❌ Manager not found or inactive');
      process.exit(1);
    }
    
    console.log('✅ Manager found:', {
      id: manager.id,
      name: manager.name,
      email: manager.email,
      status: manager.status || manager.statusflag
    });
    
    // Generate new password (this would be sent via email)
    const newPassword = 'TestTemp123!';
    console.log('\n--- Generated Temporary Password ---');
    console.log('Temporary Password:', newPassword);
    
    const hashedPassword = await hashPassword(newPassword);
    console.log('Hashed Password:', hashedPassword);
    
    // Update password in database
    await db.query('UPDATE managers SET password = ? WHERE email = ?', [hashedPassword, email]);
    console.log('✅ Password updated in database');
    
    // Verify the password was set correctly
    const bcrypt = require('bcryptjs');
    const verifyManager = await db.query('SELECT password FROM managers WHERE email = ?', [email]);
    const isMatch = await bcrypt.compare(newPassword, verifyManager[0].password);
    console.log('Verification:', isMatch ? '✅ Password can be used for login' : '❌ Password mismatch');
    
    console.log('\n=== SUCCESS ===');
    console.log('You can now login with:');
    console.log('Email:', email);
    console.log('Password:', newPassword);
    console.log('\nThen use /manager/reset-password to set a new permanent password.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testForgotPassword();
