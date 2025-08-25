import http from 'http';

const testProfileAPI = async () => {
  console.log('🧪 Testing Profile API Endpoints...');
  
  // Test GET profile endpoint
  console.log('\n📋 Testing GET /api/v1/profile/me/comprehensive...');
  
  const getOptions = {
    hostname: 'localhost',
    port: 8080,
    path: '/api/v1/profile/me/comprehensive',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer test-token',
      'Content-Type': 'application/json'
    }
  };

  const getReq = http.request(getOptions, (res) => {
    console.log(`📊 GET Response Status: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('📦 GET Response:', response);
      } catch (e) {
        console.log('📦 GET Raw response:', data);
      }
    });
  });

  getReq.on('error', (error) => {
    console.log('❌ GET Request failed:', error.message);
  });

  getReq.end();

  // Test PATCH profile endpoint
  console.log('\n📝 Testing PATCH /api/v1/profile/me/comprehensive...');
  
  const testData = {
    full_name: 'Test User Updated',
    bio: 'This is a test bio update',
    meta: {
      occupation: 'Software Developer',
      company: 'Test Company'
    }
  };
  
  const postData = JSON.stringify(testData);
  
  const patchOptions = {
    hostname: 'localhost',
    port: 8080,
    path: '/api/v1/profile/me/comprehensive',
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const patchReq = http.request(patchOptions, (res) => {
    console.log(`📊 PATCH Response Status: ${res.statusCode}`);
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('📦 PATCH Response:', response);
      } catch (e) {
        console.log('📦 PATCH Raw response:', data);
      }
    });
  });

  patchReq.on('error', (error) => {
    console.log('❌ PATCH Request failed:', error.message);
  });

  patchReq.write(postData);
  patchReq.end();
};

testProfileAPI();
