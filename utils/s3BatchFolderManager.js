import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { ENV_VARS } from '../config/envVars.js';
import logger from './logger.js';

// Initialize S3 client
const s3Client = new S3Client({
  region: ENV_VARS.AWS_REGION,
  credentials: {
    accessKeyId: ENV_VARS.AWS_ACCESS_KEY,
    secretAccessKey: ENV_VARS.AWS_SECRET_KEY,
  },
});

/**
 * Create S3 folder for a batch when it's created
 * @param {string} batchId - MongoDB ObjectId of the batch
 * @param {string} batchName - Name of the batch (for logging)
 * @returns {Promise<Object>} Result of folder creation
 */
export const createBatchS3Folder = async (batchId, batchName = 'Unknown') => {
  try {
    if (!batchId) {
      throw new Error('Batch ID is required to create S3 folder');
    }

    const bucketName = ENV_VARS.UPLOAD_CONSTANTS.BUCKETS.VIDEOS;
    const folderKey = `videos/${batchId}/`;

    logger.info(`📁 Creating S3 folder for batch: ${batchName} (${batchId})`);
    logger.info(`   - Bucket: ${bucketName}`);
    logger.info(`   - Folder Key: ${folderKey}`);

    // Create a placeholder object to establish the folder
    // S3 doesn't have real folders, so we create an empty object with a trailing slash
    const putObjectParams = {
      Bucket: bucketName,
      Key: folderKey,
      Body: '', // Empty content
      ContentType: 'application/x-directory',
      Metadata: {
        'batch-id': batchId,
        'batch-name': batchName,
        'created-at': new Date().toISOString(),
        'folder-type': 'batch-videos'
      }
    };

    const command = new PutObjectCommand(putObjectParams);
    await s3Client.send(command);

    logger.info(`✅ Successfully created S3 folder for batch: ${batchName}`);
    logger.info(`   - S3 Path: s3://${bucketName}/${folderKey}`);

    return {
      success: true,
      bucketName,
      folderKey,
      s3Path: `s3://${bucketName}/${folderKey}`,
      message: `S3 folder created successfully for batch: ${batchName}`
    };

  } catch (error) {
    logger.error(`❌ Failed to create S3 folder for batch: ${batchName}`, error);
    
    return {
      success: false,
      error: error.message,
      batchId,
      batchName,
      message: `Failed to create S3 folder for batch: ${batchName}`
    };
  }
};

/**
 * Check if S3 folder exists for a batch
 * @param {string} batchId - MongoDB ObjectId of the batch
 * @returns {Promise<Object>} Result of folder check
 */
export const checkBatchS3Folder = async (batchId) => {
  try {
    if (!batchId) {
      throw new Error('Batch ID is required to check S3 folder');
    }

    const bucketName = ENV_VARS.UPLOAD_CONSTANTS.BUCKETS.VIDEOS;
    const folderKey = `videos/${batchId}/`;

    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: folderKey
    });

    await s3Client.send(command);

    return {
      exists: true,
      bucketName,
      folderKey,
      s3Path: `s3://${bucketName}/${folderKey}`
    };

  } catch (error) {
    if (error.name === 'NotFound') {
      return {
        exists: false,
        bucketName: ENV_VARS.UPLOAD_CONSTANTS.BUCKETS.VIDEOS,
        folderKey: `videos/${batchId}/`,
        message: `S3 folder does not exist for batch: ${batchId}`
      };
    }
    
    logger.error(`❌ Error checking S3 folder for batch: ${batchId}`, error);
    return {
      exists: false,
      error: error.message,
      batchId
    };
  }
};

/**
 * Create S3 folder if it doesn't exist
 * @param {string} batchId - MongoDB ObjectId of the batch
 * @param {string} batchName - Name of the batch
 * @returns {Promise<Object>} Result of folder creation/check
 */
