import AWS from 'aws-sdk';
import { ENV_VARS } from './envVars.js';
import logger from '../utils/logger.js';

// Configure AWS
AWS.config.update({
  accessKeyId: ENV_VARS.AWS_ACCESS_KEY,
  secretAccessKey: ENV_VARS.AWS_SECRET_KEY,
  // region: ENV_VARS.AWS_REGION // Removed region as it's not defined in ENV_VARS
});

// Create S3 instance
const s3 = new AWS.S3();

// Create SNS instance
const sns = new AWS.SNS();

// Create SES instance
const ses = new AWS.SES();

// Test AWS connection
const testAWSConnection = async () => {
  try {
    await s3.listBuckets().promise();
    logger.info('AWS S3 connection successful');
    
    await sns.listTopics().promise();
    logger.info('AWS SNS connection successful');
    
    await ses.getSendQuota().promise();
    logger.info('AWS SES connection successful');
    
    return true;
  } catch (error) {
    logger.error('AWS connection error:', error);
    return false;
  }
};

export { s3, sns, ses, testAWSConnection };
