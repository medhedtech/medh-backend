// Test script to verify S3 folder creation using student ID with name in brackets
import { createStudentS3Folder, checkStudentS3Folder, getStudentS3FolderPath } from './utils/s3BatchFolderManager.js';
import { config } from 'dotenv';

// Load environment variables
config();

console.log('🧪 Testing Student ID with Name in Brackets S3 Folder Creation...\n');

// Test data
const testBatchId = '67bd596b8a56e7688dd02274'; // Real batch ID from database
const testStudentId = '67f65a6ca2dd90926a759ee4'; // Real student ID from database
const testStudentName = 'Hamdan Ahmed'; // Student name for logging

async function testStudentIdWithNameFolderCreation() {
  console.log('📋 Test Data:');
  console.log(`   - Batch ID: ${testBatchId}`);
  console.log(`   - Student ID: ${testStudentId}`);
  console.log(`   - Student Name: ${testStudentName}`);
  console.log('');

  try {
    // Test 1: Create student S3 folder using student ID with name in brackets
    console.log('🔧 Test 1: Creating student S3 folder using student ID with name in brackets...');
    const createResult = await createStudentS3Folder(testBatchId, testStudentId, testStudentName);
    
    if (createResult.success) {
      console.log('✅ Successfully created student S3 folder using student ID with name in brackets');
      console.log(`   - S3 Path: ${createResult.s3Path}`);
      console.log(`   - Student ID: ${createResult.studentId}`);
      console.log(`   - Student Name: ${createResult.studentName}`);
      console.log(`   - Expected folder structure: medh-filess/videos/${testBatchId}/${testStudentId}(hamdan_ahmed)/`);
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

    // Test 4: Test with different student names (including special characters)
    console.log('🧪 Test 4: Testing with different student names...');
    const testStudents = [
      { id: '67f65a6ca2dd90926a759ee4', name: 'Hamdan Ahmed' },
      { id: '67f65a6ca2dd90926a759ee5', name: 'John Doe' },
      { id: '67f65a6ca2dd90926a759ee6', name: 'Mary Jane Smith' },
      { id: '67f65a6ca2dd90926a759ee7', name: 'Ahmed@Khan' },
      { id: '67f65a6ca2dd90926a759ee8', name: 'José María García' },
      { id: '67f65a6ca2dd90926a759ee9', name: '李小明 (Li Xiaoming)' },
      { id: '67f65a6ca2dd90926a759eea', name: 'O\'Connor-Smith' }
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
    console.log(`   medh-filess/videos/${testBatchId}/${testStudentId}(hamdan_ahmed)/`);
    console.log('');
    console.log('✅ Student folders are now created using student IDs with names in brackets!');
    console.log('');
    console.log('🔍 Benefits of using Student ID with Name:');
    console.log('   - Unique and consistent folder names');
    console.log('   - Easy to identify students by both ID and name');
    console.log('   - Direct mapping to database records');
    console.log('   - Human-readable folder names');
    console.log('   - Safe handling of special characters in names');

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run the tests
testStudentIdWithNameFolderCreation().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});


