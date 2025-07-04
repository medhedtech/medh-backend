// Migrate from AWS SDK v2 to AWS SDK v3
import {
  S3Client,
  ListBucketsCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { SESClient, GetSendQuotaCommand } from "@aws-sdk/client-ses";
import { SNSClient, ListTopicsCommand } from "@aws-sdk/client-sns";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import logger from "../utils/logger.js";

import { ENV_VARS } from "./envVars.js";

// Validate required AWS environment variables
function validateAWSConfig() {
  const issues = [];
  
  if (!ENV_VARS.AWS_ACCESS_KEY) {
    issues.push("IM_AWS_ACCESS_KEY environment variable is missing");
  }
  
  if (!ENV_VARS.AWS_SECRET_KEY) {
    issues.push("IM_AWS_SECRET_KEY environment variable is missing");
  }
  
  if (!ENV_VARS.AWS_REGION) {
    issues.push("AWS_REGION environment variable is missing");
  }
  
  if (!ENV_VARS.AWS_S3_BUCKET_NAME) {
    issues.push("AWS_S3_BUCKET_NAME environment variable is missing");
  }
  
  if (issues.length > 0) {
    logger.error("AWS Configuration Issues:", issues);
    throw new Error(`AWS Configuration Error: ${issues.join(', ')}`);
  }
  
  logger.info("AWS configuration validation passed");
  return true;
}

// Validate AWS configuration on startup
validateAWSConfig();

// Common AWS configuration
const awsConfig = {
  credentials: {
    accessKeyId: ENV_VARS.AWS_ACCESS_KEY,
    secretAccessKey: ENV_VARS.AWS_SECRET_KEY,
  },
  region: ENV_VARS.AWS_REGION, // Use the configured region directly
};

// Log AWS configuration (without sensitive data)
logger.info("AWS Configuration:", {
  region: awsConfig.region,
  accessKeyId: awsConfig.credentials.accessKeyId ? 
    `${awsConfig.credentials.accessKeyId.substring(0, 10)}...` : 'NOT SET',
  secretAccessKey: awsConfig.credentials.secretAccessKey ? 
    `${awsConfig.credentials.secretAccessKey.substring(0, 10)}...` : 'NOT SET',
  bucketName: ENV_VARS.AWS_S3_BUCKET_NAME
});

// Create client instances
const s3Client = new S3Client(awsConfig);
const snsClient = new SNSClient(awsConfig);
const sesClient = new SESClient(awsConfig);

// Test AWS connection
const testAWSConnection = async () => {
  try {
    await s3Client.send(new ListBucketsCommand({}));
    logger.info("AWS S3 connection successful");

    await snsClient.send(new ListTopicsCommand({}));
    logger.info("AWS SNS connection successful");

    await sesClient.send(new GetSendQuotaCommand({}));
    logger.info("AWS SES connection successful");

    return true;
  } catch (error) {
    logger.error("AWS connection error:", error);
    
    // Provide specific error messages for common issues
    if (error.name === 'UnrecognizedClientException') {
      logger.error("Invalid AWS Access Key ID");
    } else if (error.name === 'SignatureDoesNotMatch') {
      logger.error("Invalid AWS Secret Access Key");
    } else if (error.name === 'InvalidUserID.NotFound') {
      logger.error("AWS Access Key ID does not exist");
    } else if (error.name === 'UnknownEndpoint') {
      logger.error("Invalid AWS region specified");
    }
    
    return false;
  }
};

// Helper function for S3 signed URL (replacement for v2's getSignedUrl)
const getPresignedUrl = async (operation, params, expiresIn = 3600) => {
  // Only getObject is supported by getSignedUrl in the s3-request-presigner package
  if (operation === "getObject") {
    const command = new GetObjectCommand(params);
    return await getSignedUrl(s3Client, command, { expiresIn });
  } else if (operation === "putObject") {
    const command = new PutObjectCommand(params);
    return await getSignedUrl(s3Client, command, { expiresIn });
  } else {
    throw new Error(`Operation ${operation} not supported by getPresignedUrl`);
  }
};

// Helper function for S3 presigned post (replacement for v2's createPresignedPost)
const getPresignedPost = async (params) => {
  return await createPresignedPost(s3Client, params);
};

// Helper function to delete an S3 object
const deleteS3Object = async (params) => {
  return await s3Client.send(new DeleteObjectCommand(params));
};

export {
  s3Client,
  snsClient,
  sesClient,
  testAWSConnection,
  getPresignedUrl,
  getPresignedPost,
  deleteS3Object,
};
