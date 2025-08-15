import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:8080/api/v1';

async function testUploadWithBatch() {
  console.log('🧪 Testing Video Upload with Batch ID');
  console.log('=====================================');
  
  try {
    // Create a test file
    const testFilePath = path.join(process.cwd(), 'test-video.mp4');
    const testContent = 'Mock video content for testing with batch';
    fs.writeFileSync(testFilePath, testContent);
    
    console.log('📁 Created test file:', testFilePath);
    
    // Create FormData
    const formData = new FormData();
    formData.append('videos', fs.createReadStream(testFilePath), {
      filename: 'test-video.mp4',
      contentType: 'video/mp4'
    });
    
    // Add a sample batch ID (you can replace this with a real batch ID from your database)
    const sampleBatchId = '507f1f77bcf86cd799439011'; // Sample MongoDB ObjectId
    formData.append('batchId', sampleBatchId);
    
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
      
      // Check if the response includes batch information
      if (data.data && data.data.batchInfo) {
        console.log('✅ Batch information included in response');
        console.log('📦 Batch Info:', data.data.batchInfo);
      } else {
        console.log('⚠️ No batch information in response (this is expected if batch ID is invalid)');
      }
      
      // Check S3 path structure
      if (data.data && data.data.videos && data.data.videos.length > 0) {
        const video = data.data.videos[0];
        console.log('📁 S3 Path:', video.s3Path);
        console.log('🔗 Video URL:', video.url);
        
        if (video.s3Path && video.s3Path.includes('videos/')) {
          console.log('✅ S3 path follows batch structure');
        } else {
          console.log('⚠️ S3 path does not follow batch structure (fallback to original structure)');
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

testUploadWithBatch().catch(console.error);

