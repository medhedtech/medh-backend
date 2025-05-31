import { PutObjectCommand } from "@aws-sdk/client-s3";

import { s3Client } from "../config/aws-config.js";
import { ENV_VARS } from "../config/envVars.js"; // Import ENV_VARS

// Removed local upload constants

export class UploadError extends Error {
  constructor(message, code = "UPLOAD_ERROR") {
    super(message);
    this.name = "UploadError";
    this.code = code;
  }
}

const validateFileType = (mimeType) => {
  if (!ENV_VARS.UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES[mimeType]) {
    // Use ENV_VARS
    throw new UploadError(
      `Invalid file type. Allowed types: ${Object.keys(ENV_VARS.UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES).join(", ")}`,
      "INVALID_FILE_TYPE",
    );
  }
  return true;
};

const validateFileSize = (size) => {
  if (size > ENV_VARS.UPLOAD_CONSTANTS.MAX_FILE_SIZE) {
    // Use ENV_VARS
    throw new UploadError(
      `File size exceeds maximum limit of ${ENV_VARS.UPLOAD_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024)}MB`,
      "FILE_TOO_LARGE",
    );
  }
  return true;
};

export const uploadFile = async (uploadData) => {
  try {
    // Validate file type
    if (uploadData.contentType) {
      validateFileType(uploadData.contentType);
    }

    // Validate file size if provided
    if (uploadData.fileSize) {
      validateFileSize(uploadData.fileSize);
    }

    const uploadParams = {
      Bucket: uploadData.bucketName || ENV_VARS.UPLOAD_CONSTANTS.BUCKET_NAME, // Use ENV_VARS
      Key: uploadData.key,
      Body: uploadData.file,
      ContentType: uploadData.contentType,
    };

    // AWS SDK v3 approach
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Construct the S3 URL since SDK v3 doesn't return Location
    const region = ENV_VARS.AWS_REGION || "us-east-1";
    const url = `https://${uploadParams.Bucket}.s3.${region}.amazonaws.com/${uploadParams.Key}`;

    return {
      success: true,
      data: {
        url: url,
        key: uploadParams.Key,
        bucket: uploadParams.Bucket,
        contentType: uploadParams.ContentType,
      },
    };
  } catch (error) {
    console.error("Upload error:", error);
    throw new UploadError(
      error.message || "Failed to upload file",
      error.code || "UPLOAD_ERROR",
    );
  }
};

export const uploadBase64File = async (base64String, fileType, folder) => {
  try {
    // Extract MIME type and base64 data
    const mimeTypeMatch = base64String.match(/^data:(.*?);base64,/);
    if (!mimeTypeMatch) {
      throw new UploadError("Invalid base64 string format", "INVALID_BASE64");
    }

    const mimeType = mimeTypeMatch[1];
    const base64Data = base64String.replace(/^data:.*;base64,/, "");

    // Validate file type
    validateFileType(mimeType);

    // Create file buffer
    const file = Buffer.from(base64Data, "base64");

    // Generate S3 key
    const fileExtension =
      ENV_VARS.UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES[mimeType]; // Use ENV_VARS
    const key = `${folder}/${Date.now()}.${fileExtension}`;

    // Upload parameters
    const uploadParams = {
      key,
      file,
      contentType: mimeType,
    };

    return await uploadFile(uploadParams);
  } catch (error) {
    console.error("Base64 upload error:", error);
    throw error;
  }
};

