import { s3 } from "../config/aws-config.js";
import { ENV_VARS } from "../config/envVars.js";

import logger from "./logger.js";

const BUCKET_NAME = ENV_VARS.AWS_S3_BUCKET_NAME;

/**
 * Gets a readable stream for an S3 object.
 * @param {string} key - The key of the S3 object.
 * @returns {Promise<AWS.S3.GetObjectOutput.Body>} A readable stream of the object body.
 * @throws {Error} If the bucket name is not configured or S3 retrieval fails.
 */
export const getFileStream = async (key) => {
  if (!BUCKET_NAME) {
    logger.error(
      "S3 Bucket Name (AWS_S3_BUCKET_NAME) is not configured in environment variables.",
    );
    throw new Error("S3 bucket name not configured.");
  }

  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
  };

  try {
    logger.info(
      `Attempting to get S3 stream for key: ${key} in bucket: ${BUCKET_NAME}`,
    );
    // Use createReadStream() for AWS SDK v2
    const stream = s3.getObject(params).createReadStream();

    stream.on("error", (err) => {
      // Log stream-specific errors
      logger.error(`S3 stream error for key ${key}:`, err);
    });

    return stream;
  } catch (error) {
    logger.error(`Failed to get S3 object stream for key ${key}:`, error);
    throw new Error(`Failed to retrieve file from S3: ${error.message}`);
  }
};

/**
 * Creates a presigned POST URL for uploading to S3.
 * @param {string} key - The key to use for the uploaded file.
 * @param {object} options - Additional options for presigned post.
 * @returns {Promise<object>} Presigned POST data including URL and fields.
 */
export const createPresignedPost = async (key, options = {}) => {
  if (!BUCKET_NAME) {
    logger.error("S3 Bucket Name is not configured.");
    throw new Error("S3 bucket name not configured.");
  }

  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Expires: options.expires || 3600, // Default 1 hour
    ContentType: options.contentType,
    Conditions: options.conditions || [],
  };

  try {
    logger.info(`Creating presigned POST for key: ${key}`);

    // For AWS SDK v2
    return new Promise((resolve, reject) => {
      s3.createPresignedPost(params, (err, data) => {
        if (err) {
          logger.error(`Failed to create presigned POST for key ${key}:`, err);
          reject(new Error(`Failed to create presigned POST: ${err.message}`));
        } else {
          resolve(data);
        }
      });
    });
  } catch (error) {
    logger.error(`Failed to create presigned POST for key ${key}:`, error);
    throw new Error(`Failed to create presigned POST: ${error.message}`);
  }
};

/**
 * Gets a presigned URL for an S3 object.
 * @param {string} key - The key of the S3 object.
 * @param {string} operation - The S3 operation ('getObject', 'putObject', etc.).
 * @param {number} expiresIn - Expiration time in seconds.
 * @returns {Promise<string>} Presigned URL.
 */
export const getPresignedUrl = async (
  key,
  operation = "getObject",
  expiresIn = 3600,
) => {
  if (!BUCKET_NAME) {
    logger.error("S3 Bucket Name is not configured.");
    throw new Error("S3 bucket name not configured.");
  }

  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Expires: expiresIn,
  };

  try {
    logger.info(
      `Getting presigned URL for operation ${operation} on key: ${key}`,
    );

    // For AWS SDK v2
    return new Promise((resolve, reject) => {
      s3.getSignedUrl(operation, params, (err, url) => {
        if (err) {
          logger.error(`Failed to get presigned URL for key ${key}:`, err);
          reject(new Error(`Failed to get presigned URL: ${err.message}`));
        } else {
          resolve(url);
        }
      });
    });
  } catch (error) {
    logger.error(`Failed to get presigned URL for key ${key}:`, error);
    throw new Error(`Failed to get presigned URL: ${error.message}`);
  }
};

/**
 * Deletes an object from S3.
 * @param {string} key - The key of the S3 object to delete.
 * @returns {Promise<object>} S3 delete result.
 */
export const deleteS3Object = async (key) => {
  if (!BUCKET_NAME) {
    logger.error("S3 Bucket Name is not configured.");
    throw new Error("S3 bucket name not configured.");
  }

  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
  };

  try {
    logger.info(`Deleting S3 object with key: ${key}`);
    return await s3.deleteObject(params).promise();
  } catch (error) {
    logger.error(`Failed to delete S3 object with key ${key}:`, error);
    throw new Error(`Failed to delete S3 object: ${error.message}`);
  }
};
