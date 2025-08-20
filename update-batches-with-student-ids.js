import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Batch } from './models/course-model.js';
import Enrollment from './models/enrollment-model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/MedhDB';

async function updateBatchesWithStudentIds() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Models are already imported

    console.log('\n📋 Step 1: Getting all batches...');
    const batches = await Batch.find({});
    console.log(`Found ${batches.length} batches`);

    console.log('\n📋 Step 2: Getting all enrollments...');
    const enrollments = await Enrollment.find({}).populate('batch', '_id batch_name');
    console.log(`Found ${enrollments.length} enrollments`);

    // Group enrollments by batch
    const batchEnrollments = {};
    enrollments.forEach(enrollment => {
      if (enrollment.batch) {
        const batchId = enrollment.batch._id.toString();
        if (!batchEnrollments[batchId]) {
          batchEnrollments[batchId] = [];
        }
        batchEnrollments[batchId].push(enrollment.student);
      }
    });

    console.log('\n📋 Step 3: Updating batches with enrolled student IDs...');
    let updatedCount = 0;
    let skippedCount = 0;

    for (const batch of batches) {
      const batchId = batch._id.toString();
      const enrolledStudentIds = batchEnrollments[batchId] || [];

      if (enrolledStudentIds.length > 0) {
        // Update batch with enrolled student IDs
        await Batch.findByIdAndUpdate(batch._id, {
          enrolled_student_ids: enrolledStudentIds,
          enrolled_students: enrolledStudentIds.length
        });

        console.log(`✅ Updated batch: ${batch.batch_name} (${batch.batch_code})`);
        console.log(`   - Enrolled students: ${enrolledStudentIds.length}`);
        console.log(`   - Student IDs: ${enrolledStudentIds.slice(0, 3).join(', ')}${enrolledStudentIds.length > 3 ? '...' : ''}`);
        updatedCount++;
      } else {
        console.log(`⚠️ No enrollments found for batch: ${batch.batch_name} (${batch.batch_code})`);
        skippedCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Updated batches: ${updatedCount}`);
    console.log(`⚠️ Skipped batches (no enrollments): ${skippedCount}`);
    console.log(`📋 Total batches processed: ${batches.length}`);

    // Verify the updates
    console.log('\n📋 Step 4: Verifying updates...');
    const updatedBatches = await Batch.find({ enrolled_student_ids: { $exists: true, $ne: [] } });
    console.log(`Batches with enrolled students: ${updatedBatches.length}`);

    if (updatedBatches.length > 0) {
      console.log('\nSample updated batches:');
      updatedBatches.slice(0, 3).forEach((batch, index) => {
        console.log(`\n${index + 1}. ${batch.batch_name} (${batch.batch_code})`);
        console.log(`   - Enrolled students: ${batch.enrolled_students}`);
        console.log(`   - Student IDs count: ${batch.enrolled_student_ids.length}`);
      });
    }

    console.log('\n🎉 Batch update completed successfully!');

  } catch (error) {
    console.error('❌ Error updating batches:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
updateBatchesWithStudentIds();
