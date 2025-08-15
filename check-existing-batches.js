import mongoose from 'mongoose';
import Course from './models/course-model.js';

async function checkExistingBatches() {
  try {
    await mongoose.connect('mongodb://localhost:27017/campus');
    console.log('Connected to MongoDB');
    
    // Get the Batch model from the Course model
    const { Batch } = await import('./models/course-model.js');
    
    // Find all batches
    const batches = await Batch.find({}).limit(5);
    
    console.log(`Found ${batches.length} batches:`);
    
    batches.forEach((batch, index) => {
      console.log(`\n--- Batch ${index + 1} ---`);
      console.log('Batch ID:', batch._id);
      console.log('Batch Name:', batch.batch_name);
      console.log('Assigned Instructor ID:', batch.assigned_instructor);
      console.log('Instructor Details:', batch.instructor_details);
      console.log('Course:', batch.course);
      console.log('Status:', batch.status);
    });
    
    // Check if there are any batches with instructor_details
    const batchesWithInstructorDetails = await Batch.find({
      'instructor_details.instructor_id': { $exists: true }
    }).limit(3);
    
    console.log(`\n--- Batches with instructor_details: ${batchesWithInstructorDetails.length} ---`);
    batchesWithInstructorDetails.forEach((batch, index) => {
      console.log(`\nBatch ${index + 1}:`);
      console.log('Batch Name:', batch.batch_name);
      console.log('Instructor Details:', JSON.stringify(batch.instructor_details, null, 2));
    });
    
    await mongoose.disconnect();
    console.log('\nCheck completed!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkExistingBatches();
