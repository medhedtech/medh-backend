const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api/v1';

async function testPasswordChange() {
  try {
    console.log('🧪 Testing password change functionality...');
    
    // Step 1: Login to get a token
    console.log('\n1️⃣ Logging in...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'student@medh.co',
      password: 'Medh123',
      generate_quick_login_key: true
    });
    
    if (!loginResponse.data.success) {
      console.error('❌ Login failed:', loginResponse.data.message);
      return;
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful, token received');
    
    // Step 2: Change password
    console.log('\n2️⃣ Changing password...');
    const changePasswordResponse = await axios.put(`${API_BASE_URL}/auth/change-password`, {
      currentPassword: 'Medh123',
      newPassword: 'NewPassword123',
      confirmPassword: 'NewPassword123',
      invalidateAllSessions: false
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!changePasswordResponse.data.success) {
      console.error('❌ Password change failed:', changePasswordResponse.data.message);
      return;
    }
    
    console.log('✅ Password change successful');
    console.log('📋 Response data:', JSON.stringify(changePasswordResponse.data.data, null, 2));
    
    const newToken = changePasswordResponse.data.data.new_token;
    if (newToken) {
      console.log('🔑 New token received:', newToken.substring(0, 20) + '...');
    } else {
      console.log('⚠️ No new token received');
    }
    
    // Step 3: Test login with new password
    console.log('\n3️⃣ Testing login with new password...');
    const newLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'student@medh.co',
      password: 'NewPassword123',
      generate_quick_login_key: true
    });
    
    if (newLoginResponse.data.success) {
      console.log('✅ Login with new password successful');
    } else {
      console.error('❌ Login with new password failed:', newLoginResponse.data.message);
    }
    
    // Step 4: Test login with old password (should fail)
    console.log('\n4️⃣ Testing login with old password (should fail)...');
    try {
      const oldLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'student@medh.co',
        password: 'Medh123',
        generate_quick_login_key: true
      });
      
      if (oldLoginResponse.data.success) {
        console.log('⚠️ Login with old password succeeded (unexpected)');
      } else {
        console.log('✅ Login with old password failed as expected');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Login with old password failed as expected (401)');
      } else {
        console.error('❌ Unexpected error with old password:', error.message);
      }
    }
    
    console.log('\n🎉 Password change test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testPasswordChange();
