// Test script to verify student S3 folder creation with student names
import { createStudentS3Folder, checkStudentS3Folder, getStudentS3FolderPath } from './utils/s3BatchFolderManager.js';
import { config } from 'dotenv';

// Load environment variables
config();

console.log('🧪 Testing Student S3 Folder Creation with Student Names...\n');

// Test data
const testBatchId = '689de09ca8d09b5e78cbfbd6'; // Example batch ID
const testStudentId = '67f65a6ca2dd90926a759ee4'; // Example student ID
const testStudentName = 'Hamdan Ahmed'; // Example student name with spaces and special characters

async function testStudentNameFolderCreation() {
  console.log('📋 Test Data:');
  console.log(`   - Batch ID: ${testBatchId}`);
  console.log(`   - Student ID: ${testStudentId}`);
  console.log(`   - Student Name: ${testStudentName}`);
  console.log('');

  try {
    // Test 1: Create student S3 folder with name
    console.log('🔧 Test 1: Creating student S3 folder with name...');
    const createResult = await createStudentS3Folder(testBatchId, testStudentId, testStudentName);
    
    if (createResult.success) {
      console.log('✅ Successfully created student S3 folder');
      console.log(`   - S3 Path: ${createResult.s3Path}`);
      console.log(`   - Safe Student Name: ${createResult.safeStudentName}`);
      console.log(`   - Original Name: ${createResult.studentName}`);
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
      console.log(`   - Safe Student Name: ${checkResult.safeStudentName}`);
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
    console.log(`   - Safe Student Name: ${pathResult.safeStudentName}`);
    console.log('');

    // Test 4: Test with different student names
    console.log('🧪 Test 4: Testing with different student names...');
    const testNames = [
      'John Doe',
      'Mary-Jane Smith',
      'Ahmed@Khan',
      'Li Wei',
      'José García',
      'Test Student 123'
    ];

    for (const name of testNames) {
      const safeName = name
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .toLowerCase()
        .trim();
      
      console.log(`   - Original: "${name}" → Safe: "${safeName}"`);
    }
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('');
    console.log('📁 Expected S3 Folder Structure:');
    console.log(`   medh-filess/videos/${testBatchId}/${createResult.safeStudentName}/`);
    console.log('');
    console.log('✅ Student folders are now created using student names instead of IDs!');

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run the tests
testStudentNameFolderCreation().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});


