import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

async function testVideoUploadFinal() {
  try {
    console.log('🧪 Testing final video upload...');
    
    // Create a test video file
    const testContent = 'Test video content for upload';
    const testFilePath = './test-video-final.mp4';
    fs.writeFileSync(testFilePath, testContent);
    
    // Create form data
    const formData = new FormData();
    formData.append('videos', fs.createReadStream(testFilePath), {
      filename: 'test-video-final.mp4',
      contentType: 'video/mp4'
    });
    formData.append('studentIds', JSON.stringify(['689485a5869a39114c18efec'])); // Real student ID
    formData.append('batchId', '68a087f95c14729d4678b3b1'); // Real batch ID  
    formData.append('sessionNo', '1');
    
    console.log('📡 Making upload request...');
    const response = await fetch('http://localhost:8080/api/v1/live-classes/upload-videos', {
      method: 'POST',
      body: formData
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response OK:', response.ok);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Upload successful!');
      console.log('📊 Response:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      console.error('❌ Upload failed');
      console.error('📊 Error response:', errorText.substring(0, 500));
    }
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testVideoUploadFinal();



