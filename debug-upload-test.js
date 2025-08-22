import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

async function debugUploadTest() {
  try {
    console.log('🧪 ========== DEBUG UPLOAD TEST ==========');
    
    // Create a test video file
    const testContent = 'Test video content for debugging';
    const testFilePath = './debug-test-video.mp4';
    fs.writeFileSync(testFilePath, testContent);
    
    // Create form data matching your exact request
    const formData = new FormData();
    formData.append('videos', fs.createReadStream(testFilePath), {
      filename: 'debug-test-video.mp4',
      contentType: 'video/mp4'
    });
    
    // Use your exact data
    formData.append('studentIds', '["67bd77548a56e7688dd02c30"]');
    formData.append('batchId', '68a087f95c14729d4678b3b1');
    formData.append('sessionNo', '1');
    formData.append('s3PathStructure', JSON.stringify({
      "basePath": "medh-files/videos",
      "batchId": "68a087f95c14729d4678b3b1",
      "batchName": "Digital Marketing with Data Analytics - Batch - 020149",
      "sessionNumber": "1",
      "students": [{
        "id": "67bd77548a56e7688dd02c30",
        "name": "Harsh Patel",
        "path": "67bd77548a56e7688dd02c30(Harsh Patel)"
      }]
    }));
    
    console.log('📡 Making upload request with your exact data...');
    console.log('📊 Student ID: 67bd77548a56e7688dd02c30');
    console.log('📊 Batch ID: 68a087f95c14729d4678b3b1');
    console.log('📊 Session No: 1');
    
    const response = await fetch('http://localhost:8080/api/v1/live-classes/upload-videos', {
      method: 'POST',
      body: formData
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📊 Raw response:', responseText);
    
    if (response.ok) {
      try {
        const result = JSON.parse(responseText);
        console.log('✅ Upload successful!');
        console.log('📊 Parsed response:', JSON.stringify(result, null, 2));
      } catch (parseError) {
        console.log('⚠️ Response is not JSON:', responseText);
      }
    } else {
      console.error('❌ Upload failed');
      console.error('📊 Error response:', responseText);
    }
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('❌ Stack:', error.stack);
  }
}

debugUploadTest();













