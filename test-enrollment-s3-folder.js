// Test script to verify S3 folder creation during actual enrollment
import { config } from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
config();

console.log('🧪 Testing S3 Folder Creation During Enrollment...\n');

// Test data
const testBatchId = '689de09ca8d09b5e78cbfbd6'; // Example batch ID
const testStudentId = '67f65a6ca2dd90926a759ee4'; // Example student ID

async function testEnrollmentS3Folder() {
  console.log('📋 Test Data:');
  console.log(`   - Batch ID: ${testBatchId}`);
  console.log(`   - Student ID: ${testStudentId}`);
  console.log('');

  try {
    // Test 1: Simulate the enrollment process
    console.log('🔧 Test 1: Simulating enrollment process...');
    
    // Import the function directly
    const { createStudentS3Folder } = await import('./utils/s3BatchFolderManager.js');
    
    // Simulate student data (as it would come from database)
    const studentData = {
      full_name: 'Test Student',
      first_name: 'Test',
      last_name: 'Student',
      email: 'test@example.com'
    };
    
    // Simulate the logic from addStudentToBatch
    const studentName = studentData.full_name || 
                       studentData.first_name + ' ' + studentData.last_name || 
                       'Unknown Student';
    
    console.log(`   - Student Name: ${studentName}`);
    
    // Create S3 folder
    const s3FolderResult = await createStudentS3Folder(
      testBatchId,
      testStudentId,
      studentName
    );
    
    if (s3FolderResult.success) {
      console.log('✅ S3 folder created successfully during enrollment simulation');
      console.log(`   - S3 Path: ${s3FolderResult.s3Path}`);
      console.log(`   - Safe Student Name: ${s3FolderResult.safeStudentName}`);
    } else {
      console.log('❌ Failed to create S3 folder during enrollment simulation');
      console.log(`   - Error: ${s3FolderResult.error}`);
    }
    console.log('');

    // Test 2: Test with different student name formats
    console.log('🧪 Test 2: Testing different student name formats...');
    
    const testStudents = [
      { full_name: 'John Doe', first_name: 'John', last_name: 'Doe' },
      { full_name: null, first_name: 'Mary', last_name: 'Jane' },
      { full_name: null, first_name: null, last_name: 'Smith' },
      { full_name: null, first_name: null, last_name: null }
    ];
    
    for (let i = 0; i < testStudents.length; i++) {
      const student = testStudents[i];
      const name = student.full_name || 
                   (student.first_name && student.last_name ? `${student.first_name} ${student.last_name}` : null) ||
                   student.first_name ||
                   student.last_name ||
                   'Unknown Student';
      
      console.log(`   - Test ${i + 1}: "${name}"`);
      
      const result = await createStudentS3Folder(
        testBatchId,
        `test-student-${i}`,
        name
      );
      
      if (result.success) {
        console.log(`     ✅ Created: ${result.safeStudentName}`);
      } else {
        console.log(`     ❌ Failed: ${result.error}`);
      }
    }
    console.log('');

    console.log('🎉 Enrollment S3 folder creation tests completed!');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   1. Check if backend server is running');
    console.log('   2. Try enrolling a student through the admin panel');
    console.log('   3. Check backend logs for S3 folder creation messages');
    console.log('   4. Verify S3 bucket for the created folders');

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run the tests
testEnrollmentS3Folder().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});


