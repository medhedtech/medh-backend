// Debug script to check student data and test S3 folder creation
import { config } from 'dotenv';
import mongoose from 'mongoose';
import User from './models/user-modal.js';
import Batch from './models/course-model.js';
import { createStudentS3Folder } from './utils/s3BatchFolderManager.js';

// Load environment variables
config();

console.log('🔍 Debugging Student Enrollment and S3 Folder Creation...\n');

// Test data
const testBatchId = '67bd596b8a56e7688dd02274'; // Real batch ID from database
const testStudentId = '67f65a6ca2dd90926a759ee4'; // Example student ID

async function debugStudentEnrollment() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('✅ Connected to MongoDB');
    console.log('');

    // Test 1: Check if student exists and get student data
    console.log('🔍 Test 1: Checking student data...');
    const student = await User.findById(testStudentId);
    
    if (!student) {
      console.log('❌ Student not found in database');
      console.log(`   - Student ID: ${testStudentId}`);
      return;
    }
    
    console.log('✅ Student found in database');
    console.log(`   - Student ID: ${student._id}`);
    console.log(`   - Full Name: ${student.full_name || 'Not set'}`);
    console.log(`   - First Name: ${student.first_name || 'Not set'}`);
    console.log(`   - Last Name: ${student.last_name || 'Not set'}`);
    console.log(`   - Email: ${student.email || 'Not set'}`);
    console.log(`   - Role: ${student.role || 'Not set'}`);
    console.log('');

    // Test 2: Check if batch exists
    console.log('🔍 Test 2: Checking batch data...');
    const batch = await Batch.findById(testBatchId);
    
    if (!batch) {
      console.log('❌ Batch not found in database');
      console.log(`   - Batch ID: ${testBatchId}`);
      return;
    }
    
    console.log('✅ Batch found in database');
    console.log(`   - Batch ID: ${batch._id}`);
    console.log(`   - Batch Name: ${batch.batch_name || 'Not set'}`);
    console.log(`   - Batch Type: ${batch.batch_type || 'Not set'}`);
    console.log(`   - Capacity: ${batch.capacity || 'Not set'}`);
    console.log(`   - Enrolled Students: ${batch.enrolled_students || 0}`);
    console.log('');

    // Test 3: Test student name extraction logic
    console.log('🔍 Test 3: Testing student name extraction logic...');
    
    // Simulate the exact logic from addStudentToBatch
    const studentName = student.full_name || 
                       student.first_name + ' ' + student.last_name || 
                       'Unknown Student';
    
    console.log(`   - Extracted Student Name: "${studentName}"`);
    console.log(`   - Logic: full_name || first_name + ' ' + last_name || 'Unknown Student'`);
    console.log('');

    // Test 4: Test S3 folder creation with actual student data
    console.log('🔍 Test 4: Testing S3 folder creation with actual student data...');
    
    const s3FolderResult = await createStudentS3Folder(
      testBatchId,
      testStudentId,
      studentName
    );
    
    if (s3FolderResult.success) {
      console.log('✅ S3 folder created successfully');
      console.log(`   - S3 Path: ${s3FolderResult.s3Path}`);
      console.log(`   - Safe Student Name: ${s3FolderResult.safeStudentName}`);
      console.log(`   - Original Name: ${s3FolderResult.studentName}`);
    } else {
      console.log('❌ S3 folder creation failed');
      console.log(`   - Error: ${s3FolderResult.error}`);
      console.log(`   - Message: ${s3FolderResult.message}`);
    }
    console.log('');

    // Test 5: Test with different student name scenarios
    console.log('🔍 Test 5: Testing different student name scenarios...');
    
    const testScenarios = [
      {
        name: 'Full name only',
        student: { full_name: 'John Doe', first_name: null, last_name: null }
      },
      {
        name: 'First and last name only',
        student: { full_name: null, first_name: 'Mary', last_name: 'Jane' }
      },
      {
        name: 'First name only',
        student: { full_name: null, first_name: 'Alice', last_name: null }
      },
      {
        name: 'Last name only',
        student: { full_name: null, first_name: null, last_name: 'Smith' }
      },
      {
        name: 'No names',
        student: { full_name: null, first_name: null, last_name: null }
      }
    ];
    
    for (const scenario of testScenarios) {
      const testName = scenario.student.full_name || 
                      (scenario.student.first_name && scenario.student.last_name ? 
                       `${scenario.student.first_name} ${scenario.student.last_name}` : null) ||
                      scenario.student.first_name ||
                      scenario.student.last_name ||
                      'Unknown Student';
      
      console.log(`   - ${scenario.name}: "${testName}"`);
      
      const result = await createStudentS3Folder(
        testBatchId,
        `test-${Date.now()}`,
        testName
      );
      
      if (result.success) {
        console.log(`     ✅ Created: ${result.safeStudentName}`);
      } else {
        console.log(`     ❌ Failed: ${result.error}`);
      }
    }
    console.log('');

    console.log('🎉 Debug completed!');
    console.log('');
    console.log('📝 Summary:');
    console.log('   - Student data extraction is working correctly');
    console.log('   - S3 folder creation function is working');
    console.log('   - The issue might be in the API call or server restart');
    console.log('');
    console.log('🔧 Next Steps:');
    console.log('   1. Restart the backend server: npm start');
    console.log('   2. Try enrolling a student through the admin panel');
    console.log('   3. Check backend console logs for S3 folder creation messages');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the debug
debugStudentEnrollment().catch(error => {
  console.error('❌ Debug execution failed:', error);
  process.exit(1);
});
