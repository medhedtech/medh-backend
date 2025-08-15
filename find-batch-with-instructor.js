import mongoose from 'mongoose';
import Course from './models/course-model.js';
import User from './models/user-modal.js';

async function findBatchWithInstructor() {
  try {
    await mongoose.connect('mongodb://localhost:27017/campus');
    console.log('Connected to MongoDB');
    
    // Get the Batch model
    const { Batch } = await import('./models/course-model.js');
    
    // Find all batches with assigned instructors
    const batches = await Batch.find({
      assigned_instructor: { $exists: true, $ne: null }
    }).select('+instructor_details').limit(10);
    
    console.log(`Found ${batches.length} batches with assigned instructors:`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`\n--- Batch ${i + 1} ---`);
      console.log('Batch ID:', batch._id);
      console.log('Batch Name:', batch.batch_name);
      console.log('Assigned Instructor ID:', batch.assigned_instructor);
      console.log('Instructor Details:', JSON.stringify(batch.instructor_details, null, 2));
      
      // Check if instructor exists
      if (batch.assigned_instructor) {
        const instructor = await User.findById(batch.assigned_instructor);
        if (instructor) {
          console.log('✅ Instructor found in database:');
          console.log('  - Name:', instructor.full_name || `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim());
          console.log('  - Email:', instructor.email);
          console.log('  - Phone:', instructor.phone_number);
          
          // Check if instructor details are missing
          if (!batch.instructor_details || !batch.instructor_details.instructor_id) {
            console.log('❌ Instructor details are missing - will fix this batch');
            
            // Fix the instructor details
            const instructorDetails = {
              instructor_id: instructor._id,
              instructor_name: instructor.full_name || `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim(),
              instructor_email: instructor.email,
              instructor_phone: instructor.phone_number || instructor.phone || null,
              assignment_date: new Date()
            };
            
            // Update the batch
            const updatedBatch = await Batch.findByIdAndUpdate(
              batch._id,
              { instructor_details: instructorDetails },
              { new: true }
            ).select('+instructor_details');
            
            console.log('✅ Fixed instructor details:');
            console.log(JSON.stringify(updatedBatch.instructor_details, null, 2));
          } else {
            console.log('✅ Instructor details are already populated');
          }
        } else {
          console.log('❌ Instructor not found in database');
        }
      }
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Check completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findBatchWithInstructor();
