const { db } = require('./database');
const { hashPassword, comparePassword } = require('./auth');

async function testPasswordSync() {
  try {
    console.log('\n=== Testing Password Sync - Direct Database Test ===\n');
    
    const testEmail = 'deepakgummadi07@gmail.com';
    const testPassword = 'testsync12345';
    
    // Hash the test password
    const hashedPassword = await hashPassword(testPassword);
    console.log(`1️⃣ Test password hashed successfully`);
    
    // Update BOTH manager and employee with same password
    console.log(`\n2️⃣ Updating both accounts with same password...`);
    await db.query('UPDATE managers SET password = ? WHERE email = ?', [hashedPassword, testEmail]);
    console.log(`   ✅ Manager password updated`);
    
    await db.query('UPDATE employees SET password = ? WHERE email = ?', [hashedPassword, testEmail]);
    console.log(`   ✅ Employee password updated`);
    
    // Verify manager password
    console.log(`\n3️⃣ Verifying passwords...`);
    const manager = await db.query('SELECT password FROM managers WHERE email = ?', [testEmail]);
    const isManagerPasswordValid = await comparePassword(testPassword, manager[0].password);
    console.log(`   Manager password valid: ${isManagerPasswordValid ? '✅ YES' : '❌ NO'}`);
    
    // Verify employee password
    const employee = await db.query('SELECT password FROM employees WHERE email = ?', [testEmail]);
    const isEmployeePasswordValid = await comparePassword(testPassword, employee[0].password);
    console.log(`   Employee password valid: ${isEmployeePasswordValid ? '✅ YES' : '❌ NO'}`);
    
    // Check if they have the same hash
    console.log(`\n4️⃣ Checking hash match...`);
    if (manager[0].password === employee[0].password) {
      console.log(`   ✅ PASSWORDS ARE IDENTICAL HASHES`);
    } else {
      console.log(`   ❌ PASSWORDS ARE DIFFERENT`);
      console.log(`   Manager: ${manager[0].password.substring(0, 30)}...`);
      console.log(`   Employee: ${employee[0].password.substring(0, 30)}...`);
    }
    
    // Now test login with this password
    console.log(`\n5️⃣ Simulating login...`);
    if (isManagerPasswordValid && isEmployeePasswordValid) {
      console.log(`   ✅ Manager can login with password: ${testPassword}`);
      console.log(`   ✅ Employee can login with password: ${testPassword}`);
      console.log(`   ✅ BOTH ROLES CAN LOGIN WITH SAME PASSWORD!`);
    }
    
    console.log('\n=== Test Complete ===\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testPasswordSync();
