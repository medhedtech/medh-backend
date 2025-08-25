import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:8080/api/v1';

async function testCompleteStudentBatchUpload() {
  console.log('🧪 Testing Complete Student-Batch Video Upload Flow');
  console.log('================================================');
  
  try {
    // Create a test file
    const testFilePath = path.join(process.cwd(), 'test-video.mp4');
    const testContent = 'Mock video content for student-batch testing';
    fs.writeFileSync(testFilePath, testContent);
    
    console.log('📁 Created test file:', testFilePath);
    
    // Create FormData
    const formData = new FormData();
    formData.append('videos', fs.createReadStream(testFilePath), {
      filename: 'test-video.mp4',
      contentType: 'video/mp4'
    });
    
    // Add sample student IDs (replace with real student IDs from your database)
    const sampleStudentIds = [
      '689ba08c5eba793ac7f42a4e', // Alice Johnson
      '689ba08c5eba793ac7f42a51'  // Bob Smith
    ];
    formData.append('studentIds', JSON.stringify(sampleStudentIds));
    
    // Add a sample batch ID (optional - will be auto-detected from enrollments)
    const sampleBatchId = '507f1f77bcf86cd799439011'; // Sample MongoDB ObjectId
    formData.append('batchId', sampleBatchId);
    
    console.log('👥 Using student IDs:', sampleStudentIds);
    console.log('📦 Using batch ID:', sampleBatchId);
    console.log('📤 Sending upload request...');
    
    const response = await fetch(`${BASE_URL}/live-classes/upload-videos`, {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders()
      }
    });
    
    console.log('📡 Response Status:', response.status);
    console.log('📡 Response OK:', response.ok);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Upload successful!');
      console.log('📋 Response data:', JSON.stringify(data, null, 2));
      
      // Check student-batch mapping
      if (data.data && data.data.studentBatchMapping) {
        console.log('✅ Student-Batch Mapping found:');
        console.log('🗺️ Mapping:', JSON.stringify(data.data.studentBatchMapping, null, 2));
        
        const studentCount = Object.keys(data.data.studentBatchMapping).length;
        console.log(`📊 ${studentCount} student(s) found in batches`);
      }
      
      // Check uploaded videos
      if (data.data && data.data.videos && data.data.videos.length > 0) {
        console.log('✅ Uploaded videos:');
        data.data.videos.forEach((video, index) => {
          console.log(`📹 Video ${index + 1}:`);
          console.log(`   - Name: ${video.name}`);
          console.log(`   - Student ID: ${video.studentId}`);
          console.log(`   - Batch Name: ${video.batchName || 'No batch'}`);
          console.log(`   - S3 Path: ${video.s3Path}`);
          console.log(`   - URL: ${video.url}`);
        });
      }
      
      // Check S3 folder structure
      if (data.data && data.data.videos && data.data.videos.length > 0) {
        const video = data.data.videos[0];
        if (video.s3Path) {
          console.log('📁 S3 Folder Structure:');
          if (video.s3Path.includes('videos/')) {
            const pathParts = video.s3Path.split('/');
            console.log(`   ✅ medh-filess/${pathParts[0]}/${pathParts[1]}/${pathParts[2]}/`);
            console.log(`   📂 Batch folder: ${pathParts[1]}`);
            console.log(`   👤 Student folder: ${pathParts[2]}`);
            console.log(`   🎬 Video file: ${pathParts[3]}`);
          }
        }
      }
      
    } else {
      const errorText = await response.text();
      console.log('❌ Upload failed!');
      console.log('📋 Error response:', errorText);
    }
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    console.log('🧹 Cleaned up test file');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
  }
}

testCompleteStudentBatchUpload().catch(console.error);


