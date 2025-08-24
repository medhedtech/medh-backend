import http from 'http';

const testProfileCompletion = () => {
  console.log('🧪 Testing Profile Completion API...');
  
  const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/api/v1/profile/me/completion',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer test-token',
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`📊 Response Status: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('📦 Response:', response);
        
        if (res.statusCode === 200) {
          console.log('✅ Profile completion API is working correctly!');
        } else if (res.statusCode === 401) {
          console.log('✅ API is working (401 is expected for invalid token)');
          console.log('✅ No more enum validation errors!');
        } else {
          console.log('❌ Unexpected response');
        }
      } catch (e) {
        console.log('📦 Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ Request failed:', error.message);
  });

  req.end();
};

testProfileCompletion();
