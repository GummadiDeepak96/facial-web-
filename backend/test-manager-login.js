const axios = require('axios');

async function testManagerLogin() {
  try {
    console.log('\n=== TESTING MANAGER LOGIN ===\n');
    console.log('Email: sanjaybairy@avniya.in');
    console.log('Password: Sanjay@123');
    console.log('Endpoint: http://localhost:8080/api/auth/manager/login\n');
    
    const response = await axios.post('http://localhost:8080/api/auth/manager/login', {
      email: 'sanjaybairy@avniya.in',
      password: 'Sanjay@123'
    });
    
    console.log('✅ LOGIN SUCCESSFUL!\n');
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.user) {
      console.log('\n=== USER DETAILS ===');
      console.log('Name:', response.data.user.name);
      console.log('Email:', response.data.user.email);
      console.log('Department:', response.data.user.department);
      console.log('User Type:', response.data.user.userType);
    }
    
    if (response.data.token) {
      console.log('\n✅ JWT Token received (length:', response.data.token.length, ')');
    }
    
  } catch (error) {
    console.error('\n❌ LOGIN FAILED!\n');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else if (error.request) {
      console.error('No response received. Is the server running?');
      console.error('Make sure to start the server with: cd backend && node server.js');
    } else {
      console.error('Error:', error.message);
    }
  }
}

testManagerLogin();
