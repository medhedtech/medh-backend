#!/usr/bin/env node

/**
 * Test script for the new courses by category API endpoint
 * Usage: node test-courses-by-category.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/courses';

async function testCoursesByCategory() {
  console.log('🧪 Testing Courses by Category API (Grouped, No Pagination)\n');

  const tests = [
    {
      name: 'Get all courses grouped by category',
      url: `${BASE_URL}/category`,
      description: 'Should return all courses grouped by their categories'
    },
    {
      name: 'Filter by specific category',
      url: `${BASE_URL}/category?category=AI For Professionals`,
      description: 'Should return courses only from AI For Professionals category'
    },
    {
      name: 'Filter by status',
      url: `${BASE_URL}/category?status=Published`,
      description: 'Should return only published courses grouped by category'
    },
    {
      name: 'Search with text',
      url: `${BASE_URL}/category?search=machine learning`,
      description: 'Should return courses matching search term, grouped by category'
    },
    {
      name: 'Sort by course title descending',
      url: `${BASE_URL}/category?sort_by=course_title&sort_order=desc`,
      description: 'Should return courses sorted by title in descending order within each category'
    },
    {
      name: 'Multiple filters',
      url: `${BASE_URL}/category?status=Published&class_type=Live&sort_by=course_title`,
      description: 'Should apply multiple filters and group results by category'
    }
  ];

  for (const test of tests) {
    try {
      console.log(`\n📋 ${test.name}`);
      console.log(`🔗 URL: ${test.url}`);
      console.log(`📝 Description: ${test.description}`);
      
      const response = await axios.get(test.url);
      
      if (response.status === 200 && response.data.success) {
        console.log('✅ Status: SUCCESS');
        console.log(`📊 Response Structure:`);
        console.log(`   - Success: ${response.data.success}`);
        console.log(`   - Message: ${response.data.message}`);
        
        const data = response.data.data;
        console.log(`   - Total Courses: ${data.summary.totalCourses}`);
        console.log(`   - Total Categories: ${data.summary.totalCategories}`);
        
        // Show category breakdown
        console.log(`   - Categories with Course Counts:`);
        data.summary.categoriesWithCounts.forEach(cat => {
          console.log(`     * ${cat.category}: ${cat.courseCount} courses`);
        });
        
        // Show sample courses from first category
        const firstCategory = Object.keys(data.coursesByCategory)[0];
        if (firstCategory && data.coursesByCategory[firstCategory].length > 0) {
          console.log(`   - Sample courses from "${firstCategory}":`);
          data.coursesByCategory[firstCategory].slice(0, 3).forEach((course, index) => {
            console.log(`     ${index + 1}. ${course.course_title}`);
            console.log(`        Category: ${course.course_category}`);
            console.log(`        Subcategory: ${course.course_subcategory || 'N/A'}`);
            console.log(`        Tags: ${course.course_tag || 'N/A'}`);
          });
        }
        
        // Verify response structure
        const requiredFields = ['coursesByCategory', 'summary', 'filters', 'sorting', 'sources'];
        const missingFields = requiredFields.filter(field => !data.hasOwnProperty(field));
        
        if (missingFields.length === 0) {
          console.log('✅ All required fields present');
        } else {
          console.log(`❌ Missing fields: ${missingFields.join(', ')}`);
        }
        
        // Verify each course has required fields
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
        
      } else {
        console.log('❌ Status: FAILED');
        console.log(`   Error: ${response.data.message || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.log('❌ Status: ERROR');
      if (error.response) {
        console.log(`   HTTP Status: ${error.response.status}`);
        console.log(`   Error Message: ${error.response.data?.message || error.message}`);
      } else {
        console.log(`   Error: ${error.message}`);
      }
    }
    
    console.log('─'.repeat(80));
  }
}

// Run the tests
testCoursesByCategory().catch(console.error); 