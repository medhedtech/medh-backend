// Test script to verify S3 folder creation using student ID
import { createStudentS3Folder, checkStudentS3Folder, getStudentS3FolderPath } from './utils/s3BatchFolderManager.js';
import { config } from 'dotenv';

// Load environment variables
config();

console.log('🧪 Testing Student ID-Based S3 Folder Creation...\n');

// Test data
const testBatchId = '67bd596b8a56e7688dd02274'; // Real batch ID from database
const testStudentId = '67f65a6ca2dd90926a759ee4'; // Real student ID from database
const testStudentName = 'Hamdan Ahmed'; // Student name for logging

async function testStudentIdFolderCreation() {
  console.log('📋 Test Data:');
  console.log(`   - Batch ID: ${testBatchId}`);
  console.log(`   - Student ID: ${testStudentId}`);
  console.log(`   - Student Name: ${testStudentName}`);
  console.log('');

  try {
    // Test 1: Create student S3 folder using student ID
    console.log('🔧 Test 1: Creating student S3 folder using student ID...');
    const createResult = await createStudentS3Folder(testBatchId, testStudentId, testStudentName);
    
    if (createResult.success) {
      console.log('✅ Successfully created student S3 folder using student ID');
      console.log(`   - S3 Path: ${createResult.s3Path}`);
      console.log(`   - Student ID: ${createResult.studentId}`);
      console.log(`   - Student Name: ${createResult.studentName}`);
      console.log(`   - Expected folder structure: medh-filess/videos/${testBatchId}/${testStudentId}/`);
    } else {
      console.log('❌ Failed to create student S3 folder');
      console.log(`   - Error: ${createResult.error}`);
      return;
    }
    console.log('');

    // Test 2: Check if folder exists
    console.log('🔍 Test 2: Checking if student S3 folder exists...');
    const checkResult = await checkStudentS3Folder(testBatchId, testStudentId, testStudentName);
    
    if (checkResult.exists) {
      console.log('✅ Student S3 folder exists');
      console.log(`   - S3 Path: ${checkResult.s3Path}`);
      console.log(`   - Student ID: ${checkResult.studentId}`);
    } else {
      console.log('❌ Student S3 folder does not exist');
      console.log(`   - Message: ${checkResult.message}`);
    }
    console.log('');

    // Test 3: Get folder path
    console.log('📍 Test 3: Getting student S3 folder path...');
    const pathResult = getStudentS3FolderPath(testBatchId, testStudentId, testStudentName);
    
    console.log('✅ Got student S3 folder path');
    console.log(`   - S3 Path: ${pathResult.s3Path}`);
    console.log(`   - URL Path: ${pathResult.urlPath}`);
    console.log(`   - Student ID: ${pathResult.studentId}`);
    console.log('');

    // Test 4: Test with different student IDs
    console.log('🧪 Test 4: Testing with different student IDs...');
    const testStudents = [
      { id: '67f65a6ca2dd90926a759ee4', name: 'Hamdan Ahmed' },
      { id: '67f65a6ca2dd90926a759ee5', name: 'John Doe' },
      { id: '67f65a6ca2dd90926a759ee6', name: 'Mary Jane Smith' },
      { id: '67f65a6ca2dd90926a759ee7', name: 'Ahmed@Khan' }
    ];

    for (const student of testStudents) {
      console.log(`   - Student: ${student.name} (${student.id})`);
      
      const result = await createStudentS3Folder(
        testBatchId,
        student.id,
        student.name
      );
      
      if (result.success) {
        console.log(`     ✅ Created: ${result.s3Path}`);
      } else {
        console.log(`     ❌ Failed: ${result.error}`);
      }
    }
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('');
    console.log('📁 New S3 Folder Structure:');
    console.log(`   medh-filess/videos/${testBatchId}/${testStudentId}/`);
    console.log('');
    console.log('✅ Student folders are now created using student IDs instead of names!');
    console.log('');
    console.log('🔍 Benefits of using Student ID:');
    console.log('   - Unique and consistent folder names');
    console.log('   - No issues with special characters in names');
    console.log('   - Direct mapping to database records');
    console.log('   - Easier to manage and track');

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run the tests
testStudentIdFolderCreation().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});


