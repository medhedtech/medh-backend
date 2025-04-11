import { 
  s3Client, 
  getPresignedUrl as getS3PresignedUrl, 
  getPresignedPost, 
  deleteS3Object as s3DeleteObject 
} from "../config/aws-config.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { ENV_VARS } from "../config/envVars.js";

import logger from "./logger.js";

const BUCKET_NAME = ENV_VARS.AWS_S3_BUCKET_NAME;

/**
 * Gets a readable stream for an S3 object.
 * @param {string} key - The key of the S3 object.
 * @returns {Promise<Readable>} A readable stream of the object body.
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
    
    // AWS SDK v3 approach
    const command = new GetObjectCommand(params);
    const response = await s3Client.send(command);
    
    // Return the body as a stream
    const stream = response.Body;
    
    if (stream instanceof Readable) {
      stream.on("error", (err) => {
        // Log stream-specific errors
        logger.error(`S3 stream error for key ${key}:`, err);
      });
      
      return stream;
    } else {
      throw new Error("Response body is not a readable stream");
    }
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
    Conditions: options.conditions || [],
  };

  if (options.contentType) {
    params.ContentType = options.contentType;
  }

  try {
    logger.info(`Creating presigned POST for key: ${key}`);
    
    // Using the helper from aws-config.js
    return await getPresignedPost(params);
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
  };

  try {
    logger.info(
      `Getting presigned URL for operation ${operation} on key: ${key}`,
    );

    // Using the helper from aws-config.js
    return await getS3PresignedUrl(operation, params, expiresIn);
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
    return await s3DeleteObject(params);
  } catch (error) {
    logger.error(`Failed to delete S3 object with key ${key}:`, error);
    throw new Error(`Failed to delete S3 object: ${error.message}`);
  }
};
