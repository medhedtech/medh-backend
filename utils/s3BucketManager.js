import { copyS3Object } from "../config/aws-config.js";
import { ENV_VARS } from "../config/envVars.js";
import logger from "./logger.js";

/**
 * Get the appropriate bucket name based on file type
 * @param {string} fileType - The type of file ('image', 'document', 'video')
 * @returns {string} The bucket name for the file type
 */
export const getBucketForFileType = (fileType) => {
  const bucketMap = {
    image: ENV_VARS.UPLOAD_CONSTANTS.BUCKETS.IMAGES,
    document: ENV_VARS.UPLOAD_CONSTANTS.BUCKETS.DOCUMENTS,
    video: ENV_VARS.UPLOAD_CONSTANTS.BUCKETS.VIDEOS,
  };

  return bucketMap[fileType] || ENV_VARS.UPLOAD_CONSTANTS.BUCKETS.DEFAULT;
};

/**
 * Get the appropriate bucket name based on MIME type
 * @param {string} mimeType - The MIME type of the file
 * @returns {string} The bucket name for the MIME type
 */
export const getBucketForMimeType = (mimeType) => {
  if (mimeType.startsWith("image/")) {
    return ENV_VARS.UPLOAD_CONSTANTS.BUCKETS.IMAGES;
  } else if (mimeType.startsWith("application/")) {
    return ENV_VARS.UPLOAD_CONSTANTS.BUCKETS.DOCUMENTS;
  } else if (mimeType.startsWith("video/")) {
    return ENV_VARS.UPLOAD_CONSTANTS.BUCKETS.VIDEOS;
  }

  return ENV_VARS.UPLOAD_CONSTANTS.BUCKETS.DEFAULT;
};

/**
 * Extract bucket and key from S3 URL
 * @param {string} s3Url - The S3 URL
 * @returns {Object} Object containing bucket and key
 */
export const parseS3Url = (s3Url) => {
  try {
    const url = new URL(s3Url);
    // Bucket is the first part of the hostname (before the first dot)
    const bucket = url.hostname.split(".")[0];
    // Key is the pathname without the leading slash
    const key = url.pathname.startsWith("/")
      ? url.pathname.slice(1)
      : url.pathname;
    return { bucket, key };
  } catch (error) {
    logger.error(`Failed to parse S3 URL: ${s3Url}`, error);
    throw new Error(`Invalid S3 URL format: ${s3Url}`);
  }
};

/**
 * Copy file from medh-filess to medhdocuments bucket (for non-video files)
 * @param {string} sourceUrl - The source S3 URL
 * @param {string} newKey - Optional new key for the destination (if not provided, uses same key)
 * @returns {Object} Copy operation result
 */
export const migrateFileToDocumentsBucket = async (
  sourceUrl,
  newKey = null,
) => {
  try {
    const { bucket: sourceBucket, key: sourceKey } = parseS3Url(sourceUrl);

    // Only migrate if source is from medh-filess bucket
    if (sourceBucket !== "medh-filess") {
      logger.info(
        `Skipping migration - source bucket is not medh-filess: ${sourceBucket}`,
      );
      return {
        success: false,
        message: "Source bucket is not medh-filess, skipping migration",
        sourceUrl,
      };
    }

    // Check if it's a video file (should stay in medh-filess)
    const isVideo =
      sourceKey.toLowerCase().includes(".mp4") ||
      sourceKey.toLowerCase().includes(".mov") ||
      sourceKey.toLowerCase().includes(".webm") ||
      sourceKey.toLowerCase().includes(".avi") ||
      sourceKey.toLowerCase().includes(".mkv");

    if (isVideo) {
      logger.info(
        `Skipping migration - video files should stay in medh-filess: ${sourceKey}`,
      );
      return {
        success: false,
        message:
          "Video files should stay in medh-filess bucket, skipping migration",
        sourceUrl,
      };
    }

    const destinationBucket = ENV_VARS.UPLOAD_CONSTANTS.BUCKETS.DEFAULT;
    const destinationKey = newKey || sourceKey;

    logger.info(
      `Migrating file from ${sourceBucket}/${sourceKey} to ${destinationBucket}/${destinationKey}`,
    );

    const result = await copyS3Object(
      sourceBucket,
      sourceKey,
      destinationBucket,
      destinationKey,
    );

    return {
      success: true,
      message: "File successfully migrated to documents bucket",
      ...result,
    };
  } catch (error) {
    logger.error(
      `Failed to migrate file to documents bucket: ${error.message}`,
    );
    throw error;
  }
};

/**
 * Copy image from medh-filess to medhdocuments bucket (legacy function for backward compatibility)
 * @param {string} sourceUrl - The source S3 URL
 * @param {string} newKey - Optional new key for the destination (if not provided, uses same key)
 * @returns {Object} Copy operation result
 */
export const migrateImageToDocumentsBucket = async (
  sourceUrl,
  newKey = null,
) => {
  return await migrateFileToDocumentsBucket(sourceUrl, newKey);
};

/**
 * Check if a URL is from the old medh-filess bucket and should be migrated
 * @param {string} url - The URL to check
 * @returns {boolean} True if URL is from medh-filess bucket and should be migrated
 */
export const shouldMigrateFromOldBucket = (url) => {
  try {
    const { bucket, key } = parseS3Url(url);

    // Only migrate from medh-filess bucket
    if (bucket !== "medh-filess") {
      return false;
    }

    // Don't migrate video files (they should stay in medh-filess)
    const isVideo =
      key.toLowerCase().includes(".mp4") ||
      key.toLowerCase().includes(".mov") ||
      key.toLowerCase().includes(".webm") ||
      key.toLowerCase().includes(".avi") ||
      key.toLowerCase().includes(".mkv");

    return !isVideo;
  } catch (error) {
    return false;
  }
};

/**
 * Check if a URL is from the old medh-filess bucket (legacy function for backward compatibility)
 * @param {string} url - The URL to check
 * @returns {boolean} True if URL is from medh-filess bucket
 */
export const isFromOldBucket = (url) => {
  try {
    const { bucket } = parseS3Url(url);
    return bucket === "medh-filess";
  } catch (error) {
    return false;
  }
};

/**
 * Get the new URL for a file that has been migrated to the documents bucket
 * @param {string} oldUrl - The old URL from medh-filess bucket
 * @returns {string} The new URL in the documents bucket
 */
export const getNewUrlForMigratedFile = (oldUrl) => {
  try {
    const { key } = parseS3Url(oldUrl);
    const newBucket = ENV_VARS.UPLOAD_CONSTANTS.BUCKETS.IMAGES;
    const region = ENV_VARS.AWS_REGION || "ap-south-1";
    return `https://${newBucket}.s3.${region}.amazonaws.com/${key}`;
  } catch (error) {
    logger.error(
      `Failed to generate new URL for migrated file: ${error.message}`,
    );
    return oldUrl; // Return original URL if parsing fails
  }
};
