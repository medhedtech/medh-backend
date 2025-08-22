import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client, AWS_CONFIG } from './config/aws-config.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import './models/liveSession.model.js';

async function generateVideoUrl() {
  try {
    console.log('🧪 ========== GENERATE VIDEO URL ==========');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('✅ Connected to MongoDB');
    
    const LiveSession = mongoose.model('LiveSession');
    
    // Find the latest session with video data
    const sessionWithVideo = await LiveSession.findOne({
      'video.fileId': { $ne: 'no-video' }
    })
    .sort({ createdAt: -1 })
    .select('sessionTitle video createdAt');
    
    if (!sessionWithVideo) {
      console.log('❌ No sessions with video data found');
      return;
    }
    
    console.log('✅ Found session:', sessionWithVideo.sessionTitle);
    console.log('📹 Video file:', sessionWithVideo.video.name);
    console.log('📊 File size:', sessionWithVideo.video.size, 'bytes');
    console.log('🗂️ S3 Path:', sessionWithVideo.video.fileId);
    
    // Initialize S3 client
    const s3Client = createS3Client();
    console.log('✅ S3 Client initialized');
    
    // Generate signed URL
    console.log('\n📡 Generating signed URL...');
    
    const command = new GetObjectCommand({
      Bucket: AWS_CONFIG.BUCKET_NAME,
      Key: sessionWithVideo.video.fileId
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, { 
      expiresIn: 3600 // 1 hour
    });
    
    console.log('\n🎉 ========== SUCCESS! ==========');
    console.log('✅ Signed URL generated successfully!');
    console.log('⏰ Valid for: 1 hour');
    console.log('\n🔗 **YOUR VIDEO URL:**');
    console.log(signedUrl);
    console.log('\n📋 **INSTRUCTIONS:**');
    console.log('1. Copy the URL above');
    console.log('2. Paste it in your browser');
    console.log('3. Your video should download/play directly!');
    console.log('4. URL will expire in 1 hour for security');
    console.log('\n🎬 **Video Details:**');
    console.log('   - Title:', sessionWithVideo.sessionTitle);
    console.log('   - File:', sessionWithVideo.video.name);
    console.log('   - Size:', (sessionWithVideo.video.size / (1024*1024)).toFixed(2), 'MB');
    console.log('   - Created:', sessionWithVideo.createdAt);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('📊 Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

generateVideoUrl();
