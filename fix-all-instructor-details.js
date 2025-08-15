import mongoose from 'mongoose';
import Course from './models/course-model.js';
import User from './models/user-modal.js';

async function fixAllInstructorDetails() {
  try {
    await mongoose.connect('mongodb://localhost:27017/campus');
    console.log('Connected to MongoDB');
    
    // Get the Batch model
    const { Batch } = await import('./models/course-model.js');
    
    // Find all batches with assigned instructors but missing instructor details
    const batches = await Batch.find({
      assigned_instructor: { $exists: true, $ne: null },
      $or: [
        { 'instructor_details.instructor_id': { $exists: false } },
        { 'instructor_details.instructor_id': null },
        { 'instructor_details.instructor_name': null }
      ]
    }).select('+instructor_details');
    
    console.log(`Found ${batches.length} batches with missing instructor details:`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`\n--- Processing Batch ${i + 1} ---`);
      console.log('Batch ID:', batch._id);
      console.log('Batch Name:', batch.batch_name);
      console.log('Assigned Instructor ID:', batch.assigned_instructor);
      
      try {
        // Find the instructor
        const instructor = await User.findById(batch.assigned_instructor);
        
        if (instructor) {
          console.log('✅ Instructor found:', instructor.full_name || instructor.first_name);
          
          // Create instructor details
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
          fixedCount++;
          
        } else {
          console.log('❌ Instructor not found in database');
          errorCount++;
        }
        
      } catch (error) {
        console.log('❌ Error processing batch:', error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`- Total batches processed: ${batches.length}`);
    console.log(`- Successfully fixed: ${fixedCount}`);
    console.log(`- Errors: ${errorCount}`);
    
    // Also check for any batches that might have been created with the old method
    console.log('\n🔍 Checking for any other batches with assigned instructors...');
    const allBatchesWithInstructors = await Batch.find({
      assigned_instructor: { $exists: true, $ne: null }
    }).select('+instructor_details');
    
    console.log(`Total batches with assigned instructors: ${allBatchesWithInstructors.length}`);
    
    for (const batch of allBatchesWithInstructors) {
      const hasInstructorDetails = batch.instructor_details && 
                                  batch.instructor_details.instructor_id && 
                                  batch.instructor_details.instructor_name;
      
      console.log(`Batch ${batch.batch_name}: ${hasInstructorDetails ? '✅' : '❌'} instructor details`);
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Fix completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixAllInstructorDetails();
