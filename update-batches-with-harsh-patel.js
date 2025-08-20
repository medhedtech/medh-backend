import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Batch } from './models/course-model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/MedhDB';

async function updateBatchesWithHarshPatel() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Harsh Patel's actual student ID from the API response
    const harshPatelId = '67bd77548a56e7688dd02c30';
    console.log('📋 Using Harsh Patel ID:', harshPatelId);

    // Get all batches
    console.log('\n📋 Getting all batches...');
    const batches = await Batch.find({});
    console.log(`📚 Found ${batches.length} batches`);

    if (batches.length === 0) {
      console.log('❌ No batches found');
      return;
    }

    // Update each batch with Harsh Patel's ID
    console.log('\n📋 Updating batches with Harsh Patel ID...');
    let updatedCount = 0;

    for (const batch of batches) {
      try {
        // Add Harsh Patel to existing student IDs or create new array
        const existingStudentIds = batch.enrolled_student_ids || [];
        const updatedStudentIds = [...new Set([...existingStudentIds, harshPatelId])];
        
        await Batch.findByIdAndUpdate(batch._id, {
          enrolled_student_ids: updatedStudentIds,
          enrolled_students: updatedStudentIds.length
        });

        console.log(`✅ Updated batch: ${batch.batch_name} (${batch.batch_code})`);
        console.log(`   - Added Harsh Patel (${harshPatelId})`);
        console.log(`   - Total students: ${updatedStudentIds.length}`);
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

    console.log('\n🎉 Batches updated with Harsh Patel successfully!');

  } catch (error) {
    console.error('❌ Error updating batches:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

updateBatchesWithHarshPatel();

