import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from '../models/student-model.js';
import Instructor from '../models/instructor-model.js';
import User from '../models/user-modal.js';

// Load environment variables
dotenv.config();

async function testCollections() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/medh';
    console.log('🔍 Connecting to MongoDB:', mongoUri);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Test Student collection
    console.log('\n📚 Testing Student Collection...');
    const studentCount = await Student.countDocuments();
    console.log(`📊 Total students in Student collection: ${studentCount}`);
    
    if (studentCount > 0) {
      const sampleStudents = await Student.find().select('_id full_name email').limit(5);
      console.log('📝 Sample students:');
      sampleStudents.forEach(student => {
        console.log(`  - ${student.full_name} (${student.email}) - ID: ${student._id}`);
      });
    } else {
      console.log('❌ No students found in Student collection');
    }

    // Test Instructor collection
    console.log('\n👨‍🏫 Testing Instructor Collection...');
    const instructorCount = await Instructor.countDocuments();
    console.log(`📊 Total instructors in Instructor collection: ${instructorCount}`);
    
    if (instructorCount > 0) {
      const sampleInstructors = await Instructor.find().select('_id full_name email').limit(5);
      console.log('📝 Sample instructors:');
      sampleInstructors.forEach(instructor => {
        console.log(`  - ${instructor.full_name} (${instructor.email}) - ID: ${instructor._id}`);
      });
    } else {
      console.log('❌ No instructors found in Instructor collection');
    }

    // Test User collection for students
    console.log('\n👤 Testing User Collection for Students...');
    const userStudentCount = await User.countDocuments({ role: 'student' });
    console.log(`📊 Total students in User collection: ${userStudentCount}`);
    
    if (userStudentCount > 0) {
      const sampleUserStudents = await User.find({ role: 'student' }).select('_id full_name email').limit(5);
      console.log('📝 Sample user students:');
      sampleUserStudents.forEach(student => {
        console.log(`  - ${student.full_name} (${student.email}) - ID: ${student._id}`);
      });
    } else {
      console.log('❌ No students found in User collection');
    }

    // Test User collection for instructors
    console.log('\n👨‍🏫 Testing User Collection for Instructors...');
    const userInstructorCount = await User.countDocuments({ role: 'instructor' });
    console.log(`📊 Total instructors in User collection: ${userInstructorCount}`);
    
    if (userInstructorCount > 0) {
      const sampleUserInstructors = await User.find({ role: 'instructor' }).select('_id full_name email').limit(5);
      console.log('📝 Sample user instructors:');
      sampleUserInstructors.forEach(instructor => {
        console.log(`  - ${instructor.full_name} (${instructor.email}) - ID: ${instructor._id}`);
      });
    } else {
      console.log('❌ No instructors found in User collection');
    }

    // Test all roles in User collection
    console.log('\n🔍 Testing All Roles in User Collection...');
    const roleCounts = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('📊 Role distribution in User collection:');
    roleCounts.forEach(role => {
      console.log(`  - ${role._id || 'No role'}: ${role.count}`);
    });

  } catch (error) {
    console.error('❌ Error testing collections:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testCollections();
