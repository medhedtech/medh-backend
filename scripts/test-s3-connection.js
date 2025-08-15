import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testS3Connection() {
  console.log('🔍 Testing AWS S3 Connection...');
  console.log('📝 Environment variables:');
  console.log('  - AWS_REGION:', process.env.AWS_REGION);
  console.log('  - AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
  console.log('  - AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
  console.log('  - AWS_S3_BUCKET_NAME:', process.env.AWS_S3_BUCKET_NAME);

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('❌ AWS credentials not found in environment variables');
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

    console.log('🚀 Testing S3 connection...');
    
    // Test connection by listing buckets
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    
    console.log('✅ S3 connection successful!');
    console.log('📦 Available buckets:');
    response.Buckets.forEach(bucket => {
      console.log(`  - ${bucket.Name} (created: ${bucket.CreationDate})`);
    });

    // Test specific bucket access
    if (process.env.AWS_S3_BUCKET_NAME) {
      console.log(`🔍 Testing access to bucket: ${process.env.AWS_S3_BUCKET_NAME}`);
      
      const bucketExists = response.Buckets.some(bucket => 
        bucket.Name === process.env.AWS_S3_BUCKET_NAME
      );
      
      if (bucketExists) {
        console.log('✅ Bucket found and accessible!');
      } else {
        console.log('❌ Bucket not found or not accessible');
      }
    }

  } catch (error) {
    console.error('❌ S3 connection failed:', error.message);
    console.error('🔍 Error details:', error);
  }
}

// Run the test
testS3Connection();
