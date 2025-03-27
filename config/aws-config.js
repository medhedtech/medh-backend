const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.IM_AWS_ACCESS_KEY,
  secretAccessKey: process.env.IM_AWS_SECRET_KEY,
  region: 'ap-south-1'
});

const s3Client = new AWS.S3();

// Constants for file uploads
const UPLOAD_CONSTANTS = {
  BUCKET_NAME: 'medhdocuments',
  MAX_FILE_SIZE: 10000 * 1024 * 1024, // 10GB
  MAX_FILES: 10,
  ALLOWED_MIME_TYPES: {
    // Images
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    
    // Documents
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    
    // Videos
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    
    // Audio
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    
    // Other
    'application/zip': 'zip',
    'text/plain': 'txt'
  }
};

module.exports = {
  s3Client,
  UPLOAD_CONSTANTS
};
