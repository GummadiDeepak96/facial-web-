const { db, testConnection } = require('./database');
const bcrypt = require('bcryptjs');

async function checkManagerPassword() {
  try {
    await testConnection();
    console.log('\n=== CHECKING MANAGER PASSWORD ===\n');
    
    const manager = await db.query('SELECT id, email, password FROM managers WHERE email = ?', ['sanjaybairy@avniya.in']);
    
    if (!manager || manager.length === 0) {
      console.log('❌ Manager not found!');
      process.exit(1);
    }
    
    console.log('Manager ID:', manager[0].id);
    console.log('Email:', manager[0].email);
    console.log('Password Hash:', manager[0].password);
    console.log('Hash Length:', manager[0].password.length);
    
    // Test the password
    const testPassword = 'Sanjay@123';
    console.log('\n--- Testing Password ---');
    console.log('Test Password:', testPassword);
    
    const isMatch = await bcrypt.compare(testPassword, manager[0].password);
    console.log('Password Match:', isMatch);
    
    if (!isMatch) {
      console.log('\n❌ Password does NOT match!');
      console.log('Generating new hash...');
      const newHash = await bcrypt.hash(testPassword, 10);
      console.log('New Hash:', newHash);
      
      await db.query('UPDATE managers SET password = ? WHERE email = ?', [newHash, 'sanjaybairy@avniya.in']);
      console.log('✅ Password updated with new hash');
      
      // Verify the new hash
      const verifyManager = await db.query('SELECT password FROM managers WHERE email = ?', ['sanjaybairy@avniya.in']);
      const verifyMatch = await bcrypt.compare(testPassword, verifyManager[0].password);
      console.log('Verification:', verifyMatch ? '✅ WORKS' : '❌ STILL FAILS');
    } else {
      console.log('\n✅ Password matches correctly!');
    }
    
    await db.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkManagerPassword();
