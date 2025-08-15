import mongoose from 'mongoose';
import Course from './models/course-model.js';
import User from './models/user-modal.js';

async function testNewBatchCreation() {
  try {
    await mongoose.connect('mongodb://localhost:27017/campus');
    console.log('Connected to MongoDB');
    
    // Find a course
    const course = await Course.findOne();
    if (!course) {
      console.log('No course found. Please create a course first.');
      return;
    }
    
    // Find an instructor
    const instructor = await User.findOne({ role: { $in: ['instructor'] } });
    if (!instructor) {
      console.log('No instructor found. Please create an instructor first.');
      return;
    }
    
    console.log('Found course:', course.course_title);
    console.log('Found instructor:', instructor.full_name || instructor.first_name);
    
    // Create a test batch with instructor
    const batchData = {
      batch_name: 'Test Batch with New Field Names',
      start_date: new Date('2025-01-20'),
      end_date: new Date('2025-04-20'),
      capacity: 15,
      assigned_instructor: instructor._id,
      status: 'Upcoming'
    };
    
    console.log('\nCreating batch with instructor details...');
    const newBatch = await Course.createBatch(course._id, batchData, instructor._id);
    
    console.log('✅ Batch created successfully!');
    console.log('Batch ID:', newBatch._id);
    console.log('Batch Name:', newBatch.batch_name);
    console.log('Assigned Instructor ID:', newBatch.assigned_instructor);
    console.log('Instructor Details:', JSON.stringify(newBatch.instructor_details, null, 2));
    
    // Verify the field names match frontend expectations
    console.log('\n🔍 Verifying field names match frontend expectations...');
    const instructorDetails = newBatch.instructor_details;
    
    const expectedFields = ['_id', 'full_name', 'email', 'phone_number'];
    const actualFields = Object.keys(instructorDetails || {});
    
    console.log('Expected fields:', expectedFields);
    console.log('Actual fields:', actualFields);
    
    const missingFields = expectedFields.filter(field => !actualFields.includes(field));
    const extraFields = actualFields.filter(field => !expectedFields.includes(field) && field !== 'assignment_date');
    
    if (missingFields.length === 0 && extraFields.length === 0) {
      console.log('✅ All field names match frontend expectations!');
    } else {
      console.log('❌ Field name mismatch:');
      if (missingFields.length > 0) {
        console.log('Missing fields:', missingFields);
      }
      if (extraFields.length > 0) {
        console.log('Extra fields:', extraFields);
      }
    }
    
    // Test retrieval with explicit selection
    console.log('\n--- Testing retrieval WITH explicit instructor_details selection ---');
    const batchWithSelection = await Course.getBatchesForCourse(course._id);
    const lastBatch = batchWithSelection[batchWithSelection.length - 1];
    console.log('Instructor Details (with selection):', JSON.stringify(lastBatch.instructor_details, null, 2));
    
    await mongoose.disconnect();
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testNewBatchCreation();
