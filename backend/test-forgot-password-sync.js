const axios = require('axios');
const { db } = require('./database');

async function testForgotPasswordSync() {
  try {
    console.log('\n=== Testing Forgot Password Sync Feature ===\n');
    
    const testEmail = 'deepakgummadi07@gmail.com';
    
    // Get current passwords
    console.log('1️⃣ Getting current passwords from database...');
    const manager = await db.query('SELECT password FROM managers WHERE email = ?', [testEmail]);
    const employee = await db.query('SELECT password FROM employees WHERE email = ?', [testEmail]);
    
    const managerPasswordBefore = manager[0]?.password;
    const employeePasswordBefore = employee[0]?.password;
    
    console.log(`   Manager password hash: ${managerPasswordBefore?.substring(0, 20)}...`);
    console.log(`   Employee password hash: ${employeePasswordBefore?.substring(0, 20)}...`);
    
    // Simulate forgot password for manager
    console.log('\n2️⃣ Calling manager forgot password endpoint...');
    try {
      const response = await axios.post('http://localhost:8080/api/auth/manager/forgot-password', {
        email: testEmail
      });
      console.log(`   ✅ Response:`, response.data);
    } catch (error) {
      console.log(`   ❌ Error:`, error.response?.data || error.message);
    }
    
    // Wait a bit for database update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get new passwords
    console.log('\n3️⃣ Getting passwords after forgot password...');
    const managerAfter = await db.query('SELECT password FROM managers WHERE email = ?', [testEmail]);
    const employeeAfter = await db.query('SELECT password FROM employees WHERE email = ?', [testEmail]);
    
    const managerPasswordAfter = managerAfter[0]?.password;
    const employeePasswordAfter = employeeAfter[0]?.password;
    
    console.log(`   Manager password hash: ${managerPasswordAfter?.substring(0, 20)}...`);
    console.log(`   Employee password hash: ${employeePasswordAfter?.substring(0, 20)}...`);
    
    // Check if they match
    console.log('\n4️⃣ Checking sync status...');
    if (managerPasswordAfter === employeePasswordAfter) {
      console.log(`   ✅ PASSWORDS ARE SYNCED!`);
      console.log(`   ✅ Both Manager and Employee have the same password`);
    } else {
      console.log(`   ❌ PASSWORDS ARE NOT SYNCED`);
      console.log(`   Manager password: ${managerPasswordAfter?.substring(0, 20)}...`);
      console.log(`   Employee password: ${employeePasswordAfter?.substring(0, 20)}...`);
    }
    
    console.log('\n=== Test Complete ===\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testForgotPasswordSync();
