import dotenv from 'dotenv';
dotenv.config();

export const ENV_VARS = {
  MONGODB_URI: process.env.MONGO_URI,
  JWT_SECRET_KEY: process.env.JWT_SECRET_KEY,
  PORT: process.env.PORT || 8080,
  NODE_ENV: process.env.NODE_ENV || 'development',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [],
  AWS_ACCESS_KEY: process.env.IM_AWS_ACCESS_KEY,
  AWS_SECRET_KEY: process.env.IM_AWS_SECRET_KEY,

  // Upload Constants (Update these values as needed)
  UPLOAD_CONSTANTS: {
    ALLOWED_MIME_TYPES: {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'application/pdf': 'pdf'
    },
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
    BUCKET_NAME: 'your-s3-bucket-name', // TODO: Replace with your actual bucket name
    MAX_FILES: 5 // Placeholder for maximum number of files in multi-upload
  }
};
