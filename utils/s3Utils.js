import AWS from 'aws-sdk';
import { ENV_VARS } from '../config/envVars.js';
import logger from './logger.js';

// Configure AWS
AWS.config.update({
  accessKeyId: ENV_VARS.IM_AWS_ACCESS_KEY,
  secretAccessKey: ENV_VARS.IM_AWS_SECRET_KEY,
  region: ENV_VARS.AWS_REGION || 'ap-south-1',
});

const s3 = new AWS.S3();

/**
 * Create S3 folder structure for certificates
 */
export const createCertificateFolderStructure = async () => {
  try {
    const folders = [
      'certificates/',
      'certificates/templates/',
      'certificates/generated/',
      'certificates/templates/demo/',
      'certificates/templates/blended/',
      'certificates/templates/live-interaction/'
    ];

    for (const folder of folders) {
      const params = {
        Bucket: ENV_VARS.AWS_S3_BUCKET_NAME,
        Key: folder,
        Body: '', // Empty body to create folder
      };

      await s3.putObject(params).promise();
      logger.info(`Created S3 folder: ${folder}`);
    }

    logger.info('Certificate folder structure created successfully');
    return true;
  } catch (error) {
    logger.error('Error creating certificate folder structure:', error);
    throw error;
  }
};

/**
 * Upload certificate template to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} templateType - Type of template (demo, blended, live-interaction)
 * @param {string} fileName - File name
 * @param {string} contentType - MIME type
 * @returns {Promise<Object>} - Upload result with Location
 */
export const uploadCertificateTemplate = async (fileBuffer, templateType, fileName, contentType) => {
  try {
    const key = `certificates/templates/${templateType}/${fileName}`;
    
    const params = {
      Bucket: ENV_VARS.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      ACL: 'public-read',
    };

    const result = await s3.upload(params).promise();
    
    logger.info('Certificate template uploaded successfully', {
      templateType,
      fileName,
      location: result.Location,
    });

    return result;
  } catch (error) {
    logger.error('Error uploading certificate template:', error);
    throw new Error(`Failed to upload certificate template: ${error.message}`);
  }
};

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - File name with path
 * @param {string} contentType - MIME type
 * @returns {Promise<Object>} - Upload result with Location
 */
export const uploadToS3 = async (fileBuffer, fileName, contentType) => {
  try {
    const params = {
      Bucket: ENV_VARS.AWS_S3_BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: contentType,
      ACL: 'public-read', // Make file publicly accessible
    };

    const result = await s3.upload(params).promise();
    
    logger.info('File uploaded to S3 successfully', {
      fileName,
      location: result.Location,
    });

    return result;
  } catch (error) {
    logger.error('Error uploading file to S3:', error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

/**
 * Generate signed URL for file download
 * @param {string} fileUrl - S3 file URL
 * @param {number} expirationInSeconds - URL expiration time in seconds
 * @returns {Promise<string>} - Signed URL
 */
export const generateSignedUrl = async (fileUrl, expirationInSeconds = 3600) => {
  try {
    // Extract bucket and key from S3 URL
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1); // Remove leading slash
    
    const params = {
      Bucket: ENV_VARS.AWS_S3_BUCKET_NAME,
      Key: key,
      Expires: expirationInSeconds,
    };

    const signedUrl = await s3.getSignedUrlPromise('getObject', params);
    
    logger.info('Signed URL generated successfully', {
      key,
      expirationInSeconds,
    });

    return signedUrl;
  } catch (error) {
    logger.error('Error generating signed URL:', error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
};

/**
 * Delete file from S3
 * @param {string} fileName - File name with path
 * @returns {Promise<Object>} - Delete result
 */
export const deleteFromS3 = async (fileName) => {
  try {
    const params = {
      Bucket: ENV_VARS.AWS_S3_BUCKET_NAME,
      Key: fileName,
    };

    const result = await s3.deleteObject(params).promise();
    
    logger.info('File deleted from S3 successfully', {
      fileName,
    });

    return result;
  } catch (error) {
    logger.error('Error deleting file from S3:', error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
};

/**
 * Check if file exists in S3
 * @param {string} fileName - File name with path
 * @returns {Promise<boolean>} - True if file exists
 */
export const fileExistsInS3 = async (fileName) => {
  try {
    const params = {
      Bucket: ENV_VARS.AWS_S3_BUCKET_NAME,
      Key: fileName,
    };

    await s3.headObject(params).promise();
    return true;
  } catch (error) {
    if (error.code === 'NotFound') {
      return false;
    }
    throw error;
  }
};

/**
 * Get file metadata from S3
 * @param {string} fileName - File name with path
 * @returns {Promise<Object>} - File metadata
 */
export const getFileMetadata = async (fileName) => {
  try {
    const params = {
      Bucket: ENV_VARS.AWS_S3_BUCKET_NAME,
      Key: fileName,
    };

    const result = await s3.headObject(params).promise();
    
    return {
      contentType: result.ContentType,
      contentLength: result.ContentLength,
      lastModified: result.LastModified,
      etag: result.ETag,
    };
  } catch (error) {
    logger.error('Error getting file metadata from S3:', error);
    throw new Error(`Failed to get file metadata: ${error.message}`);
  }
};
