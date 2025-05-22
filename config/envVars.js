import dotenv from "dotenv";
dotenv.config();

export const ENV_VARS = {
  MONGODB_URI: process.env.MONGO_URI,
  JWT_SECRET_KEY: process.env.JWT_SECRET_KEY,
  PORT: process.env.PORT || 8080,
  HTTPS_PORT: process.env.HTTPS_PORT || 443,
  NODE_ENV: process.env.NODE_ENV || "development",
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : [],
  AWS_ACCESS_KEY: process.env.IM_AWS_ACCESS_KEY,
  AWS_SECRET_KEY: process.env.IM_AWS_SECRET_KEY,
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || "medh-files",
  AWS_REGION: process.env.AWS_REGION || "us-east-1",
  
  // TLS Configuration
  TLS_CERT_PATH: process.env.TLS_CERT_PATH,
  USE_HTTPS: process.env.USE_HTTPS || false,

  // Sentry Configuration
  SENTRY_DSN: process.env.SENTRY_DSN,
  SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  SENTRY_TRACES_SAMPLE_RATE: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.1"),

  // Redis Configuration
  REDIS_ENABLED: process.env.REDIS_ENABLED === 'true',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  
  // Upload Constants (Update these values as needed)
  UPLOAD_CONSTANTS: {
    ALLOWED_MIME_TYPES: {
      "image/jpeg": "jpg",
      "image/png": "png",
      "application/pdf": "pdf",
    },
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
    BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || "medh-files", // Using environment variable or fallback
    MAX_FILES: 5, // Placeholder for maximum number of files in multi-upload
  },
};
