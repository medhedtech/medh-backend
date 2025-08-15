import mongoose from 'mongoose';
import Course from './models/course-model.js';
import User from './models/user-modal.js';

async function fixSpecificBatch() {
  try {
    await mongoose.connect('mongodb://localhost:27017/campus');
    console.log('Connected to MongoDB');
    
    // Get the Batch model
    const { Batch } = await import('./models/course-model.js');
    
    // Find the specific batch from the image
    const specificBatchId = '689cb788b402a3aaed5c9799';
    const batch = await Batch.findById(specificBatchId).select('+instructor_details');
    
    if (!batch) {
      console.log('❌ Specific batch not found');
      return;
    }
    
    console.log('📋 Found the specific batch:');
    console.log('Batch ID:', batch._id);
    console.log('Batch Name:', batch.batch_name);
    console.log('Assigned Instructor ID:', batch.assigned_instructor);
    console.log('Current Instructor Details:', JSON.stringify(batch.instructor_details, null, 2));
    
    // Check if instructor exists in the database
    if (batch.assigned_instructor) {
      console.log('\n🔍 Looking for instructor in database...');
      const instructor = await User.findById(batch.assigned_instructor);
      
      if (instructor) {
        console.log('✅ Instructor found in database:');
        console.log('Instructor ID:', instructor._id);
        console.log('Full Name:', instructor.full_name);
        console.log('First Name:', instructor.first_name);
        console.log('Last Name:', instructor.last_name);
        console.log('Email:', instructor.email);
        console.log('Phone:', instructor.phone_number);
        console.log('Role:', instructor.role);
        
        // Fix the instructor details with correct field names
        console.log('\n🛠️ Fixing instructor details...');
        const instructorDetails = {
          _id: instructor._id,
          full_name: instructor.full_name || `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim(),
          email: instructor.email,
          phone_number: instructor.phone_number || instructor.phone || null,
          assignment_date: new Date()
        };
        
        console.log('New instructor details:', JSON.stringify(instructorDetails, null, 2));
        
        // Update the batch
        const updatedBatch = await Batch.findByIdAndUpdate(
          batch._id,
          { instructor_details: instructorDetails },
          { new: true }
        ).select('+instructor_details');
        
        console.log('\n✅ Batch updated successfully!');
        console.log('Updated instructor details:', JSON.stringify(updatedBatch.instructor_details, null, 2));
        
      } else {
        console.log('❌ Instructor not found in database');
      }
    } else {
      console.log('❌ No assigned instructor for this batch');
    }
    
    // Also fix any other batches with old field names
    console.log('\n🔍 Checking for other batches with old field names...');
    const batchesWithOldFields = await Batch.find({
      $or: [
        { 'instructor_details.instructor_id': { $exists: true } },
        { 'instructor_details.instructor_name': { $exists: true } },
        { 'instructor_details.instructor_email': { $exists: true } },
        { 'instructor_details.instructor_phone': { $exists: true } }
      ]
    }).select('+instructor_details');
    
    console.log(`Found ${batchesWithOldFields.length} batches with old field names`);
    
    let fixedCount = 0;
    for (const oldBatch of batchesWithOldFields) {
      if (oldBatch._id.toString() === specificBatchId) {
        continue; // Already fixed above
      }
      
      console.log(`\n--- Fixing batch: ${oldBatch.batch_name} ---`);
      
      if (oldBatch.assigned_instructor) {
        const instructor = await User.findById(oldBatch.assigned_instructor);
        
        if (instructor) {
          const instructorDetails = {
            _id: instructor._id,
            full_name: instructor.full_name || `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim(),
            email: instructor.email,
            phone_number: instructor.phone_number || instructor.phone || null,
            assignment_date: new Date()
          };
          
          await Batch.findByIdAndUpdate(oldBatch._id, { instructor_details: instructorDetails });
          console.log('✅ Fixed');
          fixedCount++;
        } else {
          console.log('❌ Instructor not found');
        }
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`- Specific batch: Fixed`);
    console.log(`- Other batches fixed: ${fixedCount}`);
    
    // Verify all batches now have correct instructor details
    console.log('\n🔍 Verifying all batches have correct instructor details...');
    const allBatchesWithInstructors = await Batch.find({
      assigned_instructor: { $exists: true, $ne: null }
    }).select('+instructor_details');
    
    for (const batch of allBatchesWithInstructors) {
      const hasCorrectFields = batch.instructor_details && 
                              batch.instructor_details._id && 
                              batch.instructor_details.full_name &&
                              batch.instructor_details.email;
      
      console.log(`Batch ${batch.batch_name}: ${hasCorrectFields ? '✅' : '❌'} correct instructor details`);
      
      if (hasCorrectFields) {
        console.log(`  - ID: ${batch.instructor_details._id}`);
        console.log(`  - Name: ${batch.instructor_details.full_name}`);
        console.log(`  - Email: ${batch.instructor_details.email}`);
      }
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Fix completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixSpecificBatch();