export const ensureBatchS3Folder = async (batchId, batchName = 'Unknown') => {
  try {
    // First check if folder exists
    const folderCheck = await checkBatchS3Folder(batchId);
    
    if (folderCheck.exists) {
      logger.info(`📁 S3 folder already exists for batch: ${batchName} (${batchId})`);
      return {
        success: true,
        alreadyExists: true,
        ...folderCheck,
        message: `S3 folder already exists for batch: ${batchName}`
      };
    }

    // Create folder if it doesn't exist
    return await createBatchS3Folder(batchId, batchName);

  } catch (error) {
    logger.error(`❌ Error ensuring S3 folder for batch: ${batchName}`, error);
    return {
      success: false,
      error: error.message,
      batchId,
      batchName
    };
  }
};

/**
 * Get S3 folder path for a batch
 * @param {string} batchId - MongoDB ObjectId of the batch
 * @returns {string} S3 folder path
 */
export const getBatchS3FolderPath = (batchId) => {
  if (!batchId) {
    throw new Error('Batch ID is required to get S3 folder path');
  }

  const bucketName = ENV_VARS.UPLOAD_CONSTANTS.BUCKETS.VIDEOS;
  const folderKey = `videos/${batchId}/`;
  
  return {
    bucketName,
    folderKey,
    s3Path: `s3://${bucketName}/${folderKey}`,
    urlPath: `https://${bucketName}.s3.${ENV_VARS.AWS_REGION}.amazonaws.com/${folderKey}`
  };
};

/**
 * Create S3 folder for a student within a batch
 * @param {string} batchId - MongoDB ObjectId of the batch
 * @param {string} studentId - MongoDB ObjectId of the student
 * @param {string} studentName - Name of the student (for logging)
 * @returns {Promise<Object>} Result of folder creation
 */
export const createStudentS3Folder = async (batchId, studentId, studentName = 'Unknown') => {
  try {
    if (!batchId || !studentId) {
      throw new Error('Batch ID and Student ID are required to create S3 folder');
    }

    const bucketName = ENV_VARS.UPLOAD_CONSTANTS.BUCKETS.VIDEOS;
    
    // Use student ID with student name in brackets for folder
    const safeStudentName = studentName
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .toLowerCase()
      .trim();
    
    const folderKey = `videos/${batchId}/${studentId}(${safeStudentName})/`;

    logger.info(`📁 Creating S3 folder for student: ${studentName} (${studentId}) in batch: ${batchId}`);
    logger.info(`   - Bucket: ${bucketName}`);
    logger.info(`   - Folder Key: ${folderKey}`);
    logger.info(`   - Student ID: ${studentId}`);
    logger.info(`   - Safe Student Name: ${safeStudentName}`);

    // Create a placeholder object to establish the folder
    const putObjectParams = {
      Bucket: bucketName,
      Key: folderKey,
      Body: '', // Empty content
      ContentType: 'application/x-directory',
      Metadata: {
        'batch-id': batchId,
        'student-id': studentId,
        'student-name': studentName,
        'created-at': new Date().toISOString(),
        'folder-type': 'student-videos'
      }
    };

    const command = new PutObjectCommand(putObjectParams);
    await s3Client.send(command);

    logger.info(`✅ Successfully created S3 folder for student: ${studentName}`);
    logger.info(`   - S3 Path: s3://${bucketName}/${folderKey}`);

    return {
      success: true,
      bucketName,
      folderKey,
      s3Path: `s3://${bucketName}/${folderKey}`,
      studentName,
      studentId,
      message: `S3 folder created successfully for student: ${studentName}`
    };

  } catch (error) {
    logger.error(`❌ Failed to create S3 folder for student: ${studentName}`, error);
    
    return {
      success: false,
      error: error.message,
      batchId,
      studentId,
      studentName,
      message: `Failed to create S3 folder for student: ${studentName}`
    };
  }
};

/**
 * Check if S3 folder exists for a student within a batch
 * @param {string} batchId - MongoDB ObjectId of the batch
 * @param {string} studentId - MongoDB ObjectId of the student
 * @returns {Promise<Object>} Result of folder check
 */
