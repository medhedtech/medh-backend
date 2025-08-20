import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Batch } from './models/course-model.js';
import Enrollment from './models/enrollment-model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/MedhDB';

async function createTestEnrollments() {
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

    // Create test student IDs (these should be real student IDs from your database)
    const testStudentIds = [
      '685e4a98fc2c157621117755',
      '685e4a98fc2c157621117756', 
      '685e4a98fc2c157621117757'
    ];

    console.log('\n📋 Creating test enrollments...');
    let createdCount = 0;

    // Create enrollments for each batch
    for (const batch of batches) {
      for (const studentId of testStudentIds) {
        try {
          // Check if enrollment already exists
          const existingEnrollment = await Enrollment.findOne({
            student: studentId,
            batch: batch._id
          });

          if (!existingEnrollment) {
            // Create new enrollment
            const enrollment = new Enrollment({
              student: studentId,
              batch: batch._id,
              enrollment_date: new Date(),
              status: 'active',
              payment_status: 'paid',
              course: batch.course || '507f1f77bcf86cd799439011' // Default course ID
            });

            await enrollment.save();
            console.log(`✅ Created enrollment: Student ${studentId} -> Batch ${batch.batch_name}`);
            createdCount++;
          } else {
            console.log(`⚠️ Enrollment already exists: Student ${studentId} -> Batch ${batch.batch_name}`);
          }
        } catch (error) {
          console.error(`❌ Error creating enrollment for student ${studentId} in batch ${batch.batch_name}:`, error.message);
        }
      }
    }

    console.log(`\n📊 Summary: Created ${createdCount} new enrollments`);

    // Now update batches with enrolled student IDs
    console.log('\n📋 Updating batches with enrolled student IDs...');
    await updateBatchesWithStudentIds();

  } catch (error) {
    console.error('❌ Error creating test enrollments:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

async function updateBatchesWithStudentIds() {
  try {
    const batches = await Batch.find({});
    const enrollments = await Enrollment.find({}).populate('batch', '_id batch_name');

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

    let updatedCount = 0;
    for (const batch of batches) {
      const batchId = batch._id.toString();
      const enrolledStudentIds = batchEnrollments[batchId] || [];

      if (enrolledStudentIds.length > 0) {
        await Batch.findByIdAndUpdate(batch._id, {
          enrolled_student_ids: enrolledStudentIds,
          enrolled_students: enrolledStudentIds.length
        });

        console.log(`✅ Updated batch: ${batch.batch_name} (${batch.batch_code})`);
        console.log(`   - Enrolled students: ${enrolledStudentIds.length}`);
        updatedCount++;
      }
    }

    console.log(`\n📊 Updated ${updatedCount} batches with enrolled student IDs`);

  } catch (error) {
    console.error('❌ Error updating batches:', error);
  }
}

// Run the script
createTestEnrollments();

