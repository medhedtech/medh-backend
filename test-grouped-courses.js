const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/courses';

async function testGroupedCourses() {
  console.log('🧪 Testing Grouped Courses by Category API\n');

  try {
    console.log('📋 Fetching all courses grouped by category...');
    const response = await axios.get(`${BASE_URL}/category`);
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ API Response: SUCCESS\n');
      
      const data = response.data.data;
      
      // Display summary
      console.log('📊 SUMMARY:');
      console.log(`   Total Courses: ${data.summary.totalCourses}`);
      console.log(`   Total Categories: ${data.summary.totalCategories}\n`);
      
      // Display categories with counts
      console.log('📚 CATEGORIES:');
      data.summary.categoriesWithCounts.forEach((cat, index) => {
        console.log(`   ${index + 1}. ${cat.category}: ${cat.courseCount} courses`);
      });
      console.log('');
      
      // Display sample courses from each category
      console.log('🎯 SAMPLE COURSES BY CATEGORY:');
      Object.entries(data.coursesByCategory).forEach(([categoryName, courses]) => {
        console.log(`\n📂 ${categoryName} (${courses.length} courses):`);
        
        // Show first 3 courses from each category
        courses.slice(0, 3).forEach((course, index) => {
          console.log(`   ${index + 1}. ${course.course_title}`);
          console.log(`      ID: ${course._id}`);
          console.log(`      Subcategory: ${course.course_subcategory || 'N/A'}`);
          console.log(`      Tags: ${course.course_tag || 'N/A'}`);
        });
        
        if (courses.length > 3) {
          console.log(`   ... and ${courses.length - 3} more courses`);
        }
      });
      
      // Verify response structure
      console.log('\n🔍 VALIDATION:');
      const requiredFields = ['coursesByCategory', 'summary', 'filters', 'sorting', 'sources'];
      const missingFields = requiredFields.filter(field => !data.hasOwnProperty(field));
      
      if (missingFields.length === 0) {
        console.log('✅ All required response fields present');
      } else {
        console.log(`❌ Missing fields: ${missingFields.join(', ')}`);
      }
      
      // Verify course fields
      let allCoursesValid = true;
      const requiredCourseFields = ['_id', 'course_category', 'course_subcategory', 'course_title', 'course_tag'];
      
      Object.values(data.coursesByCategory).forEach(courses => {
        courses.forEach(course => {
          const missingCourseFields = requiredCourseFields.filter(field => !course.hasOwnProperty(field));
          if (missingCourseFields.length > 0) {
            allCoursesValid = false;
            console.log(`❌ Course ${course._id} missing fields: ${missingCourseFields.join(', ')}`);
          }
        });
      });
      
      if (allCoursesValid) {
        console.log('✅ All courses have required fields');
      }
      
      console.log('\n🎉 Test completed successfully!');
      
    } else {
      console.log('❌ API Response: FAILED');
      console.log(`   Error: ${response.data.message || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.log('💥 Test failed with error:');
    if (error.response) {
      console.log(`   HTTP Status: ${error.response.status}`);
      console.log(`   Error Message: ${error.response.data?.message || error.message}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
  }
}

// Run the test
testGroupedCourses(); 