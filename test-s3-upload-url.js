import fetch from 'node-fetch';

async function testS3UploadUrl() {
  try {
    console.log('🧪 Testing S3 Upload URL Generation...');
    
    const response = await fetch('http://localhost:8080/api/v1/live-classes/generate-upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        batchObjectId: 'test-batch-123',
        studentName: 'Test Student',
        fileName: 'test-video.mp4',
        fileType: 'video/mp4'
      })
    });

    console.log('📋 Response Status:', response.status);
    console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.text();
    console.log('📋 Response Body:', data);

    if (response.ok) {
      const jsonData = JSON.parse(data);
      console.log('✅ Success! Response structure:', {
        status: jsonData.status,
        hasData: !!jsonData.data,
        dataKeys: jsonData.data ? Object.keys(jsonData.data) : 'No data',
        uploadUrl: jsonData.data?.uploadUrl ? 'Present' : 'Missing'
      });
    } else {
      console.error('❌ Error response:', data);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testS3UploadUrl();