export const checkStudentS3Folder = async (batchId, studentId, studentName = 'Unknown') => {
  try {
    if (!batchId || !studentId) {
      throw new Error('Batch ID and Student ID are required to check S3 folder');
    }

    const bucketName = ENV_VARS.UPLOAD_CONSTANTS.BUCKETS.VIDEOS;
    
    // Use student ID with student name in brackets for folder
    const safeStudentName = studentName
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .toLowerCase()
      .trim();
    
    const folderKey = `videos/${batchId}/${studentId}(${safeStudentName})/`;

    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: folderKey
    });

    await s3Client.send(command);

    return {
      exists: true,
      bucketName,
      folderKey,
      s3Path: `s3://${bucketName}/${folderKey}`,
      studentName,
      studentId
    };

  } catch (error) {
    if (error.name === 'NotFound') {
      return {
        exists: false,
        bucketName: ENV_VARS.UPLOAD_CONSTANTS.BUCKETS.VIDEOS,
        folderKey: `videos/${batchId}/${studentId}(${safeStudentName})/`,
        studentName,
        studentId,
        message: `S3 folder does not exist for student: ${studentName} in batch: ${batchId}`
      };
    }
    
    logger.error(`❌ Error checking S3 folder for student: ${studentId} in batch: ${batchId}`, error);
    return {
      exists: false,
      error: error.message,
      batchId,
      studentId
    };
  }
};

/**
 * Create S3 folder for a student if it doesn't exist
 * @param {string} batchId - MongoDB ObjectId of the batch
 * @param {string} studentId - MongoDB ObjectId of the student
 * @param {string} studentName - Name of the student
 * @returns {Promise<Object>} Result of folder creation/check
 */
export const ensureStudentS3Folder = async (batchId, studentId, studentName = 'Unknown') => {
  try {
    // First check if folder exists
    const folderCheck = await checkStudentS3Folder(batchId, studentId, studentName);
    
    if (folderCheck.exists) {
      logger.info(`📁 S3 folder already exists for student: ${studentName} (${studentId}) in batch: ${batchId}`);
      return {
        success: true,
        alreadyExists: true,
        ...folderCheck,
        message: `S3 folder already exists for student: ${studentName}`
      };
    }

    // Create folder if it doesn't exist
    return await createStudentS3Folder(batchId, studentId, studentName);

  } catch (error) {
    logger.error(`❌ Error ensuring S3 folder for student: ${studentName}`, error);
    return {
      success: false,
      error: error.message,
      batchId,
      studentId,
      studentName
    };
  }
};

/**
 * Get S3 folder path for a student within a batch
 * @param {string} batchId - MongoDB ObjectId of the batch
 * @param {string} studentId - MongoDB ObjectId of the student
 * @returns {Object} S3 folder path
 */
export const getStudentS3FolderPath = (batchId, studentId, studentName = 'Unknown') => {
  if (!batchId || !studentId) {
    throw new Error('Batch ID and Student ID are required to get S3 folder path');
  }

  const bucketName = ENV_VARS.UPLOAD_CONSTANTS.BUCKETS.VIDEOS;
  
  // Use student ID with student name in brackets for folder
  const safeStudentName = studentName
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .toLowerCase()
    .trim();
  
  const folderKey = `videos/${batchId}/${studentId}(${safeStudentName})/`;
  
  return {
    bucketName,
    folderKey,
    s3Path: `s3://${bucketName}/${folderKey}`,
    urlPath: `https://${bucketName}.s3.${ENV_VARS.AWS_REGION}.amazonaws.com/${folderKey}`,
    studentName,
    studentId
  };
};

/**
 * Create S3 folder for multiple batches
 * @param {Array} batches - Array of batch objects with _id and batch_name
 * @returns {Promise<Array>} Results for each batch
 */
export const createBatchS3Folders = async (batches) => {
  const results = [];
  
  for (const batch of batches) {
    const result = await createBatchS3Folder(batch._id, batch.batch_name);
    results.push({
      batchId: batch._id,
      batchName: batch.batch_name,
      ...result
    });
  }
  
  return results;
};

export default {
  createBatchS3Folder,
  checkBatchS3Folder,
  ensureBatchS3Folder,
  getBatchS3FolderPath,
  createBatchS3Folders,
  createStudentS3Folder,
  checkStudentS3Folder,
  ensureStudentS3Folder,
  getStudentS3FolderPath
};
