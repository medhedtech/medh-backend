// Test script to verify instructor API functionality
const https = require('https');
const http = require('http');

console.log('🧪 Testing Instructor API...');
console.log('============================');

// Test configuration
const TEST_CONFIG = {
  backendUrl: 'http://localhost:8080/api/v1',
  timeout: 10000
};

// Simple HTTP request function
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || TEST_CONFIG.timeout
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test 1: Test instructor API endpoint
async function testInstructorAPI() {
  console.log('\n🔍 Test 1: Instructor API Endpoint Test');
  console.log('----------------------------------------');
  
  try {
    const response = await makeRequest(`${TEST_CONFIG.backendUrl}/live-classes/instructors`);
    
    if (response.status === 200) {
      console.log('✅ Instructor API Test: PASSED');
      console.log('   - Status:', response.status);
      
      if (response.data.status === 'success' && response.data.data?.items) {
        const instructors = response.data.data.items;
        console.log('   - Instructors Found:', instructors.length);
        console.log('   - Response Structure: ✅ Correct');
        
        if (instructors.length > 0) {
          console.log('\n📋 Sample Instructors:');
          instructors.slice(0, 3).forEach((instructor, index) => {
            console.log(`   ${index + 1}. ${instructor.full_name} (${instructor.email})`);
            console.log(`      - ID: ${instructor._id}`);
            console.log(`      - Domain: ${instructor.domain || 'N/A'}`);
            console.log(`      - Experience: ${instructor.experience?.years || 'N/A'} years`);
          });
          
          if (instructors.length > 3) {
            console.log(`   ... and ${instructors.length - 3} more instructors`);
          }
        } else {
          console.log('   ⚠️  No instructors found in database');
        }
        
        return {
          success: true,
          count: instructors.length,
          instructors: instructors
        };
      } else {
        console.log('❌ Instructor API Test: FAILED');
        console.log('   - Error: Invalid response structure');
        console.log('   - Response:', JSON.stringify(response.data, null, 2));
        return { success: false, error: 'Invalid response structure' };
      }
    } else {
      console.log('❌ Instructor API Test: FAILED');
      console.log('   - Status:', response.status);
      console.log('   - Error:', response.data.message || 'Unknown error');
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.log('❌ Instructor API Test: FAILED');
    console.log('   - Network Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Test 2: Test instructor API with search
async function testInstructorSearch() {
  console.log('\n🔍 Test 2: Instructor API Search Test');
  console.log('-------------------------------------');
  
  try {
    const searchQuery = 'test';
    const response = await makeRequest(`${TEST_CONFIG.backendUrl}/live-classes/instructors?search=${encodeURIComponent(searchQuery)}`);
    
    if (response.status === 200) {
      console.log('✅ Instructor Search Test: PASSED');
      console.log('   - Search Query:', searchQuery);
      
      if (response.data.status === 'success' && response.data.data?.items) {
        const instructors = response.data.data.items;
        console.log('   - Search Results:', instructors.length);
        
        if (instructors.length > 0) {
          console.log('   📋 Search Results:');
          instructors.forEach((instructor, index) => {
            console.log(`   ${index + 1}. ${instructor.full_name} (${instructor.email})`);
          });
        } else {
          console.log('   ℹ️  No instructors found matching search query');
        }
        
        return { success: true, count: instructors.length };
      } else {
        console.log('❌ Instructor Search Test: FAILED');
        console.log('   - Error: Invalid response structure');
        return { success: false, error: 'Invalid response structure' };
      }
    } else {
      console.log('❌ Instructor Search Test: FAILED');
      console.log('   - Status:', response.status);
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.log('❌ Instructor Search Test: FAILED');
    console.log('   - Network Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Test 3: Test instructor API pagination
async function testInstructorPagination() {
  console.log('\n🔍 Test 3: Instructor API Pagination Test');
  console.log('-----------------------------------------');
  
  try {
    const response = await makeRequest(`${TEST_CONFIG.backendUrl}/live-classes/instructors?page=1&limit=5`);
    
    if (response.status === 200) {
      console.log('✅ Instructor Pagination Test: PASSED');
      
      if (response.data.status === 'success' && response.data.data) {
        const { items, total, page, limit, pages } = response.data.data;
        console.log('   - Page:', page);
        console.log('   - Limit:', limit);
        console.log('   - Total Instructors:', total);
        console.log('   - Total Pages:', pages);
        console.log('   - Items on this page:', items.length);
        
        return { success: true, pagination: { page, limit, total, pages } };
      } else {
        console.log('❌ Instructor Pagination Test: FAILED');
        console.log('   - Error: Invalid response structure');
        return { success: false, error: 'Invalid response structure' };
      }
    } else {
      console.log('❌ Instructor Pagination Test: FAILED');
      console.log('   - Status:', response.status);
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.log('❌ Instructor Pagination Test: FAILED');
    console.log('   - Network Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Test 4: Check database connection
async function testDatabaseConnection() {
  console.log('\n🔍 Test 4: Database Connection Test');
  console.log('-----------------------------------');
  
  try {
    const response = await makeRequest(`${TEST_CONFIG.backendUrl}/live-classes/test-batch-student-org`);
    
    if (response.status === 200) {
      console.log('✅ Database Connection Test: PASSED');
      console.log('   - Status:', response.status);
      
      if (response.data.status === 'success') {
        console.log('   - Database: Connected');
        console.log('   - Collections: Accessible');
        return { success: true };
      } else {
        console.log('❌ Database Connection Test: FAILED');
        console.log('   - Error:', response.data.message || 'Unknown error');
        return { success: false, error: response.data.message };
      }
    } else {
      console.log('❌ Database Connection Test: FAILED');
      console.log('   - Status:', response.status);
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.log('❌ Database Connection Test: FAILED');
    console.log('   - Network Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Instructor API Tests...\n');
  
  // Run tests
  const results = {
    apiTest: await testInstructorAPI(),
    searchTest: await testInstructorSearch(),
    paginationTest: await testInstructorPagination(),
    dbTest: await testDatabaseConnection()
  };
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  console.log(`✅ API Endpoint: ${results.apiTest.success ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Search Functionality: ${results.searchTest.success ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Pagination: ${results.paginationTest.success ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Database Connection: ${results.dbTest.success ? 'PASSED' : 'FAILED'}`);
  
  const passedTests = Object.values(results).filter(r => r.success).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall Result: ${passedTests}/${totalTests} tests passed`);
  
  if (results.apiTest.success && results.apiTest.count > 0) {
    console.log('🎉 Instructor API is working correctly!');
    console.log('📝 Frontend form should now display instructor data from the database.');
    console.log('\n🔍 Next Steps:');
    console.log('   1. Open the "Create Individual 1:1 Batch" form');
    console.log('   2. Check the Instructor dropdown');
    console.log('   3. Verify instructor data is populated');
  } else if (results.apiTest.success && results.apiTest.count === 0) {
    console.log('⚠️  API is working but no instructors found in database');
    console.log('📝 You need to add instructors to the instructor collection first.');
  } else {
    console.log('❌ Some tests failed. Please check the backend server and database.');
  }
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testInstructorAPI,
  testInstructorSearch,
  testInstructorPagination,
  testDatabaseConnection
};
