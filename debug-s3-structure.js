// Debug script to understand S3 structure for student videos
import { s3Client } from "./config/aws-config.js";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { ENV_VARS } from "./config/envVars.js";

const studentId = "67cfe3a9a50dbb995b4d94da"; // Replace with actual student ID
const studentName = "abhi"; // Replace with actual student name

async function debugS3Structure() {
  console.log('🔍 Debugging S3 Structure for Student Videos\n');
  console.log(`Student ID: ${studentId}`);
  console.log(`Student Name: ${studentName}`);
  console.log(`S3 Bucket: ${ENV_VARS.UPLOAD_CONSTANTS.BUCKET_NAME}\n`);

  // 1. Check videos/ root directory
  console.log('📁 1. Checking videos/ root directory...');
  try {
    const rootParams = {
      Bucket: ENV_VARS.UPLOAD_CONSTANTS.BUCKET_NAME,
      Prefix: 'videos/',
      Delimiter: '/', // This will show only top-level folders
      MaxKeys: 100
    };

    const rootCommand = new ListObjectsV2Command(rootParams);
    const rootResponse = await s3Client.send(rootCommand);

    console.log(`Found ${rootResponse.CommonPrefixes?.length || 0} folders and ${rootResponse.Contents?.length || 0} files`);
    
    if (rootResponse.CommonPrefixes) {
      console.log('Top-level folders in videos/:');
      rootResponse.CommonPrefixes.forEach(prefix => {
        console.log(`  📁 ${prefix.Prefix}`);
      });
    }
    
    if (rootResponse.Contents) {
      console.log('Files directly in videos/:');
      rootResponse.Contents.forEach(obj => {
        if (!obj.Key.endsWith('/')) {
          console.log(`  📄 ${obj.Key} (${(obj.Size / 1024 / 1024).toFixed(2)}MB)`);
        }
      });
    }
  } catch (error) {
    console.error('Error checking videos/ root:', error.message);
  }

  console.log('\n📁 2. Checking for student-specific patterns...');
  
  // 2. Check various student-specific patterns
  const searchPatterns = [
    `videos/student/${studentId}/`,
    `videos/${studentId}/`,
    `videos/${studentName}/`,
    `videos/isaac/`, // Based on your mention of "isaac" folder
    'videos/' // Broad search
  ];

  for (const pattern of searchPatterns) {
    console.log(`\n🔍 Searching pattern: ${pattern}`);
    try {
      const params = {
        Bucket: ENV_VARS.UPLOAD_CONSTANTS.BUCKET_NAME,
        Prefix: pattern,
        MaxKeys: 100
      };

      const command = new ListObjectsV2Command(params);
      const response = await s3Client.send(command);

      if (response.Contents && response.Contents.length > 0) {
        console.log(`  ✅ Found ${response.Contents.length} objects:`);
        
        // Group by type
        const folders = response.Contents.filter(obj => obj.Key.endsWith('/'));
        const files = response.Contents.filter(obj => !obj.Key.endsWith('/'));
        
        if (folders.length > 0) {
          console.log(`    📁 Folders (${folders.length}):`);
          folders.slice(0, 10).forEach(obj => {
            console.log(`      ${obj.Key}`);
          });
        }
        
        if (files.length > 0) {
          console.log(`    📄 Files (${files.length}):`);
          files.slice(0, 10).forEach(obj => {
            const fileName = obj.Key.split('/').pop();
            const extension = fileName.substring(fileName.lastIndexOf('.'));
            const isVideo = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'].includes(extension.toLowerCase());
            console.log(`      ${obj.Key} (${(obj.Size / 1024 / 1024).toFixed(2)}MB) ${isVideo ? '🎥' : ''}`);
          });
        }
      } else {
        console.log(`  ❌ No objects found for pattern: ${pattern}`);
      }
    } catch (error) {
      console.error(`  ❌ Error searching pattern ${pattern}:`, error.message);
    }
  }

  // 3. Search for any files containing student identifier
  console.log('\n🔍 3. Searching for any files containing student identifiers...');
  try {
    const broadParams = {
      Bucket: ENV_VARS.UPLOAD_CONSTANTS.BUCKET_NAME,
      Prefix: 'videos/',
      MaxKeys: 1000
    };

    const broadCommand = new ListObjectsV2Command(broadParams);
    const broadResponse = await s3Client.send(broadCommand);

    if (broadResponse.Contents) {
      const matchingFiles = broadResponse.Contents.filter(obj => {
        if (obj.Key.endsWith('/')) return false; // Skip directories
        
        const keyLower = obj.Key.toLowerCase();
        return keyLower.includes(studentId.toLowerCase()) ||
               keyLower.includes(studentName.toLowerCase()) ||
               keyLower.includes('isaac') ||
               keyLower.includes('abhi');
      });

      if (matchingFiles.length > 0) {
        console.log(`✅ Found ${matchingFiles.length} files containing student identifiers:`);
        matchingFiles.forEach(obj => {
          const fileName = obj.Key.split('/').pop();
          const extension = fileName.substring(fileName.lastIndexOf('.'));
          const isVideo = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'].includes(extension.toLowerCase());
          console.log(`  ${obj.Key} (${(obj.Size / 1024 / 1024).toFixed(2)}MB) ${isVideo ? '🎥' : ''}`);
        });
      } else {
        console.log('❌ No files found containing student identifiers');
      }
    }
  } catch (error) {
    console.error('Error in broad search:', error.message);
  }

  console.log('\n🏁 Debug complete. Use the information above to understand your S3 structure.');
}

// Run the debug
debugS3Structure().catch(console.error);
