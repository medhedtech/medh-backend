import mongoose from 'mongoose';
import Course from './models/course-model.js';
import User from './models/user-modal.js';

async function fixAllBatchesComprehensive() {
  try {
    await mongoose.connect('mongodb://localhost:27017/campus');
    console.log('Connected to MongoDB');
    
    // Get the Batch model
    const { Batch } = await import('./models/course-model.js');
    
    // Find ALL batches in the database
    const allBatches = await Batch.find({}).select('+instructor_details');
    console.log(`Found ${allBatches.length} total batches in database`);
    
    let batchesWithInstructors = 0;
    let batchesFixed = 0;
    let batchesWithIssues = 0;
    
    for (const batch of allBatches) {
      console.log(`\n--- Processing: ${batch.batch_name || 'Unnamed Batch'} ---`);
      console.log('Batch ID:', batch._id);
      console.log('Assigned Instructor ID:', batch.assigned_instructor);
      
      if (batch.assigned_instructor) {
        batchesWithInstructors++;
        
        // Check if instructor exists in database
        const instructor = await User.findById(batch.assigned_instructor);
        
        if (instructor) {
          console.log('✅ Instructor found:', instructor.full_name || instructor.first_name);
          
          // Check if instructor details need fixing
          const needsFixing = !batch.instructor_details || 
                            !batch.instructor_details._id || 
                            !batch.instructor_details.full_name ||
                            batch.instructor_details.instructor_id || // old field name
                            batch.instructor_details.instructor_name; // old field name
          
          if (needsFixing) {
            console.log('🛠️ Fixing instructor details...');
            
            const instructorDetails = {
              _id: instructor._id,
              full_name: instructor.full_name || `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim(),
              email: instructor.email,
              phone_number: instructor.phone_number || instructor.phone || null,
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
            batchesFixed++;
            
          } else {
            console.log('✅ Instructor details already correct');
          }
          
        } else {
          console.log('❌ Instructor not found in database');
          batchesWithIssues++;
        }
        
      } else {
        console.log('ℹ️ No assigned instructor');
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`- Total batches: ${allBatches.length}`);
    console.log(`- Batches with instructors: ${batchesWithInstructors}`);
    console.log(`- Batches fixed: ${batchesFixed}`);
    console.log(`- Batches with issues: ${batchesWithIssues}`);
    
    // Final verification
    console.log('\n🔍 Final verification of all batches...');
    const finalBatches = await Batch.find({
      assigned_instructor: { $exists: true, $ne: null }
    }).select('+instructor_details');
    
    let correctCount = 0;
    for (const batch of finalBatches) {
      const hasCorrectDetails = batch.instructor_details && 
                              batch.instructor_details._id && 
                              batch.instructor_details.full_name &&
                              batch.instructor_details.email;
      
      if (hasCorrectDetails) {
        correctCount++;
        console.log(`✅ ${batch.batch_name}: Correct instructor details`);
        console.log(`   - ID: ${batch.instructor_details._id}`);
        console.log(`   - Name: ${batch.instructor_details.full_name}`);
        console.log(`   - Email: ${batch.instructor_details.email}`);
      } else {
        console.log(`❌ ${batch.batch_name}: Missing or incorrect instructor details`);
      }
    }
    
    console.log(`\n✅ Final verification: ${correctCount}/${finalBatches.length} batches have correct instructor details`);
    
    await mongoose.disconnect();
    console.log('\n✅ Comprehensive fix completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixAllBatchesComprehensive();
