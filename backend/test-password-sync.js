const { db } = require('./database');
const { hashPassword, comparePassword } = require('./auth');

async function testSync() {
  try {
    console.log('\n=== Testing Password Sync Feature ===\n');
    
    // Test with manager "deepakgummadi07@gmail.com"
    const testEmail = 'deepakgummadi07@gmail.com';
    const testPassword = 'test12345';
    
    console.log(`Testing with email: ${testEmail}`);
    
    // Hash the password
    const hashedPassword = await hashPassword(testPassword);
    console.log(`✅ Password hashed`);
    
    // Simulate manager password change
    console.log(`\n🔄 Simulating manager password change...`);
    await db.query('UPDATE managers SET password = ? WHERE email = ?', [hashedPassword, testEmail]);
    console.log(`✅ Manager password updated`);
    
    // Check if employee exists with same email
    const employees = await db.query('SELECT * FROM employees WHERE email = ?', [testEmail]);
    console.log(`👤 Found ${employees.length} employee(s) with email ${testEmail}`);
    
    if (employees.length > 0) {
      // Sync password to employee
      console.log(`\n🔄 Syncing password to employee account...`);
      await db.query('UPDATE employees SET password = ? WHERE email = ?', [hashedPassword, testEmail]);
      console.log(`✅ Employee password synced`);
    }
    
    // Verify both passwords are the same now
    console.log(`\n✔️ Verifying password sync...`);
    const manager = await db.query('SELECT password FROM managers WHERE email = ?', [testEmail]);
    const employee = await db.query('SELECT password FROM employees WHERE email = ?', [testEmail]);
    
    if (manager[0] && employee[0] && manager[0].password === employee[0].password) {
      console.log(`✅ PASSWORDS ARE SYNCED - Both accounts have the same password hash`);
      console.log(`✅ Manager can now login with email: ${testEmail} and password: ${testPassword}`);
      console.log(`✅ Employee can now login with email: ${testEmail} and password: ${testPassword}`);
    } else {
      console.log(`❌ PASSWORDS ARE NOT SYNCED`);
    }
    
    console.log('\n=== Test Complete ===\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testSync();
