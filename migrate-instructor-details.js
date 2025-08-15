import mongoose from 'mongoose';
import Course from './models/course-model.js';
import User from './models/user-modal.js';

async function migrateInstructorDetails() {
  try {
    await mongoose.connect('mongodb://localhost:27017/campus');
    console.log('Connected to MongoDB');
    
    // Get the Batch model
    const { Batch } = await import('./models/course-model.js');
    
    // Find all batches with old instructor_details field names
    const batchesWithOldFields = await Batch.find({
      $or: [
        { 'instructor_details.instructor_id': { $exists: true } },
        { 'instructor_details.instructor_name': { $exists: true } },
        { 'instructor_details.instructor_email': { $exists: true } },
        { 'instructor_details.instructor_phone': { $exists: true } }
      ]
    }).select('+instructor_details');
    
    console.log(`Found ${batchesWithOldFields.length} batches with old field names:`);
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const batch of batchesWithOldFields) {
      console.log(`\n--- Migrating: ${batch.batch_name} ---`);
      console.log('Batch ID:', batch._id);
      
      try {
        // Get the old instructor details
        const oldDetails = batch.instructor_details;
        
        if (oldDetails && oldDetails.instructor_id) {
          // Find the instructor to get fresh data
          const instructor = await User.findById(oldDetails.instructor_id);
          
          if (instructor) {
            // Create new instructor details with correct field names
            const newInstructorDetails = {
              _id: instructor._id,
              full_name: instructor.full_name || `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim(),
              email: instructor.email,
              phone_number: instructor.phone_number || instructor.phone || null,
              assignment_date: oldDetails.assignment_date || new Date()
            };
            
            // Update the batch
            const updatedBatch = await Batch.findByIdAndUpdate(
              batch._id,
              { instructor_details: newInstructorDetails },
              { new: true }
            ).select('+instructor_details');
            
            console.log('✅ Migrated instructor details:');
            console.log(JSON.stringify(updatedBatch.instructor_details, null, 2));
            migratedCount++;
            
          } else {
            console.log('❌ Instructor not found, skipping migration');
            errorCount++;
          }
        } else {
          console.log('❌ No old instructor details found');
          errorCount++;
        }
        
      } catch (error) {
        console.log('❌ Error migrating batch:', error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`- Total batches processed: ${batchesWithOldFields.length}`);
    console.log(`- Successfully migrated: ${migratedCount}`);
    console.log(`- Errors: ${errorCount}`);
    
    // Also fix any batches with missing instructor details
    console.log('\n🔍 Checking for batches with missing instructor details...');
    const batchesWithMissingDetails = await Batch.find({
      assigned_instructor: { $exists: true, $ne: null },
      $or: [
        { instructor_details: { $exists: false } },
        { 'instructor_details._id': null },
        { 'instructor_details.full_name': null }
      ]
    }).select('+instructor_details');
    
    console.log(`Found ${batchesWithMissingDetails.length} batches with missing instructor details`);
    
    for (const batch of batchesWithMissingDetails) {
      console.log(`\n--- Fixing: ${batch.batch_name} ---`);
      
      try {
        const instructor = await User.findById(batch.assigned_instructor);
        
        if (instructor) {
          const instructorDetails = {
            _id: instructor._id,
            full_name: instructor.full_name || `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim(),
            email: instructor.email,
            phone_number: instructor.phone_number || instructor.phone || null,
            assignment_date: new Date()
          };
          
          await Batch.findByIdAndUpdate(batch._id, { instructor_details: instructorDetails });
          console.log('✅ Fixed missing instructor details');
          migratedCount++;
        } else {
          console.log('❌ Instructor not found');
          errorCount++;
        }
      } catch (error) {
        console.log('❌ Error fixing batch:', error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Final Summary:`);
    console.log(`- Total batches processed: ${batchesWithOldFields.length + batchesWithMissingDetails.length}`);
    console.log(`- Successfully processed: ${migratedCount}`);
    console.log(`- Errors: ${errorCount}`);
    
    await mongoose.disconnect();
    console.log('\n✅ Migration completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

migrateInstructorDetails();
