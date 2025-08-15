import mongoose from 'mongoose';
import Course from './models/course-model.js';
import User from './models/user-modal.js';

async function testApiResponse() {
  try {
    await mongoose.connect('mongodb://localhost:27017/campus');
    console.log('Connected to MongoDB');
    
    // Get the Batch model
    const { Batch } = await import('./models/course-model.js');
    
    // Test 1: Direct database query
    console.log('\n🔍 Test 1: Direct database query');
    const batches = await Batch.find({
      assigned_instructor: { $exists: true, $ne: null }
    }).select('+instructor_details');
    
    console.log(`Found ${batches.length} batches with instructors`);
    for (const batch of batches) {
      console.log(`\nBatch: ${batch.batch_name}`);
      console.log('Instructor Details:', JSON.stringify(batch.instructor_details, null, 2));
    }
    
    // Test 2: Using Course.getBatchesForCourse method
    console.log('\n🔍 Test 2: Using Course.getBatchesForCourse method');
    const course = await Course.findOne();
    if (course) {
      const courseBatches = await Course.getBatchesForCourse(course._id);
      console.log(`Found ${courseBatches.length} batches for course: ${course.course_title}`);
      
      for (const batch of courseBatches) {
        console.log(`\nBatch: ${batch.batch_name}`);
        console.log('Instructor Details:', JSON.stringify(batch.instructor_details, null, 2));
      }
    }
    
    // Test 3: Simulate API response format
    console.log('\n🔍 Test 3: Simulate API response format');
    const apiResponse = {
      success: true,
      count: batches.length,
      data: batches.map(batch => ({
        _id: batch._id,
        batch_name: batch.batch_name,
        assigned_instructor: batch.assigned_instructor,
        instructor_details: batch.instructor_details,
        course: batch.course,
        status: batch.status,
        capacity: batch.capacity,
        enrolled_students: batch.enrolled_students
      }))
    };
    
    console.log('API Response Format:');
    console.log(JSON.stringify(apiResponse, null, 2));
    
    // Test 4: Check if instructor details match frontend expectations
    console.log('\n🔍 Test 4: Verify field names match frontend expectations');
    for (const batch of batches) {
      if (batch.instructor_details) {
        const expectedFields = ['_id', 'full_name', 'email', 'phone_number'];
        const actualFields = Object.keys(batch.instructor_details);
        
        const missingFields = expectedFields.filter(field => !actualFields.includes(field));
        const extraFields = actualFields.filter(field => !expectedFields.includes(field) && field !== 'assignment_date');
        
        if (missingFields.length === 0 && extraFields.length === 0) {
          console.log(`✅ ${batch.batch_name}: Field names match frontend expectations`);
        } else {
          console.log(`❌ ${batch.batch_name}: Field name mismatch`);
          if (missingFields.length > 0) {
            console.log(`   Missing: ${missingFields.join(', ')}`);
          }
          if (extraFields.length > 0) {
            console.log(`   Extra: ${extraFields.join(', ')}`);
          }
        }
      }
    }
    
    await mongoose.disconnect();
    console.log('\n✅ API response test completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testApiResponse();
