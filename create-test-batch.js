import mongoose from 'mongoose';
import Course from './models/course-model.js';
import User from './models/user-modal.js';

async function createTestBatch() {
  try {
    await mongoose.connect('mongodb://localhost:27017/campus');
    console.log('Connected to MongoDB');
    
    // Find or create a course
    let course = await Course.findOne();
    if (!course) {
      console.log('No course found. Creating a test course...');
      course = new Course({
        course_title: 'Test Course for Instructor Details',
        course_description: 'A test course to verify instructor details storage',
        course_type: 'live',
        course_category: 'Technology',
        course_image: 'test-image.jpg',
        slug: 'test-course-instructor-details',
        is_active: true,
        is_Quizes: 'No',
        is_Projects: 'No',
        is_Assignments: 'No',
        is_Certification: 'No',
        class_type: 'Live Courses',
        course_duration: 30,
        no_of_Sessions: 10,
        pricing: {
          individual: 1000,
          batch: 800,
          currency: 'INR'
        }
      });
      await course.save();
      console.log('Test course created:', course.course_title);
    } else {
      console.log('Using existing course:', course.course_title);
    }
    
    // Find or create an instructor
    let instructor = await User.findOne({ role: { $in: ['instructor'] } });
    if (!instructor) {
      console.log('No instructor found. Creating a test instructor...');
      instructor = new User({
        first_name: 'Test',
        last_name: 'Instructor',
        full_name: 'Test Instructor',
        email: 'test.instructor@example.com',
        phone_number: '+1234567890',
        role: ['instructor'],
        is_active: true,
        password: 'testpassword123'
      });
      await instructor.save();
      console.log('Test instructor created:', instructor.full_name);
    } else {
      console.log('Using existing instructor:', instructor.full_name);
    }
    
    // Create a test batch with instructor
    const batchData = {
      batch_name: 'Test Batch with Instructor Details',
      start_date: new Date('2025-01-15'),
      end_date: new Date('2025-04-15'),
      capacity: 10,
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
    
    // Test retrieval with explicit selection
    console.log('\n--- Testing retrieval WITH explicit instructor_details selection ---');
    const batchWithSelection = await Course.getBatchesForCourse(course._id);
    const lastBatch = batchWithSelection[batchWithSelection.length - 1];
    console.log('Instructor Details (with selection):', JSON.stringify(lastBatch.instructor_details, null, 2));
    
    // Test retrieval without explicit selection
    console.log('\n--- Testing retrieval WITHOUT explicit instructor_details selection ---');
    const { Batch } = await import('./models/course-model.js');
    const batchWithoutSelection = await Batch.findById(newBatch._id);
    console.log('Instructor Details (without selection):', batchWithoutSelection.instructor_details);
    
    await mongoose.disconnect();
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTestBatch();
