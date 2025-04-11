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

// Common AWS configuration
const awsConfig = {
  credentials: {
    accessKeyId: ENV_VARS.AWS_ACCESS_KEY,
    secretAccessKey: ENV_VARS.AWS_SECRET_KEY,
  },
  region: ENV_VARS.AWS_REGION || "us-east-1", // Set a default region if not specified
};

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