// Optimized base64 upload with streaming and chunked processing
export const uploadBase64FileOptimized = async (base64Data, mimeType, folder) => {
  try {
    // Validate file type first
    validateFileType(mimeType);

    // Get file extension
    const fileExtension = ENV_VARS.UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES[mimeType];
    if (!fileExtension) {
      throw new UploadError(`Unsupported MIME type: ${mimeType}`, "INVALID_MIME_TYPE");
    }

    // Generate unique key with timestamp and random string
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const key = `${folder}/${timestamp}-${randomStr}.${fileExtension}`;

    // Performance optimization: Convert base64 to buffer directly
    // This is more efficient than streaming for the AWS SDK v3 implementation
    const startDecodeTime = Date.now();
    const fileBuffer = Buffer.from(base64Data, 'base64');
    const decodeTime = Date.now() - startDecodeTime;

    // Validate file size after decoding
    validateFileSize(fileBuffer.length);

    // Upload parameters with buffer (more reliable than streaming for S3)
    const uploadParams = {
      Bucket: ENV_VARS.UPLOAD_CONSTANTS.BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      ContentLength: fileBuffer.length, // Explicitly set content length
    };

    // Execute upload with progress tracking
    const startUploadTime = Date.now();
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);
    const uploadTime = Date.now() - startUploadTime;

    // Log performance metrics
    console.log(`Upload completed in ${uploadTime}ms (decode: ${decodeTime}ms) for key: ${key}`);

    // Construct the S3 URL
    const region = ENV_VARS.AWS_REGION || "us-east-1";
    const url = `https://${uploadParams.Bucket}.s3.${region}.amazonaws.com/${uploadParams.Key}`;

    return {
      success: true,
      data: {
        url: url,
        key: uploadParams.Key,
        bucket: uploadParams.Bucket,
        contentType: uploadParams.ContentType,
        uploadTime: uploadTime,
        decodeTime: decodeTime,
        fileSize: fileBuffer.length,
      },
    };
  } catch (error) {
    console.error("Optimized base64 upload error:", error);
    throw new UploadError(
      error.message || "Failed to upload file",
      error.code || "UPLOAD_ERROR"
    );
  }
};

// Chunked processing version for very large files (>25MB)
export const uploadBase64FileChunked = async (base64Data, mimeType, folder) => {
  try {
    // Validate file type first
    validateFileType(mimeType);

    // Get file extension
    const fileExtension = ENV_VARS.UPLOAD_CONSTANTS.ALLOWED_MIME_TYPES[mimeType];
    if (!fileExtension) {
      throw new UploadError(`Unsupported MIME type: ${mimeType}`, "INVALID_MIME_TYPE");
    }

    // Generate unique key
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const key = `${folder}/${timestamp}-${randomStr}.${fileExtension}`;

    // For very large files, process in chunks to avoid memory spikes
    const chunkSize = 1024 * 1024; // 1MB chunks
    const chunks = [];
    
    const startDecodeTime = Date.now();
    
    // Process base64 in chunks
    for (let i = 0; i < base64Data.length; i += chunkSize) {
      const chunk = base64Data.slice(i, i + chunkSize);
      // Ensure chunk ends on 4-byte boundary for valid base64
      const adjustedChunk = adjustBase64Chunk(chunk, i + chunkSize >= base64Data.length);
      chunks.push(Buffer.from(adjustedChunk, 'base64'));
    }
    
    const fileBuffer = Buffer.concat(chunks);
    const decodeTime = Date.now() - startDecodeTime;

    // Validate file size
    validateFileSize(fileBuffer.length);

    // Upload to S3
    const uploadParams = {
      Bucket: ENV_VARS.UPLOAD_CONSTANTS.BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      ContentLength: fileBuffer.length,
    };

    const startUploadTime = Date.now();
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);
    const uploadTime = Date.now() - startUploadTime;

    console.log(`Chunked upload completed in ${uploadTime}ms (decode: ${decodeTime}ms) for key: ${key}`);

    // Construct the S3 URL
    const region = ENV_VARS.AWS_REGION || "us-east-1";
    const url = `https://${uploadParams.Bucket}.s3.${region}.amazonaws.com/${uploadParams.Key}`;

    return {
      success: true,
      data: {
        url: url,
        key: uploadParams.Key,
        bucket: uploadParams.Bucket,
        contentType: uploadParams.ContentType,
        uploadTime: uploadTime,
        decodeTime: decodeTime,
        fileSize: fileBuffer.length,
        processingMethod: 'chunked',
      },
    };
  } catch (error) {
    console.error("Chunked base64 upload error:", error);
    throw new UploadError(
      error.message || "Failed to upload file",
      error.code || "UPLOAD_ERROR"
    );
  }
};

// Helper function to adjust base64 chunks to valid boundaries
function adjustBase64Chunk(chunk, isLastChunk) {
  if (isLastChunk) return chunk;
  
  // Ensure chunk ends on 4-character boundary
  const remainder = chunk.length % 4;
  if (remainder === 0) return chunk;
  
  // Trim to nearest 4-character boundary
  return chunk.slice(0, chunk.length - remainder);
}
