// Test script for S3 subfolder discovery
import { config } from 'dotenv';
config();

async function testS3SubfolderDiscovery() {
  try {
    console.log('🧪 Testing S3 Subfolder Discovery\n');

    // Import AWS modules
    const { s3Client } = await import("./config/aws-config.js");
    const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
    const { ENV_VARS } = await import("./config/envVars.js");

    // Test with a student ID (replace with actual student ID)
    const testStudentId = '6739b3ff8fdc8a8550e6f5d6'; // Replace with actual student ID
    
    // List all objects in student directory
    const listParams = {
      Bucket: ENV_VARS.UPLOAD_CONSTANTS.BUCKET_NAME,
      Prefix: `videos/student/${testStudentId}/`,
      MaxKeys: 1000
    };

    console.log('📂 Listing S3 objects with params:', listParams);
    
    const listCommand = new ListObjectsV2Command(listParams);
    const listResponse = await s3Client.send(listCommand);

    console.log('\n📊 S3 Response Summary:', {
      keyCount: listResponse.KeyCount || 0,
      totalObjects: listResponse.Contents?.length || 0,
      isTruncated: listResponse.IsTruncated,
      bucket: listParams.Bucket,
      prefix: listParams.Prefix
    });

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      console.log('\n❌ No objects found in S3 for this student');
      console.log('🔍 Check if:');
      console.log('   - Student ID is correct');
      console.log('   - S3 bucket permissions are correct');
      console.log('   - Files exist in the expected path');
      return;
    }

    console.log('\n📁 All Objects Found:');
    listResponse.Contents.forEach((object, index) => {
      console.log(`${index + 1}. ${object.Key} (${object.Size} bytes, ${object.LastModified})`);
    });

    // Define video file extensions
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'];
    
    // Filter for video files
    const videoFiles = listResponse.Contents.filter(object => {
      if (object.Key.endsWith('/')) return false; // Skip directories
      
      const fileName = object.Key.split('/').pop();
      const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
      return videoExtensions.includes(fileExtension);
    });

    console.log(`\n🎥 Video Files Found: ${videoFiles.length}`);
    
    if (videoFiles.length > 0) {
      videoFiles.forEach((video, index) => {
        const keyParts = video.Key.split('/');
        const folderPath = keyParts.slice(3, -1).join('/'); // Remove 'videos/student/{studentId}' and filename
        const fileName = keyParts.pop();
        
        console.log(`${index + 1}. File: ${fileName}`);
        console.log(`   Folder: ${folderPath || 'root'}`);
        console.log(`   Full Path: ${video.Key}`);
        console.log(`   Size: ${(video.Size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Modified: ${video.LastModified}`);
        console.log('');
      });

      // Show folder distribution
      const folderDistribution = videoFiles.reduce((acc, video) => {
        const keyParts = video.Key.split('/');
        const folderPath = keyParts.slice(3, -1).join('/');
        const folder = folderPath || 'root';
        acc[folder] = (acc[folder] || 0) + 1;
        return acc;
      }, {});

      console.log('📊 Video Distribution by Folder:');
      Object.entries(folderDistribution).forEach(([folder, count]) => {
        console.log(`   ${folder}: ${count} video(s)`);
      });
    }

  } catch (error) {
    console.error('❌ Error testing S3 subfolder discovery:', error);
  }
}

// Run the test
testS3SubfolderDiscovery().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
