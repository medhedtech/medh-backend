import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function testVideoUpload() {
  console.log('🧪 Testing Video Upload to S3');
  console.log('================================');
  
  // Check environment variables
  console.log('📝 Environment variables:');
  console.log('- AWS_REGION:', process.env.AWS_REGION);
  console.log('- AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
  console.log('- AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
  console.log('- AWS_S3_BUCKET_NAME:', process.env.AWS_S3_BUCKET_NAME);
  
  if (!process.env.AWS_S3_BUCKET_NAME) {
    console.error('❌ AWS_S3_BUCKET_NAME is not set!');
    return;
  }
  
  try {
    // Initialize S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    console.log(`\n🚀 Testing upload to bucket: ${bucketName}`);
    
    // Create a test file content (simulating a video file)
    const testContent = 'This is a test video file content for S3 upload testing.';
    const fileExtension = 'mp4';
    const uniqueFileName = `live-sessions/videos/${Date.now()}-${crypto.randomBytes(16).toString('hex')}.${fileExtension}`;
    
    console.log(`📝 Generated S3 key: ${uniqueFileName}`);
    
    const uploadParams = {
      Bucket: bucketName,
      Key: uniqueFileName,
      Body: testContent,
      ContentType: 'video/mp4',
      Metadata: {
        originalName: 'test-video.mp4',
        uploadedAt: new Date().toISOString(),
        test: 'true'
      },
    };
    
    console.log('📤 Uploading test file to S3...');
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);
    
    const videoUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${uniqueFileName}`;
    
    console.log('✅ Test upload successful!');
    console.log(`🔗 Test file URL: ${videoUrl}`);
    console.log(`📁 S3 Path: ${uniqueFileName}`);
    
    // Test the actual upload endpoint
    console.log('\n🌐 Testing actual upload endpoint...');
    console.log('Make sure your backend server is running on http://localhost:8080');
    console.log('Then try uploading a video through your frontend form.');
    
  } catch (error) {
    console.error('❌ Error during test upload:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.Code,
      statusCode: error.$metadata?.httpStatusCode
    });
  }
}

testVideoUpload().catch(console.error);

