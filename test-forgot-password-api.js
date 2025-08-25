import axios from 'axios';

async function testForgotPasswordAPI() {
  try {
    console.log("Testing forgot password API endpoint...");
    
    const apiUrl = 'http://localhost:8080/api/v1/auth/forgot-password';
    const testEmail = 'test@example.com';
    
    console.log(`Making POST request to: ${apiUrl}`);
    console.log(`Email: ${testEmail}`);
    
    const response = await axios.post(apiUrl, {
      email: testEmail
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log("✅ API Response:", response.data);
    
    if (response.data.success) {
      console.log("✅ Forgot password API is working!");
    } else {
      console.log("❌ Forgot password API failed");
    }
    
  } catch (error) {
    console.error("❌ Error testing forgot password API:", error.response?.data || error.message);
  }
}

testForgotPasswordAPI();

