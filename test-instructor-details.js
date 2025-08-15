import mongoose from 'mongoose';
import Course from './models/course-model.js';
import User from './models/user-modal.js';

async function testInstructorDetails() {
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
      batch_name: 'Test Batch with Instructor Details',
      start_date: new Date('2025-01-15'),
      end_date: new Date('2025-04-15'),
      capacity: 10,
      assigned_instructor: instructor._id,
      status: 'Upcoming'
    };
    
    console.log('Creating batch with instructor details...');
    const newBatch = await Course.createBatch(course._id, batchData, instructor._id);
    
    console.log('Batch created successfully!');
    console.log('Batch ID:', newBatch._id);
    console.log('Assigned Instructor ID:', newBatch.assigned_instructor);
    console.log('Instructor Details:', newBatch.instructor_details);
    
    // Test retrieval without explicit selection
    console.log('\n--- Testing retrieval WITHOUT explicit instructor_details selection ---');
    const batchWithoutSelection = await Course.getBatchesForCourse(course._id);
    const lastBatch = batchWithoutSelection[batchWithoutSelection.length - 1];
    console.log('Instructor Details (without selection):', lastBatch.instructor_details);
    
    // Test retrieval with explicit selection
    console.log('\n--- Testing retrieval WITH explicit instructor_details selection ---');
    const batchWithSelection = await Course.getBatchesForCourse(course._id);
    const lastBatchWithSelection = batchWithSelection[batchWithSelection.length - 1];
    console.log('Instructor Details (with selection):', lastBatchWithSelection.instructor_details);
    
    // Test direct findById with selection
    console.log('\n--- Testing direct findById with selection ---');
    const directBatch = await mongoose.model('Batch').findById(newBatch._id).select('+instructor_details');
    console.log('Instructor Details (direct findById):', directBatch.instructor_details);
    
    // Test direct findById without selection
    console.log('\n--- Testing direct findById without selection ---');
    const directBatchWithoutSelection = await mongoose.model('Batch').findById(newBatch._id);
    console.log('Instructor Details (direct findById without selection):', directBatchWithoutSelection.instructor_details);
    
    await mongoose.disconnect();
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testInstructorDetails();
