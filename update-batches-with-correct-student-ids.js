import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Batch } from './models/course-model.js';
import Student from './models/student-model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/MedhDB';

async function updateBatchesWithCorrectStudentIds() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all students from Student collection
    console.log('📋 Getting all students from Student collection...');
    const students = await Student.find({}).select('_id full_name email');
    console.log(`📚 Found ${students.length} students in Student collection`);

    if (students.length === 0) {
      console.log('❌ No students found in Student collection');
      return;
    }

    // Show students
    console.log('\n📋 Students in Student collection:');
    students.forEach((student, index) => {
      console.log(`   ${index + 1}. ${student.full_name} (${student._id})`);
    });

    // Get student IDs
    const studentIds = students.map(student => student._id.toString());
    console.log('\n📋 Student IDs to add to batches:', studentIds);

    // Get all batches
    console.log('\n📋 Getting all batches...');
    const batches = await Batch.find({});
    console.log(`📚 Found ${batches.length} batches`);

    if (batches.length === 0) {
      console.log('❌ No batches found');
      return;
    }

    // Update each batch with the correct student IDs
    console.log('\n📋 Updating batches with correct student IDs...');
    let updatedCount = 0;

    for (const batch of batches) {
      try {
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

    console.log('\n🎉 Batches updated with correct student IDs successfully!');

  } catch (error) {
    console.error('❌ Error updating batches:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

updateBatchesWithCorrectStudentIds();

