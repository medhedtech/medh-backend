const { S3Client } = require('@aws-sdk/client-s3');
require('dotenv').config();

// Create and export an S3 client instance
const s3Client = new S3Client({
  region: 'ap-south-1',
  credentials: {
    accessKeyId: process.env.IM_AWS_ACCESS_KEY,
    secretAccessKey: process.env.IM_AWS_SECRET_KEY,
  }
});

module.exports = s3Client;
