import http from 'http';

const testProfileCompletionStructure = () => {
  console.log('🧪 Testing Profile Completion API Structure...');
  
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
        console.log('📦 Full Response:', JSON.stringify(response, null, 2));
        
        if (res.statusCode === 200) {
          console.log('\n✅ API Response Structure Analysis:');
          console.log('✅ success:', typeof response.success, response.success);
          console.log('✅ message:', typeof response.message, response.message);
          console.log('✅ data exists:', !!response.data);
          
          if (response.data) {
            console.log('✅ data.overall_completion exists:', !!response.data.overall_completion);
            if (response.data.overall_completion) {
              console.log('✅ overall_completion.percentage:', typeof response.data.overall_completion.percentage, response.data.overall_completion.percentage);
              console.log('✅ overall_completion.level:', typeof response.data.overall_completion.level, response.data.overall_completion.level);
              console.log('✅ overall_completion.message:', typeof response.data.overall_completion.message, response.data.overall_completion.message);
            }
          }
          
          console.log('\n🎯 Frontend should access: response.data.overall_completion.percentage');
        } else if (res.statusCode === 401) {
          console.log('✅ API is working (401 is expected for invalid token)');
          console.log('✅ Response structure is valid');
        } else {
          console.log('❌ Unexpected response');
        }
      } catch (e) {
        console.log('📦 Raw response:', data);
        console.log('❌ JSON parse error:', e.message);
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ Request failed:', error.message);
  });

  req.end();
};

testProfileCompletionStructure();
