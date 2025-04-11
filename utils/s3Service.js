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
