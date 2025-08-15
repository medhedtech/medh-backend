import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:8080/api/v1';

async function testUploadEndpoint() {
  console.log('🧪 Testing Upload Endpoint');
  console.log('==========================');
  
  try {
    // Create a test file
    const testFilePath = path.join(process.cwd(), 'test-video.mp4');
    const testContent = 'Mock video content for testing';
    fs.writeFileSync(testFilePath, testContent);
    
    console.log('📁 Created test file:', testFilePath);
    
    // Create FormData
    const formData = new FormData();
    formData.append('videos', fs.createReadStream(testFilePath), {
      filename: 'test-video.mp4',
      contentType: 'video/mp4'
    });
    
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

testUploadEndpoint().catch(console.error);

