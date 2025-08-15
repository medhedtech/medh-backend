import mongoose from 'mongoose';
import Course from './models/course-model.js';
import User from './models/user-modal.js';

async function fixExistingBatches() {
  try {
    await mongoose.connect('mongodb://localhost:27017/campus');
    console.log('Connected to MongoDB');
    
    // Get the Batch model
    const { Batch } = await import('./models/course-model.js');
    
    // Find all batches that have assigned_instructor but missing or null instructor_details
    const batchesToFix = await Batch.find({
      assigned_instructor: { $exists: true, $ne: null },
      $or: [
        { instructor_details: { $exists: false } },
        { 'instructor_details.instructor_id': null },
        { 'instructor_details.instructor_name': null }
      ]
    }).select('+instructor_details');
    
    console.log(`Found ${batchesToFix.length} batches that need instructor details fixed:`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const batch of batchesToFix) {
      console.log(`\n--- Processing: ${batch.batch_name} ---`);
      console.log('Batch ID:', batch._id);
      console.log('Assigned Instructor ID:', batch.assigned_instructor);
      
      try {
        // Find the instructor
        const instructor = await User.findById(batch.assigned_instructor);
        
        if (!instructor) {
          console.log('❌ Instructor not found in database');
          errorCount++;
          continue;
        }
        
        console.log('✅ Found instructor:', instructor.full_name || instructor.first_name);
        
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
        
      } catch (error) {
        console.log('❌ Error fixing batch:', error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`- Total batches processed: ${batchesToFix.length}`);
    console.log(`- Successfully fixed: ${fixedCount}`);
    console.log(`- Errors: ${errorCount}`);
    
    // Verify all batches now have instructor details
    console.log('\n🔍 Verifying all batches have instructor details...');
    const allBatchesWithInstructors = await Batch.find({
      assigned_instructor: { $exists: true, $ne: null }
    }).select('+instructor_details');
    
    let verifiedCount = 0;
    for (const batch of allBatchesWithInstructors) {
      const hasCompleteDetails = batch.instructor_details && 
                                batch.instructor_details.instructor_id && 
                                batch.instructor_details.instructor_name &&
                                batch.instructor_details.instructor_email;
      
      if (hasCompleteDetails) {
        verifiedCount++;
        console.log(`✅ ${batch.batch_name}: Complete instructor details`);
      } else {
        console.log(`❌ ${batch.batch_name}: Missing instructor details`);
      }
    }
    
    console.log(`\n✅ Verification complete: ${verifiedCount}/${allBatchesWithInstructors.length} batches have complete instructor details`);
    
    await mongoose.disconnect();
    console.log('\n✅ Fix completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixExistingBatches();
