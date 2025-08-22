// Quick script to check if there's data in the database
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Import models
import Student from './models/student-model.js';
import Instructor from './models/instructor-model.js';
import User from './models/user-modal.js';
import { Batch } from './models/course-model.js';

async function checkDatabaseData() {
  try {
    console.log('🔍 Checking database data...\n');
    
    // Connect to MongoDB
    const mongoUrl = process.env.MONGODB_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017/medh';
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB\n');
    
    // Check Students
    console.log('📚 STUDENTS:');
    const studentCount = await Student.countDocuments();
    console.log(`   Total students: ${studentCount}`);
    
    if (studentCount > 0) {
      const sampleStudents = await Student.find().limit(3).select('full_name email');
      console.log('   Sample students:');
      sampleStudents.forEach(student => {
        console.log(`     - ${student.full_name} (${student.email})`);
      });
    }
    
    // Check Users with student role
    const userStudentCount = await User.countDocuments({ role: 'student' });
    console.log(`   Student users: ${userStudentCount}`);
    
    if (userStudentCount > 0) {
      const sampleUserStudents = await User.find({ role: 'student' }).limit(3).select('full_name email');
      console.log('   Sample student users:');
      sampleUserStudents.forEach(user => {
        console.log(`     - ${user.full_name} (${user.email})`);
      });
    }
    console.log('');
    
    // Check Instructors
    console.log('👨‍🏫 INSTRUCTORS:');
    const instructorCount = await Instructor.countDocuments();
    console.log(`   Total instructors: ${instructorCount}`);
    
    if (instructorCount > 0) {
      const sampleInstructors = await Instructor.find().limit(3).select('full_name email domain');
      console.log('   Sample instructors:');
      sampleInstructors.forEach(instructor => {
        console.log(`     - ${instructor.full_name} (${instructor.email}) - ${instructor.domain || 'No domain'}`);
      });
    }
    
    // Check Users with instructor role
    const userInstructorCount = await User.countDocuments({ role: 'instructor' });
    console.log(`   Instructor users: ${userInstructorCount}`);
    
    if (userInstructorCount > 0) {
      const sampleUserInstructors = await User.find({ role: 'instructor' }).limit(3).select('full_name email');
      console.log('   Sample instructor users:');
      sampleUserInstructors.forEach(user => {
        console.log(`     - ${user.full_name} (${user.email})`);
      });
    }
    console.log('');
    
    // Check Batches
    console.log('📦 BATCHES:');
    const batchCount = await Batch.countDocuments();
    console.log(`   Total batches: ${batchCount}`);
    
    if (batchCount > 0) {
      const sampleBatches = await Batch.find().limit(3).select('batch_name batch_type status');
      console.log('   Sample batches:');
      sampleBatches.forEach(batch => {
        console.log(`     - ${batch.batch_name} (${batch.batch_type || 'No type'}) - ${batch.status || 'No status'}`);
      });
    }
    console.log('');
    
    // Summary
    console.log('📊 SUMMARY:');
    console.log(`   Students: ${studentCount} (Student collection) + ${userStudentCount} (User collection)`);
    console.log(`   Instructors: ${instructorCount} (Instructor collection) + ${userInstructorCount} (User collection)`);
    console.log(`   Batches: ${batchCount}`);
    
    if (studentCount === 0 && userStudentCount === 0) {
      console.log('\n⚠️  No students found! Run: node add-sample-students.js');
    }
    
    if (instructorCount === 0 && userInstructorCount === 0) {
      console.log('\n⚠️  No instructors found! Run: node add-sample-instructors.js');
    }
    
    if (batchCount === 0) {
      console.log('\n⚠️  No batches found! You may need to create some batches.');
    }
    
    console.log('\n✅ Database check completed');
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkDatabaseData();










