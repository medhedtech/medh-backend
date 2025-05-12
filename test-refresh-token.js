import axios from 'axios';

// Get command line arguments
const args = process.argv.slice(2);
let token = null;
let endpoint = 'http://localhost:3000/api/v1/auth/refresh-token';

// Parse arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '-t' || args[i] === '--token') {
    token = args[i + 1];
    i++;
  } else if (args[i] === '-e' || args[i] === '--endpoint') {
    endpoint = args[i + 1];
    i++;
  }
}

async function testRefreshToken() {
  try {
    if (!token) {
      console.error('Error: Refresh token is required. Use --token or -t option.');
      process.exit(1);
    }

    console.log(`Testing refresh token at ${endpoint}...`);
    
    try {
      const response = await axios.post(endpoint, {
        refresh_token: token
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Status:', response.status);
      console.log('Headers:', response.headers);
      console.log('Response:', response.data);
      
      console.log('✅ Refresh token is working correctly!');
    } catch (error) {
      console.error('❌ Refresh token test failed.');
      console.error('Status:', error.response?.status);
      console.error('Error:', error.response?.data || error.message);
      
      // Log the request that was sent
      console.log('\nRequest details:');
      console.log('URL:', endpoint);
      console.log('Body:', { refresh_token: token });
    }
  } catch (error) {
    console.error('Error testing refresh token:', error.message);
  }
}

testRefreshToken(); 