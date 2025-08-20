import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Batch } from './models/course-model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/MedhDB';

async function addStudentsToBatches() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get existing batches
    const batches = await Batch.find({});
    console.log(`📚 Found ${batches.length} batches`);

    if (batches.length === 0) {
      console.log('❌ No batches found. Please create batches first.');
      return;
    }

    // Student IDs to add to batches (replace with real student IDs from your database)
    const studentIds = [
      '685e4a98fc2c157621117755',
      '685e4a98fc2c157621117756', 
      '685e4a98fc2c157621117757'
    ];

    console.log('\n📋 Adding students to batches...');
    console.log('Student IDs:', studentIds);

    let updatedCount = 0;

    // Add students to each batch
    for (const batch of batches) {
      try {
        // Update batch with student IDs
        await Batch.findByIdAndUpdate(batch._id, {
          enrolled_student_ids: studentIds,
          enrolled_students: studentIds.length
        });

        console.log(`✅ Updated batch: ${batch.batch_name} (${batch.batch_code})`);
        console.log(`   - Added ${studentIds.length} students`);
        console.log(`   - Student IDs: ${studentIds.join(', ')}`);
        updatedCount++;

      } catch (error) {
        console.error(`❌ Error updating batch ${batch.batch_name}:`, error.message);
      }
    }

    console.log(`\n📊 Summary: Updated ${updatedCount} batches`);

    // Verify the updates
    console.log('\n📋 Verifying updates...');
    const updatedBatches = await Batch.find({}).select('_id batch_name batch_code enrolled_students enrolled_student_ids');
    
    updatedBatches.forEach((batch, index) => {
      console.log(`\n${index + 1}. ${batch.batch_name} (${batch.batch_code})`);
      console.log(`   - Enrolled students: ${batch.enrolled_students}`);
      console.log(`   - Student IDs count: ${batch.enrolled_student_ids?.length || 0}`);
      if (batch.enrolled_student_ids && batch.enrolled_student_ids.length > 0) {
        console.log(`   - Student IDs: ${batch.enrolled_student_ids.join(', ')}`);
      }
    });

    console.log('\n🎉 Students added to batches successfully!');

  } catch (error) {
    console.error('❌ Error adding students to batches:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
addStudentsToBatches();

