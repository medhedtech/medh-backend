import axios from 'axios';
import colors from 'colors';

const BASE_URL = 'http://localhost:8080/api/v1';

async function checkSourceField() {
  try {
    // Authenticate
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'superadmin@medh.co',
      password: 'Admin@123'
    });
    
    const token = loginRes.data.data.access_token;
    const headers = { Authorization: `Bearer ${token}` };
    
    // Get legacy courses
    const response = await axios.get(`${BASE_URL}/courses/get?limit=10`, { headers });
    
    if (response.data.success && response.data.data.length > 0) {
      console.log('📊 Analyzing _source field in legacy courses...\n'.cyan);
      
      const sourceValues = {};
      let totalWithSource = 0;
      
      response.data.data.forEach((course, index) => {
        if (course._source) {
          totalWithSource++;
          sourceValues[course._source] = (sourceValues[course._source] || 0) + 1;
        }
        console.log(`Course ${index + 1}: ${course.course_title}`);
        console.log(`  _source = ${course._source || 'undefined'}`);
        console.log(`  category_type = ${course.category_type || 'undefined'}`);
        console.log(`  class_type = ${course.class_type || 'undefined'}`);
        console.log('');
      });
      
      console.log('📈 _source field analysis:'.yellow);
      console.log(`Total courses with _source: ${totalWithSource}/${response.data.data.length}`);
      console.log('Source value distribution:');
      Object.entries(sourceValues).forEach(([value, count]) => {
        console.log(`  ${value}: ${count} courses`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSourceField(); 