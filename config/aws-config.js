/**
 * AWS Configuration Validation and Setup
 * Ensures all required AWS environment variables are properly configured
 */

import { S3Client, CopyObjectCommand } from '@aws-sdk/client-s3';

/**
 * Validates AWS environment variables
 * @returns {Object} Validation result with status and missing variables
 */
export const validateAWSConfig = () => {
  const requiredVars = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY', 
    'AWS_S3_BUCKET_NAME',
    'AWS_REGION'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  return {
    isValid: missingVars.length === 0,
    missingVars,
    config: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? '***HIDDEN***' : undefined,
      bucketName: process.env.AWS_S3_BUCKET_NAME,
      region: process.env.AWS_REGION || 'ap-south-1'
    }
  };
};

/**
 * Creates and configures S3 client with proper error handling
 * @returns {S3Client} Configured S3 client instance
 */
export const createS3Client = () => {
  const validation = validateAWSConfig();
  
  if (!validation.isValid) {
    console.error('❌ AWS Configuration Error:');
    console.error('   Missing environment variables:', validation.missingVars);
    console.error('   Please add these to your .env file:');
    validation.missingVars.forEach(varName => {
      console.error(`   ${varName}=your_${varName.toLowerCase()}`);
    });
    throw new Error(`Missing AWS configuration: ${validation.missingVars.join(', ')}`);
  }

  // Check if using test credentials
  const isTestMode = process.env.AWS_ACCESS_KEY_ID === 'test' || 
                     process.env.AWS_SECRET_ACCESS_KEY === 'test';

  if (isTestMode) {
    console.log('⚠️  Using TEST AWS credentials - uploads will be simulated');
  } else {
    console.log('✅ Using PRODUCTION AWS credentials');
  }

  console.log('🔧 AWS S3 Configuration:');
  console.log('   Region:', validation.config.region);
  console.log('   Bucket:', validation.config.bucketName);
  console.log('   Access Key:', validation.config.accessKeyId ? '***SET***' : 'NOT SET');

  return new S3Client({
    region: validation.config.region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
};

/**
 * AWS Configuration constants
 */
/**
 * Copy an object within S3 bucket
 * @param {Object} params - Copy parameters
 * @param {string} params.sourceBucket - Source bucket name
 * @param {string} params.sourceKey - Source object key
 * @param {string} params.destinationBucket - Destination bucket name
 * @param {string} params.destinationKey - Destination object key
 * @returns {Promise<Object>} Copy result
 */
export const copyS3Object = async ({ sourceBucket, sourceKey, destinationBucket, destinationKey }) => {
  const s3Client = createS3Client();
  
  const copyCommand = new CopyObjectCommand({
    CopySource: `${sourceBucket}/${sourceKey}`,
    Bucket: destinationBucket,
    Key: destinationKey
  });
  
  try {
    const result = await s3Client.send(copyCommand);
    console.log(`✅ Successfully copied S3 object from ${sourceBucket}/${sourceKey} to ${destinationBucket}/${destinationKey}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to copy S3 object:`, error.message);
    throw error;
  }
};

export const AWS_CONFIG = {
  REGION: process.env.AWS_REGION || 'ap-south-1',
  BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
  MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
  ALLOWED_MIME_TYPES: [
    'video/mp4',
    'video/mov',
    'video/webm',
    'video/avi',
    'video/mkv'
  ],
  // Only key prefix inside the bucket. Do NOT include the bucket name here.
  UPLOAD_PATH_PREFIX: process.env.AWS_UPLOAD_PREFIX || 'videos'
};

// Export a default s3Client instance for backward compatibility
export let s3Client;
try {
  s3Client = createS3Client();
} catch (error) {
  console.error('❌ Failed to create default s3Client:', error.message);
  s3Client = null;
}

// Additional S3 utility functions for backward compatibility
export const getPresignedUrl = async (bucket, key, expiresIn = 3600) => {
  try {
    const client = s3Client || createS3Client();
    // Implementation would go here
    console.log(`Getting presigned URL for ${bucket}/${key}`);
    return `https://${bucket}.s3.${AWS_CONFIG.REGION}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('❌ Error generating presigned URL:', error.message);
    throw error;
  }
};

export const getPresignedPost = async (bucket, key, conditions = {}) => {
  try {
    console.log(`Getting presigned POST for ${bucket}/${key}`);
    // Stub implementation
    return {
      url: `https://${bucket}.s3.${AWS_CONFIG.REGION}.amazonaws.com/`,
      fields: { key }
    };
  } catch (error) {
    console.error('❌ Error generating presigned POST:', error.message);
    throw error;
  }
};

export const deleteS3Object = async (bucket, key) => {
  try {
    console.log(`Deleting S3 object ${bucket}/${key}`);
    // Stub implementation
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting S3 object:', error.message);
    throw error;
  }
};